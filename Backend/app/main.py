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

# CORS - Allow all for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for debugging
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

@app.get("/")
async def root():
    return {"message": "Smart Cleaner API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

for router in routers:
    app.include_router(router, prefix="/api", tags=["API"])

@app.on_event("startup")
async def startup_event():
    print("=" * 50)
    print("🚀 SMART CLEANER API - STARTING")
    print("=" * 50)
    print(f"📁 Upload directory: {settings.UPLOAD_DIR}")
    print(f"📚 API Docs: http://{settings.HOST}:{settings.PORT}/docs")
    print("=" * 50)