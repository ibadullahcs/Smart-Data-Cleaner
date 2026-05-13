# backend/app/api/routes/auth.py
from fastapi import APIRouter, HTTPException, Depends  # ← ADD Depends here
from pydantic import BaseModel
import httpx
from app.supabase_client import supabase_client
from app.auth.dependencies import get_current_user  # ← ADD this import

router = APIRouter()


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str = None


class UserLogin(BaseModel):
    email: str
    password: str


@router.post("/auth/register")
async def register(user: UserCreate):
    """Register a new user via Supabase Auth"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{supabase_client.url}/auth/v1/signup",
                headers={
                    "apikey": supabase_client.anon_key,
                    "Content-Type": "application/json"
                },
                json={
                    "email": user.email,
                    "password": user.password,
                    "data": {"full_name": user.full_name}
                }
            )
            if response.status_code == 200:
                return response.json()
            raise HTTPException(status_code=response.status_code, detail=response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auth/login")
async def login(user: UserLogin):
    """Login user via Supabase Auth"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{supabase_client.url}/auth/v1/token?grant_type=password",
                headers={
                    "apikey": supabase_client.anon_key,
                    "Content-Type": "application/json"
                },
                json={
                    "email": user.email,
                    "password": user.password
                }
            )
            if response.status_code == 200:
                return response.json()
            raise HTTPException(status_code=401, detail="Invalid credentials")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auth/logout")
async def logout():
    """Logout user (client should discard token)"""
    return {"message": "Logged out successfully"}


@router.get("/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    return current_user