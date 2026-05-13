# backend/app/api/routes/export.py
import os
import pandas as pd
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse

from app.config import settings
from app.supabase_client import supabase_client
from app.auth.dependencies import get_current_user

router = APIRouter()


@router.get("/download/{job_id}")
async def download_file(
    job_id: str,
    format: str = "csv",
    current_user: dict = Depends(get_current_user)
):
    """Download cleaned data in specified format"""
    
    # Find job
    jobs = await supabase_client.query(
        "cleaning_jobs",
        select="*",
        filters={"id": job_id, "user_id": current_user["id"]}
    )
    
    if not jobs:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    # Find local file
    job_dir = os.path.join(settings.UPLOAD_DIR, job_id)
    if not os.path.exists(job_dir):
        raise HTTPException(status_code=404, detail="Job directory not found")
    
    files = os.listdir(job_dir)
    cleaned_file = None
    for f in files:
        if f.startswith('cleaned_'):
            cleaned_file = f
            break
    
    if not cleaned_file:
        cleaned_file = files[0] if files else None
    
    if not cleaned_file:
        raise HTTPException(status_code=404, detail="No file found")
    
    file_path = os.path.join(job_dir, cleaned_file)
    file_ext = os.path.splitext(file_path)[1].lower()
    
    try:
        # Read file
        if file_ext == '.csv':
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
        
        # Export based on format
        export_path = os.path.join(job_dir, f"export_{job_id}.{format}")
        
        if format.lower() == 'csv':
            df.to_csv(export_path, index=False)
            media_type = "text/csv"
            filename = f"cleaned_data_{job_id}.csv"
        elif format.lower() == 'excel':
            df.to_excel(export_path, index=False)
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            filename = f"cleaned_data_{job_id}.xlsx"
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")
        
        return FileResponse(
            path=export_path,
            media_type=media_type,
            filename=filename
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting file: {str(e)}")