# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from datetime import datetime

from app.config import settings
from app.api.routes import routers

app = FastAPI(
    title="Smart Cleaner API",
    description="Professional Data Cleaning Platform with Supabase",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ============================================
# CORS
# ============================================
# FIX: previously this list was hardcoded here, duplicating (and able
# to silently drift from) settings.CORS_ORIGINS in config.py, which
# was defined but never actually used anywhere. Now there is exactly
# one place CORS origins are configured.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

@app.get("/")
async def root():
    return {
        "message": "Smart Cleaner API", 
        "status": "running",
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# Register all routes
for router in routers:
    app.include_router(router, prefix="/api", tags=["API"])

@app.on_event("startup")
async def startup_event():
    print("=" * 50)
    print("🚀 SMART CLEANER API - STARTING")
    print("=" * 50)
    print(f"📁 Upload directory: {settings.UPLOAD_DIR}")
    print(f"🔧 Debug mode: {settings.DEBUG}")
    print(f"🌐 CORS origins: {settings.CORS_ORIGINS}")
    print(f"🗄️  Database: Supabase PostgreSQL")
    print(f"📚 API Docs: http://{settings.HOST}:{settings.PORT}/docs")
    print("=" * 50)