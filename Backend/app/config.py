# backend/app/config.py
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings loaded from environment variables"""
    
    # ========== SUPABASE SETTINGS ==========
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    
    # ========== SERVER SETTINGS ==========
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    API_PREFIX: str = "/api"
    
    # ========== FILE STORAGE ==========
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", 104857600))
    ALLOWED_EXTENSIONS: set = {".csv", ".xlsx", ".xls"}
    
    # ========== CORS SETTINGS ==========
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    # ========== CHART SETTINGS ==========
    CHART_DPI: int = 100
    CHART_FORMAT: str = "png"
    
    # ========== CLEANING THRESHOLDS ==========
    AGE_MIN: int = 0
    AGE_MAX: int = 120
    YEAR_MIN: int = 1900
    YEAR_MAX: int = 2100
    CURRENCY_MIN: float = 0
    CURRENCY_MAX: float = 10_000_000
    OUTLIER_STD_THRESHOLD: float = 3.0
    
    # ========== TEXT CLEANING ==========
    PHONE_MIN_DIGITS: int = 10
    PHONE_MAX_DIGITS: int = 15
    
    # ========== GARBAGE VALUES ==========
    GARBAGE_VALUES = [
        '###', '???', '---', '***', '___', 'N/A', 'n/a', 'NULL',
        'null', 'NaN', 'nan', 'None', 'none', 'undefined', 'Unknown',
        '#N/A', '#REF!', '#DIV/0!', '#VALUE!', '#NAME?', '#NUM!', '#NULL!'
    ]


settings = Settings()

# Validate required settings
if not settings.SUPABASE_URL:
    print("❌ ERROR: SUPABASE_URL not set in .env")
if not settings.SUPABASE_ANON_KEY:
    print("❌ ERROR: SUPABASE_ANON_KEY not set in .env")
if not settings.SUPABASE_SERVICE_KEY:
    print("⚠️ WARNING: SUPABASE_SERVICE_KEY not set - some features may not work")

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)