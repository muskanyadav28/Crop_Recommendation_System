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
import os

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

# Try multiple possible model paths
def find_model_file(filename):
    """Search for model files in multiple possible locations"""
    possible_paths = [
        BASE_DIR / "Backend" / "ml" / "models" / filename,
        BASE_DIR / "ml" / "models" / filename,
        BASE_DIR / "models" / filename,
        BASE_DIR / filename
    ]
    
    for path in possible_paths:
        if path.exists():
            logger.info(f"Found {filename} at: {path}")
            return path
    
    # If not found, log all attempted paths
    logger.error(f"Could not find {filename}. Tried:")
    for path in possible_paths:
        logger.error(f"  - {path}")
    raise FileNotFoundError(f"Model file {filename} not found")

# ================== LOAD MODEL & ENCODERS ==================
try:
    MODEL_PATH = find_model_file("crop_recommendation_model.pkl")
    SOIL_ENCODER_PATH = find_model_file("soil_encoder.pkl")
    SEASON_ENCODER_PATH = find_model_file("season_encoder.pkl")
    CROP_ENCODER_PATH = find_model_file("crop_encoder.pkl")
    
    model = joblib.load(MODEL_PATH)
    soil_encoder = joblib.load(SOIL_ENCODER_PATH)
    season_encoder = joblib.load(SEASON_ENCODER_PATH)
    crop_encoder = joblib.load(CROP_ENCODER_PATH)
    logger.info("ML model & encoders loaded successfully")
except Exception as e:
    logger.error(f"Error loading models: {e}")
    raise

# ================== STATIC FILES ==================
# Try multiple possible static paths
static_paths = [
    BASE_DIR / "static",
    BASE_DIR / "public",
    BASE_DIR / "frontend"
]

static_path = None
for path in static_paths:
    if path.exists():
        static_path = path
        logger.info(f"Found static files at: {path}")
        break

if static_path:
    app.mount("/static", StaticFiles(directory=str(static_path)), name="static")
else:
    logger.warning("No static directory found")

# ================== ROOT ==================
@app.get("/")
async def read_root():
    """Root endpoint - serves index.html or API info"""
    if static_path:
        index_path = static_path / "index.html"
        if index_path.exists():
            return FileResponse(str(index_path))
    return {
        "message": "Crop Recommendation System API",
        "status": "running",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Crop Recommendation System",
        "version": "1.0.0",
        "models_loaded": True
    }

