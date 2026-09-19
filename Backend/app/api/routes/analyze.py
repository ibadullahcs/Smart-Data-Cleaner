# backend/app/api/routes/analyze.py
import os
import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from datetime import datetime

from app.config import settings
from app.supabase_client import supabase_client
from app.auth.dependencies import get_current_user

router = APIRouter()

# FIX: named constants instead of magic numbers (10, 10, 10, 5) scattered
# through the function body — makes the limits visible/adjustable in one
# place, and lets the response honestly report against them.
MAX_HISTOGRAM_COLUMNS = 10
MAX_FREQUENCY_COLUMNS = 10
MAX_OUTLIER_COLUMNS = 10
MAX_CORRELATION_COLUMNS = 5


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


@router.get("/analyze/{job_id}")
async def analyze_data(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Perform statistical analysis on the data"""
    
    print(f"📊 Analysis requested for job: {job_id}")
    print(f"👤 User: {current_user.get('email')}")
    
    # Find job in database
    jobs = await supabase_client.query(
        "cleaning_jobs",
        select="*",
        filters={"id": job_id, "user_id": current_user["id"]}
    )
    
    if not jobs:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    job = jobs[0]
    print(f"📁 Found job: {job.get('original_filename')}")
    
    # Find local file
    job_dir = os.path.join(settings.UPLOAD_DIR, job_id)
    if not os.path.exists(job_dir):
        raise HTTPException(status_code=404, detail="Job directory not found")
    
    files = os.listdir(job_dir)
    print(f"📄 Files in directory: {files}")
    
    # Use cleaned file if exists, otherwise original
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
    print(f"📖 Reading file: {file_path}")
    
    try:
        # Read file
        if file_ext == '.csv':
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
        
        print(f"✅ File loaded: {len(df)} rows, {len(df.columns)} columns")
        
        # Get column types
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = df.select_dtypes(include=['object']).columns.tolist()
        
        # Try to identify date columns
        date_cols = []
        for col in categorical_cols[:]:
            try:
                if len(pd.to_datetime(df[col], errors='coerce').dropna()) > len(df[col]) * 0.8:
                    date_cols.append(col)
                    categorical_cols.remove(col)
            except:
                pass

        # Calculate basic stats
        total_rows = len(df)
        total_columns = len(df.columns)
        total_missing = int(df.isnull().sum().sum())
        total_cells = total_rows * total_columns
        completeness = round((1 - total_missing / total_cells) * 100, 1) if total_cells > 0 else 100

        # FIX: profiled/considered column lists, used both to build each
        # section AND to report truncation honestly in the response.
        histogram_cols = numeric_cols[:MAX_HISTOGRAM_COLUMNS]
        frequency_cols = categorical_cols[:MAX_FREQUENCY_COLUMNS]
        outlier_cols_considered = numeric_cols[:MAX_OUTLIER_COLUMNS]
        correlation_cols = numeric_cols[:MAX_CORRELATION_COLUMNS]

        # Build histograms for numeric columns
        histograms = {}
        for col in histogram_cols:
            non_null = df[col].dropna()
            if len(non_null) > 0:
                hist, bin_edges = np.histogram(non_null, bins=10)
                histograms[col] = {
                    "bins": [f"{bin_edges[i]:.1f}-{bin_edges[i+1]:.1f}" for i in range(len(bin_edges)-1)],
                    "counts": hist.tolist(),
                    "min": float(non_null.min()),
                    "max": float(non_null.max()),
                    "mean": float(non_null.mean()),
                    "median": float(non_null.median()),
                    "std": float(non_null.std())
                }
        
        # Build frequency tables for categorical columns
        frequencies = {}
        for col in frequency_cols:
            non_null = df[col].dropna()
            if len(non_null) > 0:
                value_counts = non_null.value_counts()
                total = len(non_null)
                frequencies[col] = {
                    "values": value_counts.head(10).index.tolist(),
                    "counts": value_counts.head(10).values.tolist(),
                    "percentages": [(v / total * 100) for v in value_counts.head(10).values]
                }
        
        # Build missing by column
        missing_by_column = []
        for col in df.columns:
            missing_count = int(df[col].isna().sum())
            missing_percent = round(missing_count / total_rows * 100, 2) if total_rows > 0 else 0
            missing_by_column.append({
                "name": col,
                "missingCount": missing_count,
                "missingPercent": missing_percent
            })
        missing_by_column.sort(key=lambda x: x["missingPercent"], reverse=True)

        # Build outliers detection
        outliers = {}
        for col in outlier_cols_considered:
            non_null = df[col].dropna()
            if len(non_null) > 0:
                Q1 = non_null.quantile(0.25)
                Q3 = non_null.quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                outlier_values = non_null[(non_null < lower_bound) | (non_null > upper_bound)]
                if len(outlier_values) > 0:
                    outliers[col] = {
                        "count": len(outlier_values),
                        "values": outlier_values.head(10).tolist()
                    }
        
        # Build insights
        insights = []
        
        high_missing_cols = [c for c in missing_by_column if c["missingPercent"] > 20]
        if high_missing_cols:
            insights.append({
                "type": "warning",
                "title": "High Missing Values Detected",
                "description": f"{len(high_missing_cols)} columns have more than 20% missing values.",
                "recommendation": "Use the Cleaner page to fill missing values"
            })
        
        duplicates_count = df.duplicated().sum()
        if duplicates_count > 0:
            insights.append({
                "type": "warning",
                "title": "Duplicate Rows Found",
                "description": f"{duplicates_count} duplicate rows detected in the dataset.",
                "recommendation": "Use Smart Clean to remove duplicates"
            })

        outlier_col_names = [col for col, data in outliers.items() if data["count"] > 0]
        if outlier_col_names:
            insights.append({
                "type": "info",
                "title": "Outliers Detected",
                "description": f"{len(outlier_col_names)} columns contain outliers that may skew analysis.",
                "recommendation": "Consider capping outliers or using robust statistics"
            })
        
        if completeness > 95:
            insights.append({
                "type": "success",
                "title": "Excellent Data Quality",
                "description": f"Your data is {completeness}% complete with minimal issues.",
                "recommendation": "Ready for analysis and modeling"
            })
        elif completeness < 80:
            insights.append({
                "type": "warning",
                "title": "Data Quality Needs Improvement",
                "description": f"Data completeness is only {completeness}%.",
                "recommendation": "Run Smart Clean to improve data quality"
            })

        # FIX: previously silent about coverage. If more numeric columns
        # exist than were actually considered for correlation/outliers/
        # histograms, that's now surfaced as an explicit insight too —
        # not just buried in a response field nobody reads.
        if len(numeric_cols) > MAX_HISTOGRAM_COLUMNS:
            insights.append({
                "type": "info",
                "title": "Analysis Limited to a Subset of Columns",
                "description": (
                    f"This dataset has {len(numeric_cols)} numeric columns, but detailed "
                    f"statistics (histograms, outliers) are shown for the first "
                    f"{MAX_HISTOGRAM_COLUMNS} only."
                ),
                "recommendation": "Reorder or select specific columns if you need analysis of the remaining columns"
            })
        
        # Build correlation matrix
        correlations = []
        if len(correlation_cols) >= 2:
            corr_matrix = df[correlation_cols].corr()
            for i in range(len(corr_matrix.columns)):
                for j in range(i+1, len(corr_matrix.columns)):
                    col1 = corr_matrix.columns[i]
                    col2 = corr_matrix.columns[j]
                    corr_value = corr_matrix.iloc[i, j]
                    if abs(corr_value) > 0.3:
                        correlations.append({
                            "col1": col1,
                            "col2": col2,
                            "correlation": float(corr_value)
                        })

        # Build type distribution
        type_distribution = [
            {"type": "Numeric", "count": len(numeric_cols), "color": "#6366f1"},
            {"type": "Categorical", "count": len(categorical_cols), "color": "#8b5cf6"},
            {"type": "Date", "count": len(date_cols), "color": "#10b981"},
            {"type": "Text", "count": len([c for c in df.columns if c not in numeric_cols and c not in categorical_cols and c not in date_cols]), "color": "#f59e0b"}
        ]

        # FIX: explicit, structured truncation report — this is the
        # actual fix. The frontend (or a verbal answer in a viva) can
        # now say precisely "10 of 15 numeric columns shown" instead of
        # the previous silent drop.
        truncation_info = {
            "histograms": {
                "shown": len(histogram_cols),
                "total": len(numeric_cols),
                "truncated": len(numeric_cols) > MAX_HISTOGRAM_COLUMNS
            },
            "frequencies": {
                "shown": len(frequency_cols),
                "total": len(categorical_cols),
                "truncated": len(categorical_cols) > MAX_FREQUENCY_COLUMNS
            },
            "outliers": {
                "shown": len(outlier_cols_considered),
                "total": len(numeric_cols),
                "truncated": len(numeric_cols) > MAX_OUTLIER_COLUMNS
            },
            "correlations": {
                "shown": len(correlation_cols),
                "total": len(numeric_cols),
                "truncated": len(numeric_cols) > MAX_CORRELATION_COLUMNS
            }
        }
        
        response = {
            "summary": {
                "totalRows": total_rows,
                "totalColumns": total_columns,
                "numericColumns": len(numeric_cols),
                "categoricalColumns": len(categorical_cols),
                "dateColumns": len(date_cols),
                "totalMissing": total_missing,
                "completeness": completeness,
                "duplicateRows": int(duplicates_count)
            },
            "histograms": histograms,
            "frequencies": frequencies,
            "correlations": correlations,
            "missingByColumn": missing_by_column,
            "outliers": outliers,
            "insights": insights,
            "numericCols": numeric_cols,
            "categoricalCols": categorical_cols,
            "typeDistribution": type_distribution,
            "truncationInfo": truncation_info
        }
        
        print(f"✅ Analysis complete: {len(numeric_cols)} numeric, {len(categorical_cols)} categorical columns")
        return JSONResponse(content=convert_to_serializable(response))
        
    except Exception as e:
        print(f"❌ Analysis error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error analyzing data: {str(e)}")