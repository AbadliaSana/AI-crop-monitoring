# scripts/train_iso_forest.py

import pathlib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from joblib import dump

from backend.simulation.generator import (
    simulate_baseline,
    inject_anomalies,
    add_farm_metadata,
)

from ml_module.preprocessing import build_feature_matrix


def generate_normal_dataset(days=7, freq_minutes=15):
    """
    Produce normal only (no anomalies) dataset for training.
    """
    from datetime import datetime, timedelta

    end = datetime.utcnow()
    start = end - timedelta(days=days)

    df = simulate_baseline(start, end, freq_minutes)
    df["label"] = "normal"
    df = add_farm_metadata(df, n_plots=3)
    return df


def main():
    print("Generating normal dataset...")
    df = generate_normal_dataset()

    print("Building feature matrix...")
    X = build_feature_matrix(df)

    print("Training Isolation Forest...")
    model = IsolationForest(
        n_estimators=200,
        contamination=0.05,
        random_state=42,
    )
    model.fit(X)

    # Save the model in the ml_module/models/ folder
    model_dir = pathlib.Path("ml_module/models")
    model_dir.mkdir(parents=True, exist_ok=True)

    model_path = model_dir / "iso_forest.joblib"
    dump(model, model_path)

    print("Model saved to:", model_path)


if __name__ == "__main__":
    main()