# ================== ECONOMICS (PER ACRE) ==================
CROP_ECONOMICS = {
    "Rice": {"cost": 45000, "returns": 90000},
    "Wheat": {"cost": 35000, "returns": 80000},
    "Maize": {"cost": 30000, "returns": 70000},
    "Cotton": {"cost": 50000, "returns": 120000},
    "Jute": {"cost": 40000, "returns": 85000},
    "Watermelon": {"cost": 25000, "returns": 65000},
    "Muskmelon": {"cost": 28000, "returns": 68000},
    "Apple": {"cost": 80000, "returns": 180000},
    "Banana": {"cost": 55000, "returns": 130000},
    "Mango": {"cost": 65000, "returns": 150000},
    "Grapes": {"cost": 70000, "returns": 160000},
    "Orange": {"cost": 60000, "returns": 140000},
    "Papaya": {"cost": 45000, "returns": 110000},
    "Coconut": {"cost": 75000, "returns": 170000},
    "Pomegranate": {"cost": 70000, "returns": 160000},
    "Coffee": {"cost": 85000, "returns": 190000},
    "Chickpea": {"cost": 28000, "returns": 60000},
    "Lentil": {"cost": 26000, "returns": 58000},
    "Blackgram": {"cost": 24000, "returns": 55000},
    "MungBean": {"cost": 23000, "returns": 52000},
    "MothBeans": {"cost": 22000, "returns": 50000},
    "PigeonPeas": {"cost": 30000, "returns": 70000},
    "KidneyBeans": {"cost": 32000, "returns": 75000},
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
    """Convert snake_case to Title Case"""
    return value.replace("_", " ").title()

def get_lat_lon(state: str, district: str, village: str):
    """Get coordinates using Nominatim API"""
    query = f"{village}, {district}, {state}, India"
    url = "https://nominatim.openstreetmap.org/search"
    
    params = {"q": query, "format": "json", "limit": 1}
    headers = {"User-Agent": "CropRecommendationSystem/1.0"}
    
    try:
        res = requests.get(url, params=params, headers=headers, timeout=10)
        res.raise_for_status()
        data = res.json()
        
        if not data:
            # Fallback: try with just district and state
            query = f"{district}, {state}, India"
            params = {"q": query, "format": "json", "limit": 1}
            res = requests.get(url, params=params, headers=headers, timeout=10)
            data = res.json()
            
            if not data:
                raise HTTPException(status_code=404, detail="Location not found")
        
        lat, lon = float(data[0]["lat"]), float(data[0]["lon"])
        logger.info(f"📍 Coordinates: {lat}, {lon}")
        return lat, lon
    
    except requests.RequestException as e:
        logger.error(f"Error fetching coordinates: {e}")
        raise HTTPException(status_code=503, detail="Location service unavailable")

def get_weather(lat: float, lon: float, season: str):
    """Get weather data using Open-Meteo API"""
    url = "https://api.open-meteo.com/v1/forecast"
    
    # Get past 7 days of data
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=7)
    
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "temperature_2m,relative_humidity_2m,precipitation",
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "timezone": "auto"
    }
    
    try:
        res = requests.get(url, params=params, timeout=15)
        res.raise_for_status()
        data = res.json()
        
        if "hourly" not in data:
            raise ValueError("Invalid weather data received")
        
        temps = data["hourly"]["temperature_2m"]
        humidity = data["hourly"]["relative_humidity_2m"]
        rainfall = data["hourly"]["precipitation"]
        
        # Filter out None values
        temps = [t for t in temps if t is not None]
        humidity = [h for h in humidity if h is not None]
        rainfall = [r for r in rainfall if r is not None]
        
        avg_temp = round(sum(temps) / len(temps), 2) if temps else 25.0
        avg_humidity = round(sum(humidity) / len(humidity), 2) if humidity else 65.0
        observed_rain = round(sum(rainfall), 2) if rainfall else 0.0
        
        # Seasonal minimum rainfall
        seasonal_min = {"Kharif": 80, "Rabi": 20, "Zayad": 30}
        final_rain = max(observed_rain, seasonal_min.get(season, 25))
        
        logger.info(
            f"🌤 Weather → Temp: {avg_temp}°C, "
            f"Humidity: {avg_humidity}%, "
            f"Rainfall: {final_rain}mm"
        )
        
        return avg_temp, avg_humidity, final_rain
    
    except requests.RequestException as e:
        logger.error(f"Error fetching weather data: {e}")
        # Return default values based on season
        defaults = {
            "Kharif": (28.0, 75.0, 120.0),
            "Rabi": (22.0, 55.0, 35.0),
            "Zayad": (32.0, 45.0, 40.0)
        }
        return defaults.get(season, (25.0, 65.0, 80.0))

# ================== API ==================
@app.post("/api/recommend")
def recommend_crop(data: CropRequest):
    try:
        logger.info(f"Received request for {data.village}, {data.district}, {data.state}")
        
        # Normalize inputs
        soil_clean = normalize_label(data.soil_type)
        season_clean = normalize_label(data.season)
        
        logger.info(f"Soil: {soil_clean}, Season: {season_clean}")
        
        # Encode categorical features
        try:
            soil_encoded = soil_encoder.transform([soil_clean])[0]
            season_encoded = season_encoder.transform([season_clean])[0]
        except ValueError as e:
            logger.error(f"Encoding error: {e}")
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid soil type or season. Please check your inputs."
            )
        
        # Get location and weather
        lat, lon = get_lat_lon(data.state, data.district, data.village)
        temperature, humidity, rainfall = get_weather(lat, lon, season_clean)
        
        # Prepare features for model
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
        
        logger.info(f"Features prepared: {features[0]}")
        
        # Get predictions
        probs = model.predict_proba(features)[0]
        top3_idx = probs.argsort()[-3:][::-1]
        
        recommendations = []
        for idx in top3_idx:
            crop = crop_encoder.inverse_transform([idx])[0]
            accuracy = round(probs[idx] * 100, 2)
            
            # Get economic data
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
        
        logger.info(f"Top 3 crops: {[r['crop'] for r in recommendations]}")
        
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
        logger.error(f"Unexpected error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred. Please try again."
        )

# ================== STARTUP EVENT ==================
@app.on_event("startup")
async def startup_event():
    """Log startup information"""
    logger.info("=" * 60)
    logger.info("Crop Recommendation System Starting...")
    logger.info(f"Base Directory: {BASE_DIR}")
    logger.info(f"Static Files: {static_path if static_path else 'Not found'}")
    logger.info("=" * 60)

# ================== RUN (for local testing) ==================
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)