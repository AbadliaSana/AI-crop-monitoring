# ml_module/preprocessing.py

import numpy as np
import pandas as pd
from datetime import timedelta
from django.utils import timezone

# types de capteurs, adapte si besoin
SENSOR_TYPES = ["moisture", "temperature", "humidity"]


def get_recent_readings_df(plot, window_hours: int = 6) -> pd.DataFrame:
    """
    Utilisé côté Django (pipeline en prod).
    Va chercher les dernières lectures pour une parcelle.
    """
    # ⚠️ import paresseux pour éviter de casser les scripts offline
    from sensors.models import SensorReading

    since = timezone.now() - timedelta(hours=window_hours)

    qs = (
        SensorReading.objects
        .filter(plot=plot, timestamp__gte=since)
        .order_by("timestamp")
    )

    if not qs.exists():
        return pd.DataFrame()

    rows = [
        {
            "timestamp": r.timestamp,
            "sensor_type": r.sensor_type,
            "value": r.value,
        }
        for r in qs
    ]

    df = pd.DataFrame(rows)

    # pivot: index = timestamp, colonnes = type de capteur
    df = df.pivot_table(
        index="timestamp",
        columns="sensor_type",
        values="value"
    ).sort_index()

    # s'assurer que toutes les colonnes existent
    for st in SENSOR_TYPES:
        if st not in df.columns:
            df[st] = np.nan

    df = df[SENSOR_TYPES].ffill().bfill()
    return df


def build_feature_matrix(df: pd.DataFrame, window_size: int = 12) -> np.ndarray:
    """
    Utilisable à la fois offline (script de training) et online (pipeline).
    Si la colonne 'timestamp' existe, on la trie dessus.
    Chaque sample = [valeurs normalisées + dérivées premières] pour chaque capteur
    sur une fenêtre glissante.
    """
    if df.empty or len(df) < window_size:
        return np.empty((0, len(SENSOR_TYPES) * 2 * window_size))

    # si 'timestamp' est une colonne, on l'utilise pour trier
    if "timestamp" in df.columns:
        df = df.sort_values("timestamp").set_index("timestamp")

    df = df.copy()
    X = []

    for i in range(window_size, len(df) + 1):
        window = df.iloc[i - window_size:i]

        # normalisation dans la fenêtre
        norm = (window[SENSOR_TYPES] - window[SENSOR_TYPES].mean()) / (
            window[SENSOR_TYPES].std() + 1e-6
        )
        diff = norm.diff().fillna(0)

        feats = np.concatenate([norm.values.flatten(), diff.values.flatten()])
        X.append(feats)

    return np.vstack(X)
