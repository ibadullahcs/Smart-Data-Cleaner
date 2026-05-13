# backend/app/api/routes/__init__.py
from .upload import router as upload_router
from .profile import router as profile_router
from .clean import router as clean_router
from .analyze import router as analyze_router
from .export import router as export_router
from .auth import router as auth_router
from .jobs import router as jobs_router
from .history import router as history_router

routers = [
    upload_router,
    profile_router,
    clean_router,
    analyze_router,
    export_router,
    auth_router,
    jobs_router,
    history_router,
]