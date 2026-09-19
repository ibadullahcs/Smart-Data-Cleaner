from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.supabase_client import verify_token

# FIX: get_current_user and get_optional_user previously shared this
# single HTTPBearer() instance, which defaults to auto_error=True.
# That means FastAPI itself rejects any request with no Authorization
# header (raising its own 403) BEFORE get_optional_user's try/except
# body ever runs — so its "return None for anonymous requests" path
# was dead code, unreachable in practice. A dedicated instance with
# auto_error=False is required to actually make a route optionally
# authenticated.
security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)


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
    credentials: HTTPAuthorizationCredentials = Security(optional_security)
) -> dict | None:
    """Get current user if authenticated, otherwise return None.

    FIX: now uses `optional_security` (auto_error=False) instead of the
    same instance as get_current_user, so a request with NO
    Authorization header actually reaches this function body (with
    credentials=None) instead of being rejected by FastAPI's own
    dependency resolution before this code ever runs.
    """
    if credentials is None:
        return None
    try:
        token = credentials.credentials
        user = await verify_token(token)
        return user
    except HTTPException:
        return None