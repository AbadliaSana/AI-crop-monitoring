# scripts/make_dataset.py
from backend.simulation.generator import generate_dataset

if __name__ == "__main__":
    df = generate_dataset(to_csv_path="data/sensor_dataset.csv")
    print(df.head())
