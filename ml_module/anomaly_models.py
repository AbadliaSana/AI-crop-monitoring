# ml_module/anomaly_models.py
from dataclasses import dataclass
import numpy as np
import pathlib
from joblib import load

DEFAULT_THRESHOLDS = {
    # Tighter bands to surface more anomalies
    "moisture": (42, 72),
    "temperature": (9, 29),
    "humidity": (38, 78),
}


@dataclass
class AnomalyResult:
    is_anomaly: bool
    score: float          # 0–1
    reason: str
    details: dict


class ThresholdRollingModel:
    """
    Simple but effective: hard thresholds + rolling z-score.
    """
    def __init__(self, thresholds=None, z_threshold: float = 1.8):
        self.thresholds = thresholds or DEFAULT_THRESHOLDS
        self.z_threshold = z_threshold

    def predict(self, df):
        if df.empty:
            return AnomalyResult(False, 0.0, "no_data", {})

        last = df.iloc[-1]
        mean = df.rolling(window=12, min_periods=3).mean().iloc[-1]
        std = df.rolling(window=12, min_periods=3).std().fillna(0.1).iloc[-1]

        reasons = []
        score_components = []

        for sensor, (min_v, max_v) in self.thresholds.items():
            val = last.get(sensor)

            # hard range check
            if val < min_v or val > max_v:
                reasons.append(f"{sensor}_range")
                score_components.append(0.5)

            # rolling z-score
            z = abs((val - mean.get(sensor)) / (std.get(sensor) or 0.1))
            if z > self.z_threshold:
                reasons.append(f"{sensor}_z>{self.z_threshold}")
                score_components.append(min(1.0, (z - self.z_threshold) / 3))

        is_anom = bool(reasons)
        score = float(np.clip(sum(score_components), 0, 1)) if score_components else 0.0

        return AnomalyResult(
            is_anomaly=is_anom,
            score=score,
            reason=";".join(reasons) if reasons else "normal",
            details={"last": last.to_dict(), "mean": mean.to_dict()},
        )


ISO_MODEL_PATH = pathlib.Path(__file__).resolve().parent / "models" / "iso_forest.joblib"


class IsolationForestModel:
    """
    Advanced pretrained Isolation Forest (unsupervised).
    Expects a model trained offline and saved to iso_forest.joblib.
    """
    # Raise threshold (closer to 0) so more points are flagged as anomalies.
    def __init__(self, model_path=ISO_MODEL_PATH, threshold: float = 0.1):
        self.model_path = model_path
        self.threshold = threshold
        self.model = None
        self._load_model()

    def _load_model(self):
        if not self.model_path.exists():
            raise RuntimeError(
                f"IsolationForest model not found at {self.model_path}. "
                "Train it first and save as iso_forest.joblib."
            )
        self.model = load(self.model_path)

    def predict(self, X):
        """
        X: np.ndarray [n_samples, n_features]
        Uses decision_function: higher = more normal.
        We treat low scores (< threshold) as anomalies.
        """
        if X.size == 0:
            return AnomalyResult(False, 0.0, "no_data", {})

        scores = self.model.decision_function(X)
        latest_score = float(scores[-1])

        is_anom = latest_score < self.threshold
        reason = "iso_anomaly" if is_anom else "iso_normal"

        # normalize to 0–1 (rough but OK)
        norm_score = float(np.clip(-latest_score, 0, 1))

        return AnomalyResult(
            is_anomaly=is_anom,
            score=norm_score,
            reason=reason,
            details={"raw_score": latest_score},
        )
