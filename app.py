# ================== IMPORTS ==================
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pathlib import Path
import joblib
import numpy as np
import requests
from datetime import datetime, timedelta
import logging

# ---- Open-Meteo imports (NEW) ----
import openmeteo_requests
import requests_cache
from retry_requests import retry
import pandas as pd


# ================== LOGGING ==================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ================== APP INIT ==================
app = FastAPI(title="Crop Recommendation System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ================== PATH SETUP ==================
BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = BASE_DIR / "Backend" / "ml" / "models" / "crop_recommendation_model.pkl"
SOIL_ENCODER_PATH = BASE_DIR / "Backend" / "ml" / "models" / "soil_encoder.pkl"
SEASON_ENCODER_PATH = BASE_DIR / "Backend" / "ml" / "models" / "season_encoder.pkl"
CROP_ENCODER_PATH = BASE_DIR / "Backend" / "ml" / "models" / "crop_encoder.pkl"


# ================== LOAD MODEL & ENCODERS ==================
model = joblib.load(MODEL_PATH)
soil_encoder = joblib.load(SOIL_ENCODER_PATH)
season_encoder = joblib.load(SEASON_ENCODER_PATH)
crop_encoder = joblib.load(CROP_ENCODER_PATH)

logger.info("✅ ML model & encoders loaded successfully")


# ================== STATIC FILES ==================
app.mount("/static", StaticFiles(directory="static"), name="static")


# ================== ROOT ==================
@app.get("/")
async def read_root():
    return FileResponse("static/index.html")


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Crop Recommendation System",
        "version": "1.0.0"
    }


# ================== ECONOMICS ==================
CROP_ECONOMICS = {
    "Rice": {"cost": 45000, "returns": 90000},
    "Wheat": {"cost": 35000, "returns": 80000},
    "Maize": {"cost": 30000, "returns": 70000},
    "Cotton": {"cost": 50000, "returns": 120000},
    "Sugarcane": {"cost": 60000, "returns": 140000},
    "Banana": {"cost": 55000, "returns": 130000},
}

DEFAULT_COST = 35000
DEFAULT_RETURNS = 75000


# ================== REQUEST SCHEMA ==================
class CropRequest(BaseModel):
    state: str
    district: str
    village: str
    soil_type: str
    season: str
    nitrogen: float
    phosphorus: float
    potassium: float
    ph: float


# ================== HELPERS ==================
def normalize_label(value: str) -> str:
    return value.replace("_", " ").title()


def get_lat_lon(state: str, district: str, village: str):
    query = f"{village}, {district}, {state}, India"
    url = "https://nominatim.openstreetmap.org/search"

    params = {"q": query, "format": "json", "limit": 1}
    headers = {"User-Agent": "Crop-Recommendation-System"}

    res = requests.get(url, params=params, headers=headers, timeout=10)
    data = res.json()

    if not data:
        raise HTTPException(status_code=404, detail="Location not found")

    lat, lon = float(data[0]["lat"]), float(data[0]["lon"])
    logger.info(f"📍 Coordinates: {lat}, {lon}")
    return lat, lon


# ================== OPEN-METEO SETUP ==================
cache_session = requests_cache.CachedSession(
    ".cache", expire_after=3600
)
retry_session = retry(
    cache_session, retries=5, backoff_factor=0.2
)
openmeteo = openmeteo_requests.Client(session=retry_session)


# ================== WEATHER (OPEN-METEO) ==================
def get_weather(lat: float, lon: float, season: str):
    url = "https://api.open-meteo.com/v1/forecast"

    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": [
            "temperature_2m",
            "rain",
            "relative_humidity_2m"
        ],
        "past_days": 31,
        "forecast_days": 16
    }

    responses = openmeteo.weather_api(url, params=params)
    response = responses[0]

    hourly = response.Hourly()
    temperature = hourly.Variables(0).ValuesAsNumpy()
    rain = hourly.Variables(1).ValuesAsNumpy()
    humidity = hourly.Variables(2).ValuesAsNumpy()

    avg_temp = round(float(temperature.mean()), 2)
    avg_humidity = round(float(humidity.mean()), 2)
    total_rainfall = round(float(rain.sum()), 2)

    seasonal_min = {"Kharif": 80, "Rabi": 20, "Zayad": 30}
    final_rainfall = max(total_rainfall, seasonal_min.get(season, 25))

    logger.info(
        f"🌤 Weather → Temp: {avg_temp}°C | "
        f"Humidity: {avg_humidity}% | "
        f"Rainfall: {final_rainfall}mm"
    )

    return avg_temp, avg_humidity, final_rainfall


# ================== API ==================
@app.post("/api/recommend")
def recommend_crop(data: CropRequest):
    try:
        soil_clean = normalize_label(data.soil_type)
        season_clean = normalize_label(data.season)

        soil_encoded = soil_encoder.transform([soil_clean])[0]
        season_encoded = season_encoder.transform([season_clean])[0]

        lat, lon = get_lat_lon(data.state, data.district, data.village)
        temperature, humidity, rainfall = get_weather(lat, lon, season_clean)

        features = np.array([[
            data.nitrogen,
            data.phosphorus,
            data.potassium,
            data.ph,
            temperature,
            humidity,
            rainfall,
            soil_encoded,
            season_encoded
        ]])

        probs = model.predict_proba(features)[0]
        top3_idx = probs.argsort()[-3:][::-1]

        recommendations = []
        for idx in top3_idx:
            crop = crop_encoder.inverse_transform([idx])[0]
            accuracy = round(probs[idx] * 100, 2)

            eco = CROP_ECONOMICS.get(
                crop,
                {"cost": DEFAULT_COST, "returns": DEFAULT_RETURNS}
            )

            recommendations.append({
                "crop": crop,
                "accuracy": accuracy,
                "expected_cost": eco["cost"],
                "expected_returns": eco["returns"]
            })

        return {
            "state": data.state,
            "district": data.district,
            "village": data.village,
            "temperature": temperature,
            "humidity": humidity,
            "rainfall": rainfall,
            "recommendations": recommendations
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred"
        )
