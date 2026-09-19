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


def sanitize_filename(filename: str) -> str:
    """
    FIX (CRITICAL - path traversal): strips directory components and
    disallowed characters from the client-supplied filename before it
    is ever used in a filesystem path.
    """
    base_name = os.path.basename(filename)
    base_name = base_name.replace('..', '')
    safe_name = "".join(c for c in base_name if c.isalnum() or c in (' ', '.', '_', '-')).strip()
    if not safe_name or safe_name in ('.', '..'):
        safe_name = f"upload_{uuid.uuid4().hex[:8]}.csv"
    return safe_name


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

    safe_filename = sanitize_filename(file.filename or "")

    file_ext = os.path.splitext(safe_filename)[1].lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )
    
    job_id = generate_job_id()
    print(f"🆕 Generated job_id: {job_id}")
    
    job_dir = os.path.join(settings.UPLOAD_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    print(f"📁 Created directory: {job_dir}")
    
    file_path = os.path.join(job_dir, safe_filename)

    if os.path.commonpath([os.path.abspath(file_path), os.path.abspath(job_dir)]) != os.path.abspath(job_dir):
        raise HTTPException(status_code=400, detail="Invalid filename")

    try:
        content = await file.read()

        if len(content) == 0:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty. Please choose a file that contains data."
            )

        if len(content) > settings.MAX_FILE_SIZE:
            max_mb = settings.MAX_FILE_SIZE / (1024 * 1024)
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {max_mb:.0f}MB."
            )

        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        file_size = os.path.getsize(file_path)
        print(f"✅ File saved locally: {file_path} ({file_size} bytes)")
        
        # FIX (performance): previously read the file from disk TWICE —
        # once with nrows=5 for a sample, once in full just to compute
        # len(df). For a large file that's the full parse cost paid
        # twice. Now it's read fully ONCE, and the 5-row sample is
        # sliced from the already-loaded dataframe in memory.
        try:
            if file_ext == '.csv':
                df_full = pd.read_csv(file_path)
            else:
                df_full = pd.read_excel(file_path)
        except pd.errors.EmptyDataError:
            shutil.rmtree(job_dir, ignore_errors=True)
            raise HTTPException(
                status_code=400,
                detail="The file has no readable columns or data. Please check the file and try again."
            )
        except (pd.errors.ParserError, UnicodeDecodeError, ValueError, Exception) as parse_err:
            shutil.rmtree(job_dir, ignore_errors=True)
            print(f"❌ File parsing failed: {type(parse_err).__name__}: {parse_err}")
            raise HTTPException(
                status_code=400,
                detail="Could not read this file. It may be corrupted, empty, or not a valid CSV/Excel file."
            )

        if len(df_full.columns) == 0:
            shutil.rmtree(job_dir, ignore_errors=True)
            raise HTTPException(
                status_code=400,
                detail="The file has no columns. Please check the file and try again."
            )

        df_sample = df_full.head(5)
        total_rows_estimate = len(df_full)

        print(f"📊 Total rows estimate: {total_rows_estimate}")
        print(f"📊 Total columns: {len(df_sample.columns)}")
        
        job_data = {
            "id": job_id,
            "user_id": current_user["id"],
            "original_filename": safe_filename,
            "file_size": file_size,
            "file_path": f"{current_user['id']}/{job_id}/{safe_filename}",
            "rows_original": total_rows_estimate,
            "columns_count": len(df_sample.columns),
            "quality_score_before": 0,
            "quality_score_after": 0,
            "status": "uploaded",
            "created_at": datetime.now().isoformat()
        }
        
        print(f"📝 Inserting into Supabase...")
        
        result = await supabase_client.insert("cleaning_jobs", job_data)
        
        print(f"✅ Supabase response: {result}")
        
        return JSONResponse(
            status_code=200,
            content={
                "job_id": job_id,
                "filename": safe_filename,
                "size": file_size,
                "columns": len(df_sample.columns),
                "message": "File uploaded successfully"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ ERROR: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")