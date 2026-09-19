# backend/app/api/routes/profile.py
import os
import pandas as pd
import numpy as np
import traceback
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from datetime import datetime

from app.config import settings
from app.supabase_client import supabase_client
from app.auth.dependencies import get_current_user
from app.services.profiler import profile_data, read_file_with_encoding

router = APIRouter()


def convert_to_serializable(obj):
    """Convert numpy/pandas types to Python native types"""
    if isinstance(obj, (np.int64, np.int32, np.int16, np.int8)):
        return int(obj)
    elif isinstance(obj, (np.float64, np.float32, np.float16)):
        return float(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif pd.isna(obj):
        return None
    elif isinstance(obj, (pd.Timestamp, datetime)):
        return obj.isoformat()
    return obj


@router.get("/profile/{job_id}")
async def get_profile(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed profile of the uploaded data"""
    
    print(f"📊 Profile requested for job: {job_id}")
    print(f"👤 User ID: {current_user.get('id')}")
    print(f"👤 User Email: {current_user.get('email')}")
    
    try:
        jobs = await supabase_client.query(
            "cleaning_jobs",
            select="*",
            filters={"id": job_id, "user_id": current_user["id"]}
        )
        
        print(f"🔍 Query result for job {job_id}: {jobs}")
        
        if not jobs:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        
        job = jobs[0]
        print(f"📁 Found job: {job.get('original_filename')}")
        
        # Find local file
        job_dir = os.path.join(settings.UPLOAD_DIR, job_id)
        print(f"📁 Looking for directory: {job_dir}")
        
        if not os.path.exists(job_dir):
            raise HTTPException(status_code=404, detail=f"Job directory not found: {job_dir}")
        
        files = os.listdir(job_dir)
        print(f"📄 Files in directory: {files}")
        
        if not files:
            raise HTTPException(status_code=404, detail="No file found for this job")
        
        file_path = os.path.join(job_dir, files[0])
        file_ext = os.path.splitext(file_path)[1].lower()
        
        print(f"📖 Reading file: {file_path}")
        
        # Read file
        if file_ext == '.csv':
            df = read_file_with_encoding(file_path, 'csv')
        else:
            df = pd.read_excel(file_path)
        
        total_rows = len(df)
        total_columns = len(df.columns)
        
        print(f"✅ File loaded: {total_rows} rows, {total_columns} columns")
        
        # Profile data
        profile_result = profile_data(df, files[0])
        
        # Update job in database
        await supabase_client.update(
            "cleaning_jobs",
            data={
                "rows_original": total_rows,
                "columns_count": total_columns,
                "quality_score_before": profile_result["quality_score"],
                "updated_at": datetime.now().isoformat()
            },
            match={"id": job_id}
        )
        
        result = {
            "job_id": job_id,
            "filename": files[0],
            "total_rows": total_rows,
            "total_columns": total_columns,
            "quality_score": profile_result["quality_score"],
            "columns": profile_result["columns"],
            "preview_data": profile_result["preview_data"],
            # NEW: honest truncation reporting — see profiler.py fix.
            "preview_truncated": profile_result.get("preview_truncated", False),
            "preview_rows_shown": profile_result.get("preview_rows_shown", len(profile_result["preview_data"]))
        }
        
        print(f"📊 Returning profile: {total_rows} rows, {len(profile_result['columns'])} columns")
        return JSONResponse(content=convert_to_serializable(result))
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error profiling data: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error profiling data: {str(e)}")