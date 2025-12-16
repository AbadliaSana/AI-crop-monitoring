import os
import time
import math
import random
import requests
from requests.exceptions import RequestException, ConnectionError as ReqConnectionError
import numpy as np
from datetime import datetime, timezone
from dotenv import load_dotenv
from faker import Faker

# Load environment variables
load_dotenv()

# --- API config ---
API_URL = os.getenv("API_URL", "http://127.0.0.1:8000/api/sensor-readings/")
API_TOKEN_URL = os.getenv("API_TOKEN_URL", "http://127.0.0.1:8000/api/token/")
API_REFRESH_URL = os.getenv("API_REFRESH_URL", "http://127.0.0.1:8000/api/token/refresh/")
API_USERNAME = os.getenv("API_USERNAME")
API_PASSWORD = os.getenv("API_PASSWORD")
# Optional: static JWT access token for test/debug (bypass username/password flow).
API_STATIC_ACCESS_TOKEN = os.getenv("API_STATIC_ACCESS_TOKEN") or os.getenv("API_ACCESS_TOKEN")
# Tunable anomaly probability (0.0-1.0). Defaults to 0.5 for aggressive testing.
try:
    ANOMALY_PROB = max(0.0, min(1.0, float(os.getenv("ANOMALY_PROB", "0.5"))))
except ValueError:
    ANOMALY_PROB = 0.5

SEND_INTERVAL = int(os.getenv("SEND_INTERVAL", 10))
PLOT_IDS = [int(x.strip()) for x in os.getenv("PLOT_IDS", "1").split(",")]

fake = Faker()

# Headers (no auth at start)
HEADERS = {"Content-Type": "application/json"}
# If a static token is provided, use it directly.
if API_STATIC_ACCESS_TOKEN:
    HEADERS["Authorization"] = f"Bearer {API_STATIC_ACCESS_TOKEN}"
    print("[auth] Using static access token from environment")
REFRESH_TOKEN = None


def _set_access(access: str):
    global HEADERS
    HEADERS["Authorization"] = f"Bearer {access}"


# --------------------------
# AUTH: obtain/refresh JWT access token
# --------------------------
def obtain_access_token(max_retries: int = 10, delay: int = 3) -> bool:
    """Login with username/password and set Authorization header."""
    global REFRESH_TOKEN

    if API_STATIC_ACCESS_TOKEN:
        # Already set during module import; nothing else to do.
        return True

    if not API_USERNAME or not API_PASSWORD:
        print("[auth] API_USERNAME / API_PASSWORD missing in .env")
        return False

    attempt = 0
    while attempt < max_retries:
        attempt += 1
        try:
            resp = requests.post(
                API_TOKEN_URL,
                json={"username": API_USERNAME, "password": API_PASSWORD},
                headers={"Content-Type": "application/json"},
                timeout=10,
            )
        except ReqConnectionError as exc:
            print(f"[auth] Conn refused (try {attempt}/{max_retries}) -> {exc}")
            time.sleep(delay)
            continue
        except RequestException as exc:
            print(f"[auth] Error contacting auth endpoint: {exc}")
            time.sleep(delay)
            continue

        if resp.status_code != 200:
            print(f"[auth] Failed to obtain token (try {attempt}/{max_retries}): {resp.status_code} {resp.text}")
            time.sleep(delay)
            continue

        break
    else:
        return False

    data = resp.json()
    access = data.get("access")
    refresh = data.get("refresh")
    if not access:
        print(f"[auth] 'access' field not found in token response: {data}")
        return False

    REFRESH_TOKEN = refresh
    _set_access(access)
    print("[auth] Obtained new access token")
    return True


