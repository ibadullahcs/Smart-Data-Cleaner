# backend/app/api/routes/jobs.py
from fastapi import APIRouter, HTTPException, Depends
from app.supabase_client import supabase_client
from app.auth.dependencies import get_current_user
import os
import shutil
from app.config import settings

router = APIRouter()


@router.get("/jobs")
async def get_user_jobs(current_user: dict = Depends(get_current_user)):
    """Get all cleaning jobs for current user"""
    try:
        jobs = await supabase_client.query(
            "cleaning_jobs",
            select="*",
            filters={"user_id": current_user["id"]}
        )
        return jobs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/{job_id}")
async def get_job(job_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific job"""
    try:
        jobs = await supabase_client.query(
            "cleaning_jobs",
            select="*",
            filters={"id": job_id, "user_id": current_user["id"]}
        )
        if not jobs:
            raise HTTPException(status_code=404, detail="Job not found")
        return jobs[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a job and its associated data"""
    try:
        # First verify job belongs to user
        jobs = await supabase_client.query(
            "cleaning_jobs",
            select="id",
            filters={"id": job_id, "user_id": current_user["id"]}
        )
        if not jobs:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Delete local files from disk
        job_dir = os.path.join(settings.UPLOAD_DIR, job_id)
        if os.path.exists(job_dir):
            shutil.rmtree(job_dir)
        
        # Delete from database
        await supabase_client.delete(
            "cleaning_jobs",
            match={"id": job_id, "user_id": current_user["id"]}
        )
        return {"message": "Job deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))