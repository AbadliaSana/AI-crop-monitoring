from dataclasses import dataclass
from typing import Dict, Any, List
from django.utils import timezone

from anomalies.models import AnomalyEvent


@dataclass
class RecommendationOutput:
    action: str
    explanation: str
    confidence: float
    status: str = "pending"


def _confidence_label(score: float) -> str:
    if score >= 0.75:
        return "high"
    if score >= 0.45:
        return "medium"
    return "low"


def _load_details(event: AnomalyEvent) -> Dict[str, Any]:
    return event.details or {}


def build_recommendation(event: AnomalyEvent) -> RecommendationOutput:
    """
    Simple rule engine over the anomaly details produced by the ML pipeline.
    Deterministic, template-based explainability.
    """
    data = _load_details(event)
    thr = data.get("threshold", {}) or {}
    iso = data.get("isolation_forest", {}) or {}
    combined_score = float(data.get("combined_score") or event.model_confidence or 0.0)

    thr_details = thr.get("details", {}) or {}
    last = thr_details.get("last", {}) or {}
    mean = thr_details.get("mean", {}) or {}
    reasons = (thr.get("reason") or "") + "|" + (data.get("combined_reason") or "")

    actions: List[str] = []
    explanations: List[str] = []
    confidence = combined_score

    # Rule 1: moisture drop >10%
    moisture = last.get("moisture")
    moisture_mean = mean.get("moisture")
    if moisture is not None and moisture_mean:
        drop_pct = (moisture_mean - moisture) / moisture_mean
        if drop_pct > 0.10:
            actions.append("irrigation check — possible leak or pump failure")
            explanations.append(f"Soil moisture dropped {drop_pct*100:.1f}% vs recent mean.")
            confidence = max(confidence, combined_score + 0.15)

    # Rule 2: temp spike sustained
    temp = last.get("temperature")
    temp_mean = mean.get("temperature")
    if temp is not None and temp_mean is not None and (temp - temp_mean) > 5:
        actions.append("heat stress mitigation — increase shade or irrigation frequency")
        explanations.append(f"Temperature is {temp - temp_mean:.1f}°C above recent mean.")
        confidence = max(confidence, combined_score + 0.1)

    # Rule 3: multiple signals
    multi_signals = bool(thr.get("is_anomaly")) and bool(iso.get("is_anomaly"))
    if multi_signals or reasons.count(";") >= 1:
        actions.append("comprehensive plot inspection — multiple stress factors detected")
        explanations.append("Threshold and isolation forest both signaled anomalies.")
        confidence = max(confidence, combined_score + 0.1)

    # Rule 4: low/medium confidence -> monitor
    if 0.4 <= combined_score <= 0.6:
        actions.append("monitor closely — verify with manual inspection")
        explanations.append("Model confidence is moderate; manual verification advised.")

    # Fallback
    if not actions:
        actions.append("monitor closely — no specific remediation suggested")
        explanations.append("No strong rule triggered; continue observation.")

    # Pick the first action as the primary recommendation
    action = actions[0]

    # Explanation template
    ts = event.timestamp if event.timestamp else timezone.now()
    expl = (
        f"On {ts:%Y-%m-%d %H:%M}, anomaly '{event.anomaly_type}' was detected "
        f"(model confidence {combined_score:.2f}, overall { _confidence_label(confidence) }). "
        f"{' '.join(explanations)} "
        f"Recommendation: {action}"
    )

    return RecommendationOutput(
        action=action,
        explanation=expl,
        confidence=min(1.0, max(0.0, confidence)),
        status="pending",
    )
