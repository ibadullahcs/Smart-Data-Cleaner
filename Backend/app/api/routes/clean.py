# backend/app/api/routes/clean.py
# Complete Cleaning API Routes - Production Ready

import os
import pandas as pd
import numpy as np
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from typing import Optional, List, Dict, Any

from app.config import settings
from app.supabase_client import supabase_client
from app.auth.dependencies import get_current_user
from app.services.cleaning_service import cleaning_service

router = APIRouter()


def convert_to_serializable(obj):
    """Convert numpy/pandas types to Python native types for JSON serialization"""
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
    elif isinstance(obj, pd.Series):
        return obj.tolist()
    elif isinstance(obj, pd.DataFrame):
        return obj.to_dict(orient='records')
    return obj


async def get_dataframe(job_id: str, user_id: str):
    """Helper to load dataframe for a job"""
    jobs = await supabase_client.query(
        "cleaning_jobs",
        select="*",
        filters={"id": job_id, "user_id": user_id}
    )
    
    if not jobs:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    job = jobs[0]
    
    job_dir = os.path.join(settings.UPLOAD_DIR, job_id)
    if not os.path.exists(job_dir):
        raise HTTPException(status_code=404, detail="Job directory not found")
    
    files = os.listdir(job_dir)
    file_path = None
    for f in files:
        if f.startswith('cleaned_'):
            file_path = os.path.join(job_dir, f)
            break
    if not file_path:
        file_path = os.path.join(job_dir, files[0]) if files else None
    
    if not file_path:
        raise HTTPException(status_code=404, detail="No file found")
    
    file_ext = os.path.splitext(file_path)[1].lower()
    
    if file_ext == '.csv':
        df = pd.read_csv(file_path)
    else:
        df = pd.read_excel(file_path)
    
    return df, job, file_path, file_ext


def save_dataframe(df: pd.DataFrame, job_dir: str, original_filename: str, file_ext: str) -> str:
    """Helper to save dataframe"""
    cleaned_file_path = os.path.join(job_dir, f"cleaned_{original_filename}")
    if file_ext == '.csv':
        df.to_csv(cleaned_file_path, index=False)
    else:
        df.to_excel(cleaned_file_path, index=False)
    return cleaned_file_path


async def log_action(job_id: str, user_id: str, job_db_id: str, action_type: str, operation: str, 
                     column: str, rows_affected: int, details: dict = None):
    """Helper to log action to history"""
    try:
        await supabase_client.insert("cleaning_history", {
            "job_id": job_db_id,
            "user_id": user_id,
            "action_type": action_type,
            "operation": operation,
            "column_name": column,
            "rows_affected": int(rows_affected),
            "details": details or {}
        })
    except Exception as e:
        print(f"Warning: Failed to log action: {e}")


# ============================================
# 1. MISSING VALUES ENDPOINTS
# ============================================

