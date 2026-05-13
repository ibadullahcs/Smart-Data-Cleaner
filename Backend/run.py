# backend/run.py
# Entry point to start the FastAPI server

import uvicorn
from app.config import settings

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 SMART CLEANER - BACKEND SERVER")
    print("=" * 60)
    print(f"📡 Server running at: http://{settings.HOST}:{settings.PORT}")
    print(f"📚 API Documentation: http://{settings.HOST}:{settings.PORT}/docs")
    print(f"🔧 Debug mode: {settings.DEBUG}")
    print(f"📁 Upload directory: {settings.UPLOAD_DIR}")
    print("=" * 60)
    print("Press CTRL+C to stop the server")
    print("=" * 60)
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info",
        access_log=True
    )