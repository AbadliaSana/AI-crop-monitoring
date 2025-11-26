from dataclasses import dataclass
from django.utils.dateparse import parse_datetime


@dataclass
class RuleResult:
    rule: str
    action: str
    explanation: str
    confidence: float


def _fmt(ts):
    try:
        dt = parse_datetime(ts)
        return dt.strftime("%Y-%m-%d %H:%M") if dt else ts
    except:
        return ts or "unknown time"


def rule_engine(event) -> RuleResult:
    """
    event: AnomalyEvent instance
    Uses structure provided by ML pipeline details.
    """
    d = event.details
    thr = d.get("threshold", {})
    iso = d.get("isolation_forest", {})

    last = (thr.get("details") or {}).get("last", {})
    mean = (thr.get("details") or {}).get("mean", {})

    score_thr = float(thr.get("score", 0))
    score_iso = float(iso.get("score", 0))

    combined_score = float(d.get("combined_score", 0))
    ts = _fmt(str(event.timestamp))

    # ------------------------
    # RULE 1 — Moisture drop
    # ------------------------
    if last.get("moisture") is not None and mean.get("moisture") is not None:
        diff = mean["moisture"] - last["moisture"]
        if diff > 10:
            return RuleResult(
                rule="moisture_drop",
                action=(
                    "Inspect irrigation system: possible leak or pump failure. "
                    "Check valves, pipes and confirm irrigation schedule."
                ),
                explanation=(
                    f"On {ts}, soil moisture dropped from {mean['moisture']:.1f}% "
                    f"to {last['moisture']:.1f}%. This is a >10% drop, indicating "
                    "a likely irrigation failure."
                ),
                confidence=max(combined_score, score_thr, 0.85),
            )

    # ------------------------
    # RULE 2 — Heat stress
    # ------------------------
    if last.get("temperature", 0) > 32:
        return RuleResult(
            rule="heat_stress",
            action=(
                "Increase irrigation and consider shade cloth or mulching "
                "during high-temperature hours."
            ),
            explanation=(
                f"On {ts}, temperature reached {last['temperature']:.1f}°C, "
                "above the normal daytime range (18–28°C). Heat stress likely."
            ),
            confidence=max(combined_score, 0.8),
        )

    # ------------------------
    # RULE 3 — Humidity drift
    # ------------------------
    if last.get("humidity") is not None:
        if last["humidity"] < 30 or last["humidity"] > 85:
            return RuleResult(
                rule="humidity_extreme",
                action="Check ventilation/irrigation and inspect for fungal issues.",
                explanation=(
                    f"On {ts}, humidity was {last['humidity']:.1f}%, far outside "
                    "the normal 45–75% range. Environmental stress likely."
                ),
                confidence=max(combined_score, 0.7),
            )

    # ------------------------
    # RULE 4 — multi-factor anomalies
    # ------------------------
    combined_reason = d.get("combined_reason", "")
    if "multi" in combined_reason or event.anomaly_type == "multi_factor":
        return RuleResult(
            rule="multi_factor",
            action=(
                "Multiple stress indicators detected. Perform a full field inspection: "
                "irrigation, pest/disease, sensor calibration."
            ),
            explanation=(
                f"On {ts}, multiple sensors produced correlated anomalies "
                f"(reason: {combined_reason})."
            ),
            confidence=max(combined_score, 0.9),
        )

    # ------------------------
    # RULE 5 — Moderate confidence → monitor
    # ------------------------
    if 0.4 <= combined_score <= 0.6:
        return RuleResult(
            rule="monitoring",
            action="Continue monitoring this plot. Perform a light visual inspection.",
            explanation=(
                f"On {ts}, anomaly detected with moderate confidence ({combined_score:.2f}). "
                "Recommended conservative follow-up."
            ),
            confidence=combined_score,
        )

    # Default fallback
    return RuleResult(
        rule="general",
        action="Review sensor readings and inspect plot if necessary.",
        explanation=f"On {ts}, anomaly detected with confidence {combined_score:.2f}.",
        confidence=combined_score,
    )