def refresh_access_token() -> bool:
    """Use refresh token if available."""
    global REFRESH_TOKEN

    if API_STATIC_ACCESS_TOKEN:
        # Static token should not be refreshed here.
        return True

    if not REFRESH_TOKEN:
        return False

    try:
        resp = requests.post(
            API_REFRESH_URL,
            json={"refresh": REFRESH_TOKEN},
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
    except RequestException as exc:
        print(f"[auth] Refresh token call failed: {exc}")
        return False
    if resp.status_code != 200:
        print(f"[auth] Failed to refresh token: {resp.status_code} {resp.text}")
        REFRESH_TOKEN = None
        return False

    data = resp.json()
    access = data.get("access")
    if not access:
        print(f"[auth] 'access' missing in refresh response: {data}")
        return False

    _set_access(access)
    print("[auth] Refreshed access token")
    return True


# --------------------------
# BASELINE GENERATORS
# --------------------------
def generate_baseline(timestamp: datetime):
    hour = timestamp.hour + timestamp.minute / 60.0

    temp = 23 + 5 * math.sin(2 * math.pi * (hour - 12) / 24) + random.gauss(0, 0.6)
    humidity = 60 - 10 * math.sin(2 * math.pi * (hour - 12) / 24) + random.gauss(0, 2)
    moisture = 60 + 5 * math.sin(2 * math.pi * (hour) / 48) + random.gauss(0, 1.5)

    return temp, humidity, moisture


# --------------------------
# ANOMALY INJECTIONS
# --------------------------
def inject_anomalies(temp, humidity, moisture):
    anomaly_type = None
    chance = random.random()

    # Increase anomaly chance for testing; controlled by ANOMALY_PROB env.
    if chance < ANOMALY_PROB:
        anomaly_type = random.choice(
            ["moisture_drop", "temp_spike", "humidity_drift", "random_spike"]
        )

        if anomaly_type == "moisture_drop":
            moisture -= random.uniform(15, 25)

        elif anomaly_type == "temp_spike":
            temp += random.uniform(6, 10)

        elif anomaly_type == "humidity_drift":
            humidity += random.uniform(10, 20)

        elif anomaly_type == "random_spike":
            col = random.choice(["temp", "humidity", "moisture"])
            if col == "temp":
                temp += random.uniform(20, 30)
            elif col == "humidity":
                humidity += random.uniform(20, 30)
            else:
                moisture += random.uniform(20, 30)

    return temp, humidity, moisture, anomaly_type


# --------------------------
# POST TO DJANGO API
# --------------------------
def send_reading(plot_id, sensor_type, value, timestamp):
    payload = {
        "plot": plot_id,
        "sensor_type": sensor_type,
        "value": value,
        "timestamp": timestamp,
        "source": "simulator",
    }

    try:
        resp = requests.post(API_URL, json=payload, headers=HEADERS, timeout=10)
    except RequestException as exc:
        print(f"[send] ERROR contacting API: {exc}")
        return 0

    # If expired token, try refresh once then full login once
    if resp.status_code == 401:
        if refresh_access_token():
            resp = requests.post(API_URL, json=payload, headers=HEADERS, timeout=10)
        elif obtain_access_token():
            resp = requests.post(API_URL, json=payload, headers=HEADERS, timeout=10)

    if resp.status_code not in (200, 201):
        print(f"[send] ERROR {resp.status_code} {resp.text}")

    return resp.status_code


# --------------------------
# MAIN LOOP
# --------------------------
def run_stream():
    print("Starting advanced sensor streamer...")

    if not obtain_access_token():
        print("[auth] Cannot start streamer without a valid token")
        return

    print(f"Sending data every {SEND_INTERVAL} seconds")
    print(f"Plots: {PLOT_IDS}")
    print("Press CTRL+C to stop\n")

    while True:
        now = datetime.now(timezone.utc)
        timestamp = now.isoformat().replace("+00:00", "Z")

        for plot_id in PLOT_IDS:
            temp, humidity, moisture = generate_baseline(now)
            temp, humidity, moisture, anomaly = inject_anomalies(temp, humidity, moisture)

            s1 = send_reading(plot_id, "temperature", temp, timestamp)
            s2 = send_reading(plot_id, "humidity", humidity, timestamp)
            s3 = send_reading(plot_id, "moisture", moisture, timestamp)

            print(
                f"[PLOT {plot_id}] SENT -> "
                f"T={temp:.1f} H={humidity:.1f} M={moisture:.1f} "
                f"| anomaly={anomaly} | status={(s1, s2, s3)}"
            )

        time.sleep(SEND_INTERVAL)


if __name__ == "__main__":
    run_stream()
