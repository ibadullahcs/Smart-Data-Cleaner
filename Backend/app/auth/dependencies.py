# backend/app/auth/dependencies.py
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.supabase_client import verify_token

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> dict:
    """Get current user from JWT token"""
    token = credentials.credentials
    user = await verify_token(token)
    
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> dict | None:
    """Get current user if authenticated, otherwise return None"""
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None