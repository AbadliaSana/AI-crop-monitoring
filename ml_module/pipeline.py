# ml_module/pipeline.py
from dataclasses import asdict
from django.db import transaction

from anomalies.models import AnomalyEvent
from ml_module.preprocessing import (
    get_recent_readings_df,
    build_feature_matrix
)
from ml_module.anomaly_models import (
    ThresholdRollingModel,
    IsolationForestModel,
)

# NEW → import AI Agent
from agent.services import create_recommendation_for_event

# Instantiate anomaly models once
threshold_model = ThresholdRollingModel()
iso_model = IsolationForestModel()

# Anomaly type label consistent with your DB choices
ANOMALY_EVENT_TYPE = "multi_factor"


def run_anomaly_detection_for_plot(plot, window_hours: int = 6):
    """
    Complete anomaly pipeline:
    1. Fetch recent sensor readings
    2. Build ML-friendly feature matrix
    3. Run Threshold Rolling Model
    4. Run Isolation Forest
    5. Combine → score / reason / severity
    6. Create AnomalyEvent (if anomaly)
    7. Create AgentRecommendation (NEW)
    """

    # 1. FETCH RECENT DATA
    df = get_recent_readings_df(plot, window_hours=window_hours)
    X = build_feature_matrix(df)

    # 2. RUN MODELS
    thr_res = threshold_model.predict(df)
    iso_res = iso_model.predict(X)

    # 3. COMBINE
    is_anomaly = thr_res.is_anomaly or iso_res.is_anomaly
    combined_score = max(thr_res.score, iso_res.score)
    combined_reason = f"{thr_res.reason}|{iso_res.reason}"

    # DEVELOPER DEBUG INFO
    debug_info = {
        "threshold": asdict(thr_res),
        "isolation_forest": asdict(iso_res),
        "combined_score": combined_score,
        "combined_reason": combined_reason,
    }

    # 4. NO ANOMALY → return debug only
    if not is_anomaly:
        return None, debug_info

    # 5. SEVERITY
    if combined_score > 0.7:
        severity = "high"
    elif combined_score > 0.4:
        severity = "medium"
    else:
        severity = "low"

    # 6. CREATE DB EVENT
    with transaction.atomic():
        event = AnomalyEvent.objects.create(
            plot=plot,
            anomaly_type=ANOMALY_EVENT_TYPE,
            severity=severity,
            model_confidence=combined_score,
            details=debug_info,
        )

        # 7. NEW — AI AGENT RECOMMENDATION
        # ====================================
        # This calls your rule engine, template generator and saves the result.
        # ====================================
        create_recommendation_for_event(event)

    # 8. RETURN EVENT + DEBUG
    return event, debug_info