@router.post("/clean/fill-mean/{job_id}")
async def fill_mean(
    job_id: str,
    column: str = Query(..., description="Column name"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    df, rows_affected = cleaning_service.fill_missing_mean(df, column)
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "cleaning", "fill_mean", column, rows_affected)
    return JSONResponse(content={"success": True, "rows_affected": rows_affected, "message": f"Filled {rows_affected} missing values with mean"})


@router.post("/clean/fill-median/{job_id}")
async def fill_median(
    job_id: str,
    column: str = Query(..., description="Column name"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    df, rows_affected = cleaning_service.fill_missing_median(df, column)
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "cleaning", "fill_median", column, rows_affected)
    return JSONResponse(content={"success": True, "rows_affected": rows_affected, "message": f"Filled {rows_affected} missing values with median"})


@router.post("/clean/fill-mode/{job_id}")
async def fill_mode(
    job_id: str,
    column: str = Query(..., description="Column name"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    df, rows_affected = cleaning_service.fill_missing_mode(df, column)
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "cleaning", "fill_mode", column, rows_affected)
    return JSONResponse(content={"success": True, "rows_affected": rows_affected, "message": f"Filled {rows_affected} missing values with mode"})


@router.post("/clean/fill-constant/{job_id}")
async def fill_constant(
    job_id: str,
    column: str = Query(..., description="Column name"),
    value: str = Query(..., description="Constant value to fill"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    df, rows_affected = cleaning_service.fill_missing_constant(df, column, value)
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "cleaning", "fill_constant", column, rows_affected)
    return JSONResponse(content={"success": True, "rows_affected": rows_affected, "message": f"Filled {rows_affected} missing values with '{value}'"})


@router.post("/clean/fill-forward/{job_id}")
async def fill_forward(
    job_id: str,
    column: str = Query(..., description="Column name"),
    current_user: dict = Depends(get_current_user)
):
    """Forward fill missing values (use previous value)"""
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    df, rows_affected = cleaning_service.fill_missing_forward(df, column)
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "cleaning", "fill_forward", column, rows_affected)
    return JSONResponse(content={"success": True, "rows_affected": rows_affected, "message": f"Forward filled {rows_affected} missing values in '{column}'"})


@router.post("/clean/fill-backward/{job_id}")
async def fill_backward(
    job_id: str,
    column: str = Query(..., description="Column name"),
    current_user: dict = Depends(get_current_user)
):
    """Backward fill missing values (use next value)"""
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    df, rows_affected = cleaning_service.fill_missing_backward(df, column)
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "cleaning", "fill_backward", column, rows_affected)
    return JSONResponse(content={"success": True, "rows_affected": rows_affected, "message": f"Backward filled {rows_affected} missing values in '{column}'"})


# ============================================
# 2. DUPLICATES ENDPOINTS
# ============================================

@router.post("/clean/remove-duplicates/{job_id}")
async def remove_duplicates(
    job_id: str,
    keep: str = Query("first", description="Which duplicate to keep (first, last, False)"),
    keys: Optional[str] = Query(None, description="Comma-separated column names for key-based dedup"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    
    if keys:
        key_list = [k.strip() for k in keys.split(",")]
        df, rows_affected = cleaning_service.remove_key_duplicates(df, key_list, keep)
    else:
        df, rows_affected = cleaning_service.remove_exact_duplicates(df, keep)
    
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "cleaning", "remove_duplicates", None, rows_affected)
    return JSONResponse(content={"success": True, "rows_removed": rows_affected, "message": f"Removed {rows_affected} duplicate rows"})


# ============================================
# 3. TEXT CLEANING ENDPOINTS
# ============================================

@router.post("/clean/trim-spaces/{job_id}")
async def trim_spaces(
    job_id: str,
    column: str = Query(..., description="Column name or 'all' for all text columns"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    
    rows_affected = 0
    if column == 'all':
        for col in df.select_dtypes(include=['object']).columns:
            df, changed = cleaning_service.trim_spaces(df, col)
            rows_affected += changed
        message = f"Trimmed spaces from {rows_affected} cells across all text columns"
    else:
        df, rows_affected = cleaning_service.trim_spaces(df, column)
        message = f"Trimmed spaces from {rows_affected} cells in '{column}'"
    
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "cleaning", "trim_spaces", column, rows_affected)
    return JSONResponse(content={"success": True, "rows_affected": rows_affected, "message": message})


@router.post("/clean/to-lowercase/{job_id}")
async def to_lowercase(
    job_id: str,
    column: str = Query(..., description="Column name or 'all' for all text columns"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    
    rows_affected = 0
    if column == 'all':
        for col in df.select_dtypes(include=['object']).columns:
            df, changed = cleaning_service.to_lowercase(df, col)
            rows_affected += changed
        message = f"Converted {rows_affected} cells to lowercase across all text columns"
    else:
        df, rows_affected = cleaning_service.to_lowercase(df, column)
        message = f"Converted {rows_affected} cells to lowercase in '{column}'"
    
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "cleaning", "to_lowercase", column, rows_affected)
    return JSONResponse(content={"success": True, "rows_affected": rows_affected, "message": message})


@router.post("/clean/to-uppercase/{job_id}")
async def to_uppercase(
    job_id: str,
    column: str = Query(..., description="Column name or 'all' for all text columns"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    
    rows_affected = 0
    if column == 'all':
        for col in df.select_dtypes(include=['object']).columns:
            df, changed = cleaning_service.to_uppercase(df, col)
            rows_affected += changed
        message = f"Converted {rows_affected} cells to uppercase across all text columns"
    else:
        df, rows_affected = cleaning_service.to_uppercase(df, column)
        message = f"Converted {rows_affected} cells to uppercase in '{column}'"
    
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "cleaning", "to_uppercase", column, rows_affected)
    return JSONResponse(content={"success": True, "rows_affected": rows_affected, "message": message})


@router.post("/clean/to-titlecase/{job_id}")
async def to_titlecase(
    job_id: str,
    column: str = Query(..., description="Column name"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    df, rows_affected = cleaning_service.to_titlecase(df, column)
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "cleaning", "to_titlecase", column, rows_affected)
    return JSONResponse(content={"success": True, "rows_affected": rows_affected, "message": f"Converted {rows_affected} cells to title case"})


@router.post("/clean/remove-special/{job_id}")
async def remove_special(
    job_id: str,
    column: str = Query(..., description="Column name"),
    keep: str = Query("alphanumeric", description="What to keep (alphanumeric, letters, numbers)"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    df, rows_affected = cleaning_service.remove_special_characters(df, column, keep)
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "cleaning", "remove_special", column, rows_affected)
    return JSONResponse(content={"success": True, "rows_affected": rows_affected, "message": f"Removed special characters from {rows_affected} cells"})


@router.post("/clean/fix-encoding/{job_id}")
async def fix_encoding(
    job_id: str,
    column: str = Query(..., description="Column name"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    df, rows_affected = cleaning_service.fix_encoding(df, column)
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "cleaning", "fix_encoding", column, rows_affected)
    return JSONResponse(content={"success": True, "rows_affected": rows_affected, "message": f"Fixed encoding for {rows_affected} cells"})


# ============================================
# 4. OUTLIER ENDPOINTS
# ============================================

@router.post("/clean/remove-outliers-iqr/{job_id}")
async def remove_outliers_iqr(
    job_id: str,
    column: str = Query(..., description="Column name"),
    multiplier: float = Query(1.5, description="IQR multiplier"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    df, rows_removed = cleaning_service.remove_outliers_iqr(df, column, multiplier)
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "cleaning", "remove_outliers_iqr", column, rows_removed)
    return JSONResponse(content={"success": True, "rows_removed": rows_removed, "message": f"Removed {rows_removed} outlier rows from '{column}'"})


@router.post("/clean/cap-outliers/{job_id}")
async def cap_outliers(
    job_id: str,
    column: str = Query(..., description="Column name"),
    lower_percentile: int = Query(1, description="Lower percentile (0-100)"),
    upper_percentile: int = Query(99, description="Upper percentile (0-100)"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    df, rows_capped = cleaning_service.cap_outliers_percentile(df, column, lower_percentile, upper_percentile)
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "cleaning", "cap_outliers", column, rows_capped)
    return JSONResponse(content={"success": True, "message": f"Capped outliers in '{column}'"})


# ============================================
# 5. DATA TYPE CONVERSION ENDPOINTS
# ============================================

@router.post("/clean/to-numeric/{job_id}")
async def convert_to_numeric(
    job_id: str,
    column: str = Query(..., description="Column name"),
    errors: str = Query("coerce", description="How to handle errors (coerce, raise, ignore)"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    df, invalid_count = cleaning_service.to_numeric(df, column, errors)
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "cleaning", "to_numeric", column, invalid_count)
    return JSONResponse(content={"success": True, "invalid_count": invalid_count, "message": f"Converted column '{column}' to numeric. {invalid_count} values could not be converted."})


@router.post("/clean/to-datetime/{job_id}")
async def convert_to_datetime(
    job_id: str,
    column: str = Query(..., description="Column name"),
    format: Optional[str] = Query(None, description="Date format string"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    df, invalid_count = cleaning_service.to_datetime(df, column, format)
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "cleaning", "to_datetime", column, invalid_count)
    return JSONResponse(content={"success": True, "invalid_count": invalid_count, "message": f"Converted column '{column}' to datetime. {invalid_count} values could not be converted."})


# ============================================
# 6. DATE OPERATIONS ENDPOINTS
# ============================================

@router.post("/clean/extract-year/{job_id}")
async def extract_year(
    job_id: str,
    column: str = Query(..., description="Date column name"),
    new_column: Optional[str] = Query(None, description="New column name"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    df = cleaning_service.extract_year(df, column, new_column)
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "feature_engineering", "extract_year", column, len(df))
    return JSONResponse(content={"success": True, "message": f"Extracted year from '{column}'"})


@router.post("/clean/extract-month/{job_id}")
async def extract_month(
    job_id: str,
    column: str = Query(..., description="Date column name"),
    new_column: Optional[str] = Query(None, description="New column name"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    df = cleaning_service.extract_month(df, column, new_column)
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "feature_engineering", "extract_month", column, len(df))
    return JSONResponse(content={"success": True, "message": f"Extracted month from '{column}'"})


@router.post("/clean/extract-day/{job_id}")
async def extract_day(
    job_id: str,
    column: str = Query(..., description="Date column name"),
    new_column: Optional[str] = Query(None, description="New column name"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    df = cleaning_service.extract_day(df, column, new_column)
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "feature_engineering", "extract_day", column, len(df))
    return JSONResponse(content={"success": True, "message": f"Extracted day from '{column}'"})


@router.post("/clean/extract-dayofweek/{job_id}")
async def extract_dayofweek(
    job_id: str,
    column: str = Query(..., description="Date column name"),
    new_column: Optional[str] = Query(None, description="New column name"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    df = cleaning_service.extract_day_of_week(df, column, new_column)
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "feature_engineering", "extract_dayofweek", column, len(df))
    return JSONResponse(content={"success": True, "message": f"Extracted day of week from '{column}'"})


@router.post("/clean/calculate-age/{job_id}")
async def calculate_age(
    job_id: str,
    birth_column: str = Query(..., description="Birth date column"),
    reference_date: Optional[str] = Query(None, description="Reference date (default: today)"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    df = cleaning_service.calculate_age(df, birth_column, reference_date)
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "feature_engineering", "calculate_age", birth_column, len(df))
    return JSONResponse(content={"success": True, "message": "Calculated age column"})


# ============================================
# 7. STRING OPERATIONS ENDPOINTS
# ============================================

@router.post("/clean/split-column/{job_id}")
async def split_column(
    job_id: str,
    column: str = Query(..., description="Column to split"),
    delimiter: str = Query(" ", description="Delimiter"),
    into: int = Query(2, description="Number of parts to split into"),
    new_names: Optional[str] = Query(None, description="Comma-separated new column names"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    name_list = [n.strip() for n in new_names.split(",")] if new_names else None
    df = cleaning_service.split_column(df, column, delimiter, into, name_list)
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "feature_engineering", "split_column", column, len(df))
    return JSONResponse(content={"success": True, "message": f"Split '{column}' into {into} columns"})


@router.post("/clean/merge-columns/{job_id}")
async def merge_columns(
    job_id: str,
    columns: str = Query(..., description="Comma-separated column names to merge"),
    new_column: str = Query(..., description="New column name"),
    delimiter: str = Query(" ", description="Delimiter between values"),
    remove_original: bool = Query(True, description="Remove original columns"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    column_list = [c.strip() for c in columns.split(",")]
    df = cleaning_service.merge_columns(df, column_list, new_column, delimiter, remove_original)
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "feature_engineering", "merge_columns", None, len(df))
    return JSONResponse(content={"success": True, "message": f"Merged {len(column_list)} columns into '{new_column}'"})


@router.post("/clean/find-replace/{job_id}")
async def find_replace(
    job_id: str,
    column: str = Query(..., description="Column name"),
    find: str = Query(..., description="Text to find"),
    replace: str = Query(..., description="Replacement text"),
    regex: bool = Query(False, description="Use regex pattern"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    df, rows_affected = cleaning_service.find_replace(df, column, find, replace, regex)
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "cleaning", "find_replace", column, rows_affected)
    return JSONResponse(content={"success": True, "rows_affected": rows_affected, "message": f"Replaced '{find}' with '{replace}' in {rows_affected} cells"})


@router.post("/clean/rename-column/{job_id}")
async def rename_column(
    job_id: str,
    old_name: str = Query(..., description="Current column name"),
    new_name: str = Query(..., description="New column name"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    
    if old_name not in df.columns:
        return JSONResponse(content={"success": False, "message": f"Column '{old_name}' not found"})
    
    df.rename(columns={old_name: new_name}, inplace=True)
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "feature_engineering", "rename_column", old_name, len(df), {"new_name": new_name})
    return JSONResponse(content={"success": True, "message": f"Renamed column '{old_name}' to '{new_name}'"})


@router.post("/clean/drop-column/{job_id}")
async def drop_column(
    job_id: str,
    column: str = Query(..., description="Column name to drop"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    
    if column not in df.columns:
        return JSONResponse(content={"success": False, "message": f"Column '{column}' not found"})
    
    df.drop(columns=[column], inplace=True)
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "feature_engineering", "drop_column", column, len(df))
    return JSONResponse(content={"success": True, "message": f"Dropped column '{column}'"})


# ============================================
# 8. EMAIL & PHONE ENDPOINTS
# ============================================

@router.post("/clean/fix-emails/{job_id}")
async def fix_emails(
    job_id: str,
    column: str = Query(..., description="Email column name"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    
    if column not in df.columns:
        return JSONResponse(content={
            "success": False, 
            "valid_count": 0, 
            "invalid_count": 0, 
            "message": f"Column '{column}' not found. Available: {', '.join(df.columns[:5])}..."
        })
    
    df = cleaning_service.validate_emails(df, column)
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "cleaning", "fix_emails", column, 0)
    
    valid_count = int(df[f'{column}_valid'].sum())
    invalid_count = len(df) - valid_count
    
    return JSONResponse(content={"success": True, "valid_count": valid_count, "invalid_count": invalid_count, "message": f"Validated emails: {valid_count} valid, {invalid_count} invalid"})


@router.post("/clean/format-phones/{job_id}")
async def format_phones(
    job_id: str,
    column: str = Query(..., description="Phone column name"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    
    if column not in df.columns:
        return JSONResponse(content={
            "success": False, 
            "rows_affected": 0, 
            "message": f"Column '{column}' not found. Available: {', '.join(df.columns[:5])}..."
        })
    
    df, rows_affected = cleaning_service.format_phones(df, column)
    save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    await log_action(job_id, current_user["id"], job["id"], "cleaning", "format_phones", column, rows_affected)
    return JSONResponse(content={"success": True, "rows_affected": rows_affected, "message": f"Formatted {rows_affected} phone numbers"})


# ============================================
# 9. SMART CLEAN ENDPOINT
# ============================================

@router.post("/smart-clean/{job_id}")
async def smart_clean(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """One-click smart cleaning - automatically detects and cleans all columns"""
    
    print(f"🧹 Smart Clean requested for job: {job_id}")
    
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    
    original_df = df.copy()
    
    def calc_health(d):
        total_cells = len(d) * len(d.columns)
        if total_cells == 0:
            return 0
        missing = int(d.isnull().sum().sum())
        return max(0, 100 - int((missing / total_cells) * 100))
    
    health_before = calc_health(original_df)
    
    # Apply smart cleaning using the fixed cleaning_service method
    df, changes = cleaning_service.smart_clean(df)
    
    health_after = calc_health(df)
    
    # Save cleaned dataframe
    cleaned_path = save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    
    await supabase_client.update(
        "cleaning_jobs",
        data={
            "quality_score_before": health_before,
            "quality_score_after": health_after,
            "cleaned_filename": os.path.basename(cleaned_path),
            "rows_after": len(df),
            "cleaning_actions": changes,
            "status": "cleaned",
            "completed_at": datetime.now().isoformat()
        },
        match={"id": job["id"]}
    )
    
    await log_action(job_id, current_user["id"], job["id"], "cleaning", "smart_clean", None, changes['total_changes'], changes)
    
    response = {
        "job_id": job_id,
        "status": "completed",
        "changes_count": int(changes['total_changes']),
        "rows_affected": len(original_df) - len(df),
        "operations_performed": changes['operations'],
        "health_score_before": health_before,
        "health_score_after": health_after,
        "message": f"Smart cleaning completed. {changes['total_changes']} changes made."
    }
    
    print(f"✅ Smart Clean complete: {changes['total_changes']} changes")
    return JSONResponse(content=convert_to_serializable(response))


# ============================================
# 10. QUICK CLEAN ENDPOINT
# ============================================

@router.post("/clean/quick/{job_id}")
async def quick_clean(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Quick clean - remove duplicates and trim spaces only"""
    
    print(f"⚡ Quick Clean requested for job: {job_id}")
    
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    
    original_df = df.copy()
    
    def calc_health(d):
        total_cells = len(d) * len(d.columns)
        if total_cells == 0:
            return 0
        missing = int(d.isnull().sum().sum())
        return max(0, 100 - int((missing / total_cells) * 100))
    
    health_before = calc_health(original_df)
    changes = {'operations': [], 'total_changes': 0}
    
    # Remove duplicates
    before_rows = len(df)
    df = df.drop_duplicates(keep='first')
    removed = before_rows - len(df)
    if removed > 0:
        changes['operations'].append({
            'operation': 'remove_duplicates',
            'rows': removed
        })
        changes['total_changes'] += removed
    
    # Trim spaces in text columns
    for col in df.select_dtypes(include=['object']).columns:
        before = df[col].copy()
        df[col] = df[col].astype(str).str.strip()
        changed = (before != df[col]).sum()
        if changed > 0:
            changes['operations'].append({
                'column': col,
                'operation': 'trim_spaces',
                'rows': int(changed)
            })
            changes['total_changes'] += int(changed)
    
    health_after = calc_health(df)
    
    cleaned_path = save_dataframe(df, os.path.dirname(file_path), os.path.basename(file_path), file_ext)
    
    await supabase_client.update(
        "cleaning_jobs",
        data={
            "quality_score_before": health_before,
            "quality_score_after": health_after,
            "cleaned_filename": os.path.basename(cleaned_path),
            "rows_after": len(df),
            "cleaning_actions": changes,
            "status": "cleaned",
            "completed_at": datetime.now().isoformat()
        },
        match={"id": job["id"]}
    )
    
    await log_action(job_id, current_user["id"], job["id"], "cleaning", "quick_clean", None, changes['total_changes'], changes)
    
    response = {
        "job_id": job_id,
        "status": "completed",
        "changes_count": int(changes['total_changes']),
        "rows_affected": len(original_df) - len(df),
        "operations_performed": changes['operations'],
        "health_score_before": health_before,
        "health_score_after": health_after,
        "message": f"Quick cleaning completed. {changes['total_changes']} changes made."
    }
    
    print(f"✅ Quick Clean complete: {changes['total_changes']} changes")
    return JSONResponse(content=convert_to_serializable(response))


# ============================================
# 11. PREVIEW ACTION ENDPOINT
# ============================================

@router.post("/clean/preview/{job_id}")
async def preview_action(
    job_id: str,
    column: str = Query(..., description="Column name"),
    operation: str = Query(..., description="Operation to preview"),
    value: Optional[str] = Query(None, description="Optional value for the operation"),
    current_user: dict = Depends(get_current_user)
):
    df, job, file_path, file_ext = await get_dataframe(job_id, current_user["id"])
    
    rows_affected = 0
    sample_changes = []
    
    if operation == 'fill_median':
        rows_affected = int(df[column].isna().sum())
        median_val = df[column].median()
        sample_rows = df[df[column].isna()].head(5)
        for idx, row in sample_rows.iterrows():
            sample_changes.append({
                "row": int(idx + 1),
                "from": "null",
                "to": float(median_val) if not pd.isna(median_val) else "N/A"
            })
    
    elif operation == 'trim_spaces':
        before = df[column].astype(str)
        after = before.str.strip()
        rows_affected = int((before != after).sum())
        sample_rows = df[(before != after)].head(5)
        for idx, row in sample_rows.iterrows():
            sample_changes.append({
                "row": int(idx + 1),
                "from": str(before[idx]),
                "to": str(after[idx])
            })
    
    elif operation == 'remove_duplicates':
        rows_affected = len(df) - len(df.drop_duplicates())
    
    elif operation == 'to_uppercase':
        before = df[column].astype(str)
        after = before.str.upper()
        rows_affected = int((before != after).sum())
        sample_rows = df[(before != after)].head(5)
        for idx, row in sample_rows.iterrows():
            sample_changes.append({
                "row": int(idx + 1),
                "from": str(before[idx]),
                "to": str(after[idx])
            })
    
    return JSONResponse(content={
        "affected_rows": rows_affected,
        "sample": sample_changes,
        "operation": operation,
        "column": column
    })