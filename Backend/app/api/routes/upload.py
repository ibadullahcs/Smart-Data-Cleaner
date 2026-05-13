# backend/app/api/routes/upload.py
import os
import uuid
import shutil
import json
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
import pandas as pd

from app.config import settings
from app.supabase_client import supabase_client
from app.auth.dependencies import get_current_user

router = APIRouter()


def generate_job_id() -> str:
    return str(uuid.uuid4())[:8]


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    print("=" * 60)
    print("📤 UPLOAD REQUEST RECEIVED")
    print(f"👤 User ID: {current_user.get('id')}")
    print(f"👤 User Email: {current_user.get('email')}")
    print(f"📁 File name: {file.filename}")
    print("=" * 60)
    
    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )
    
    # Generate job ID
    job_id = generate_job_id()
    print(f"🆕 Generated job_id: {job_id}")
    
    # Create job directory
    job_dir = os.path.join(settings.UPLOAD_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    print(f"📁 Created directory: {job_dir}")
    
    # Save uploaded file
    file_path = os.path.join(job_dir, file.filename)
    
    try:
        # Save file locally
        content = await file.read()
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        file_size = os.path.getsize(file_path)
        print(f"✅ File saved locally: {file_path} ({file_size} bytes)")
        
        # Read file sample
        if file_ext == '.csv':
            df_sample = pd.read_csv(file_path, nrows=5)
            total_rows_estimate = len(pd.read_csv(file_path))
        else:
            df_sample = pd.read_excel(file_path, nrows=5)
            total_rows_estimate = len(pd.read_excel(file_path))
        
        print(f"📊 Total rows estimate: {total_rows_estimate}")
        print(f"📊 Total columns: {len(df_sample.columns)}")
        
        # Prepare job data for Supabase
        job_data = {
            "id": job_id,
            "user_id": current_user["id"],
            "original_filename": file.filename,
            "file_size": file_size,
            "file_path": f"{current_user['id']}/{job_id}/{file.filename}",
            "rows_original": total_rows_estimate,
            "columns_count": len(df_sample.columns),
            "quality_score_before": 0,
            "quality_score_after": 0,
            "status": "uploaded",
            "created_at": datetime.now().isoformat()
        }
        
        print(f"📝 Inserting into Supabase...")
        
        # Insert into Supabase
        result = await supabase_client.insert("cleaning_jobs", job_data)
        
        print(f"✅ Supabase response: {result}")
        
        return JSONResponse(
            status_code=200,
            content={
                "job_id": job_id,
                "filename": file.filename,
                "size": file_size,
                "columns": len(df_sample.columns),
                "message": "File uploaded successfully"
            }
        )
        
    except Exception as e:
        print(f"❌ ERROR: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")