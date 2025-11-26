# ml_module/tests/test_threshold_model.py

import pandas as pd
from ml_module.anomaly_models import ThresholdRollingModel

def test_threshold_model_flags_moisture_drop():
    model = ThresholdRollingModel()

    # Simule 20 lectures "normales"
    data = {
        "moisture": [60] * 19 + [35],  # dernière très basse
        "temperature": [25] * 20,
        "humidity": [55] * 20,
    }
    idx = pd.date_range("2025-11-26", periods=20, freq="10min")
    df = pd.DataFrame(data, index=idx)

    result = model.predict(df)

    assert result.is_anomaly is True
    assert "moisture" in result.reason
    assert 0.0 <= result.score <= 1.0
