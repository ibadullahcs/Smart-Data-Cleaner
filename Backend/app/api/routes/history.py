# backend/app/api/routes/history.py
from fastapi import APIRouter, HTTPException, Depends
from app.supabase_client import supabase_client
from app.auth.dependencies import get_current_user

router = APIRouter()


@router.get("/history/{job_id}")
async def get_job_history(job_id: str, current_user: dict = Depends(get_current_user)):
    """Get action history for a specific job"""
    try:
        # First get the job
        jobs = await supabase_client.query(
            "cleaning_jobs",
            select="id",
            filters={"id": job_id, "user_id": current_user["id"]}
        )
        if not jobs:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Get history from cleaning_history table
        history = await supabase_client.query(
            "cleaning_history",
            select="*",
            filters={"job_id": jobs[0]["id"]}
        )
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/history/{job_id}")
async def add_history_action(job_id: str, action: dict, current_user: dict = Depends(get_current_user)):
    """Add an action to job history"""
    try:
        jobs = await supabase_client.query(
            "cleaning_jobs",
            select="id",
            filters={"id": job_id, "user_id": current_user["id"]}
        )
        if not jobs:
            raise HTTPException(status_code=404, detail="Job not found")
        
        action_data = {
            "job_id": jobs[0]["id"],
            "action_type": action.get("action_type"),
            "action_details": action.get("details", {}),
            "affected_rows": action.get("rows_affected", 0),
            "affected_columns": action.get("affected_columns", [])
        }
        
        result = await supabase_client.insert("cleaning_history", action_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))