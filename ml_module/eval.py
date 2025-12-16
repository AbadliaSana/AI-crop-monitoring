import json
import math
import random
from dataclasses import dataclass
from typing import List, Dict, Tuple

from ml_module.anomaly_models import DEFAULT_THRESHOLDS


@dataclass
class EvalResult:
    precision: float
    recall: float
    f1: float
    fp_rate: float
    support: int
    anomalies: int
    predicted_anomalies: int

    def to_dict(self) -> Dict:
        return {
            "precision": round(self.precision, 4),
            "recall": round(self.recall, 4),
            "f1": round(self.f1, 4),
            "fp_rate": round(self.fp_rate, 4),
            "support": self.support,
            "anomalies": self.anomalies,
            "predicted_anomalies": self.predicted_anomalies,
        }


def _generate_sample(idx: int, rng: random.Random, anomaly_ratio: float) -> Tuple[Dict, int]:
    """
    Génère une lecture synthétique avec éventuellement une anomalie.
    Baseline pseudo-saisonnière + bruit, puis injection d'un pattern anormal.
    """
    # Baseline lissée (sinusoïdes) + bruit
    temp = 24 + 6 * math.sin(idx / 20) + rng.gauss(0, 0.8)
    humidity = 60 - 10 * math.sin(idx / 22) + rng.gauss(0, 2)
    moisture = 62 + 5 * math.sin(idx / 28) + rng.gauss(0, 1.5)

    label = 0
    if rng.random() < anomaly_ratio:
        label = 1
        anomaly_type = rng.choice(["moisture_drop", "temp_spike", "humidity_drift", "random_spike"])
        if anomaly_type == "moisture_drop":
            moisture -= rng.uniform(12, 22)
        elif anomaly_type == "temp_spike":
            temp += rng.uniform(8, 16)
        elif anomaly_type == "humidity_drift":
            humidity += rng.uniform(12, 20)
        elif anomaly_type == "random_spike":
            choice = rng.choice(["temp", "humidity", "moisture"])
            if choice == "temp":
                temp += rng.uniform(15, 25)
            elif choice == "humidity":
                humidity += rng.uniform(18, 28)
            else:
                moisture += rng.uniform(18, 28)

    return {"temperature": temp, "humidity": humidity, "moisture": moisture}, label


def _predict(sample: Dict, history: List[Dict], z_threshold: float = 2.0) -> bool:
    """
    Règle simple: seuils durs + z-score glissant pour capturer les dérives.
    """
    # Seuils durs
    for sensor, (min_v, max_v) in DEFAULT_THRESHOLDS.items():
        val = sample.get(sensor)
        if val is None:
            continue
        if val < min_v or val > max_v:
            return True

    # Z-score glissant
    if len(history) >= 15:
        for sensor in DEFAULT_THRESHOLDS.keys():
            vals = [h[sensor] for h in history[-20:]]
            mean_v = sum(vals) / len(vals)
            std_v = (sum((v - mean_v) ** 2 for v in vals) / len(vals)) ** 0.5 or 1e-6
            z = abs((sample[sensor] - mean_v) / std_v)
            if z > z_threshold:
                return True

    return False


def evaluate_model(samples: int = 500, anomaly_ratio: float = 0.2, seed: int = 42) -> EvalResult:
    """
    Génère un dataset synthétique labellisé, applique la règle de détection simple,
    puis calcule precision/recall/F1/FP rate.
    """
    rng = random.Random(seed)
    history: List[Dict] = []
    y_true: List[int] = []
    y_pred: List[int] = []

    for idx in range(samples):
        sample, label = _generate_sample(idx, rng, anomaly_ratio)
        pred = _predict(sample, history)
        history.append(sample)
        y_true.append(label)
        y_pred.append(int(pred))

    tp = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 1)
    fp = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 1)
    fn = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 0)
    tn = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 0)

    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    fp_rate = fp / (fp + tn) if (fp + tn) else 0.0

    return EvalResult(
        precision=precision,
        recall=recall,
        f1=f1,
        fp_rate=fp_rate,
        support=len(y_true),
        anomalies=sum(y_true),
        predicted_anomalies=sum(y_pred),
    )


def save_report(path: str, result: EvalResult, params: Dict) -> None:
    payload = {"metrics": result.to_dict(), "params": params}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
