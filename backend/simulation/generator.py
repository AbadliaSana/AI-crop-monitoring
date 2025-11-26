# generator.py
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

def simulate_baseline(start, end, freq_minutes=15):
    timestamps = []
    temp = []
    hum = []
    moist = []

    t = start
    step = timedelta(minutes=freq_minutes)

    while t <= end:
        hour = t.hour + t.minute/60

        base_temp = 23 + 5 * np.sin(2*np.pi*(hour-12)/24)
        base_hum  = 60 - 10 * np.sin(2*np.pi*(hour-12)/24)
        base_moist = 60 + 5 * np.sin(2*np.pi*(hour)/48)

        timestamps.append(t)
        temp.append(base_temp + np.random.normal(0, 0.8))
        hum.append(base_hum + np.random.normal(0, 3))
        moist.append(base_moist + np.random.normal(0, 2))

        t += step

    df = pd.DataFrame({
        "timestamp": timestamps,
        "temperature": temp,
        "humidity": hum,
        "moisture": moist,
    })

    return df
# generator.py (continued)

ANOMALY_TYPES = [
    "moisture_drop",
    "temp_spike",
    "humidity_drift",
    "random_spike",
]

def inject_anomalies(df, n_events=10, duration_points=8):
    """
    Add anomalies and create a label column: 'normal' or anomaly type.
    """
    df = df.copy()
    df["label"] = "normal"

    for _ in range(n_events):
        idx = np.random.randint(0, len(df) - duration_points - 1)
        a_type = np.random.choice(ANOMALY_TYPES)

        if a_type == "moisture_drop":
            df.loc[idx:idx+duration_points, "moisture"] -= np.random.uniform(15, 25)
        elif a_type == "temp_spike":
            df.loc[idx:idx+duration_points, "temperature"] += np.random.uniform(6, 10)
        elif a_type == "humidity_drift":
            drift = np.linspace(0, np.random.uniform(15, 25), duration_points+1)
            df.loc[idx:idx+duration_points, "humidity"] += drift
        elif a_type == "random_spike":
            col = np.random.choice(["temperature", "humidity", "moisture"])
            df.loc[idx, col] += np.random.uniform(20, 30)

        df.loc[idx:idx+duration_points, "label"] = a_type

    return df
# generator.py (continued)
from faker import Faker
fake = Faker()

def add_farm_metadata(df, n_plots=3):
    plot_ids = np.random.choice(range(1, n_plots+1), size=len(df))
    plot_names = {i: fake.city() for i in range(1, n_plots+1)}

    df = df.copy()
    df["plot_id"] = plot_ids
    df["plot_name"] = df["plot_id"].map(plot_names)
    return df
# generator.py (continued)
def generate_dataset(
    days=7,
    freq_minutes=15,
    n_anomalies=20,
    n_plots=3,
    to_csv_path=None,
):
    end = datetime.now()
    start = end - timedelta(days=days)

    df = simulate_baseline(start, end, freq_minutes)
    df = inject_anomalies(df, n_events=n_anomalies)
    df = add_farm_metadata(df, n_plots=n_plots)

    if to_csv_path:
        df.to_csv(to_csv_path, index=False)

    return df
