# backend/app/api/routes/charts.py
# Chart Generation Endpoint - Beautiful charts for Analysis Page

import os
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend for server
import matplotlib.pyplot as plt
import seaborn as sns
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from io import BytesIO
import base64
from typing import List, Optional, Dict, Any
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

from app.config import settings

router = APIRouter()

# Set professional style for all charts
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette("husl")
sns.set_style("whitegrid")

# Professional color palettes
COLOR_PALETTES = {
    "primary": ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"],
    "success": ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5"],
    "warning": ["#f59e0b", "#fbbf24", "#fcd34d", "#fde68a", "#fef3c7"],
    "error": ["#ef4444", "#f87171", "#fca5a5", "#fecaca", "#fee2e2"],
    "info": ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"],
    "mixed": ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6"]
}


def fig_to_base64(fig, dpi=100) -> str:
    """Convert matplotlib figure to base64 string for frontend"""
    buffer = BytesIO()
    fig.savefig(buffer, format='png', dpi=dpi, bbox_inches='tight', facecolor='white')
    buffer.seek(0)
    image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
    plt.close(fig)
    return image_base64


def create_histogram(df: pd.DataFrame, column: str, bins: int = 30) -> Optional[str]:
    """Create beautiful histogram for numeric column"""
    fig, ax = plt.subplots(figsize=(12, 7))
    
    data = df[column].dropna()
    if len(data) == 0:
        plt.close(fig)
        return None
    
    # Create histogram with styling
    n, bins, patches = ax.hist(data, bins=bins, edgecolor='white', linewidth=0.5, 
                                alpha=0.8, color=COLOR_PALETTES["primary"][0])
    
    # Color gradient based on frequency
    for patch, height in zip(patches, n):
        if height <= n.max() * 0.33:
            patch.set_facecolor(COLOR_PALETTES["primary"][0])
        elif height <= n.max() * 0.66:
            patch.set_facecolor(COLOR_PALETTES["primary"][1])
        else:
            patch.set_facecolor(COLOR_PALETTES["primary"][2])
    
    # Add mean and median lines
    mean_val = data.mean()
    median_val = data.median()
    ax.axvline(mean_val, color=COLOR_PALETTES["error"][0], linestyle='--', linewidth=2, label=f'Mean: {mean_val:.2f}')
    ax.axvline(median_val, color=COLOR_PALETTES["success"][0], linestyle='--', linewidth=2, label=f'Median: {median_val:.2f}')
    
    # Styling
    ax.set_title(f'Distribution of {column}', fontsize=16, fontweight='bold', pad=20)
    ax.set_xlabel(column, fontsize=12, fontweight='500')
    ax.set_ylabel('Frequency', fontsize=12, fontweight='500')
    ax.legend(loc='upper right', frameon=True, fancybox=True, shadow=True)
    ax.grid(True, alpha=0.3, linestyle='--')
    
    # Add statistics annotation
    stats_text = f"n = {len(data):,}\nStd = {data.std():.2f}\nMin = {data.min():.2f}\nMax = {data.max():.2f}"
    ax.text(0.98, 0.95, stats_text, transform=ax.transAxes,
            verticalalignment='top', horizontalalignment='right',
            bbox=dict(boxstyle='round', facecolor='white', alpha=0.8),
            fontsize=10, family='monospace')
    
    plt.tight_layout()
    return fig_to_base64(fig)


def create_boxplot(df: pd.DataFrame, column: str) -> Optional[str]:
    """Create beautiful boxplot for outlier detection"""
    fig, ax = plt.subplots(figsize=(10, 7))
    
    data = df[column].dropna()
    if len(data) == 0:
        plt.close(fig)
        return None
    
    # Create boxplot with styling
    bp = ax.boxplot(data, vert=True, patch_artist=True, widths=0.6,
                    boxprops=dict(facecolor=COLOR_PALETTES["info"][0], alpha=0.7, linewidth=1.5),
                    medianprops=dict(color=COLOR_PALETTES["error"][0], linewidth=2),
                    whiskerprops=dict(color=COLOR_PALETTES["gray"][0], linewidth=1.5),
                    capprops=dict(color=COLOR_PALETTES["gray"][0], linewidth=1.5),
                    flierprops=dict(marker='o', markerfacecolor=COLOR_PALETTES["warning"][0], 
                                   markersize=8, alpha=0.6, markeredgecolor='white'))
    
    # Add swarm plot overlay for individual points (if not too many)
    if len(data) <= 500:
        # Jittered points
        x_jitter = np.random.normal(1, 0.04, size=len(data))
        ax.scatter(x_jitter, data, alpha=0.3, color=COLOR_PALETTES["primary"][3], s=20)
    
    ax.set_title(f'Boxplot of {column}', fontsize=16, fontweight='bold', pad=20)
    ax.set_ylabel(column, fontsize=12, fontweight='500')
    ax.set_xticklabels([column])
    ax.grid(True, alpha=0.3, axis='y', linestyle='--')
    
    # Calculate outlier statistics
    Q1 = data.quantile(0.25)
    Q3 = data.quantile(0.75)
    IQR = Q3 - Q1
    outliers = data[(data < Q1 - 1.5 * IQR) | (data > Q3 + 1.5 * IQR)]
    
    if len(outliers) > 0:
        ax.text(0.98, 0.05, f"Outliers: {len(outliers)}", transform=ax.transAxes,
                verticalalignment='bottom', horizontalalignment='right',
                bbox=dict(boxstyle='round', facecolor=COLOR_PALETTES["warning"][0], alpha=0.8),
                fontsize=10, fontweight='bold')
    
    plt.tight_layout()
    return fig_to_base64(fig)


def create_correlation_heatmap(df: pd.DataFrame, numeric_cols: List[str]) -> Optional[str]:
    """Create beautiful correlation heatmap"""
    if len(numeric_cols) < 2:
        return None
    
    fig, ax = plt.subplots(figsize=(14, 12))
    
    # Calculate correlation matrix
    corr = df[numeric_cols].corr()
    mask = np.triu(np.ones_like(corr, dtype=bool))
    
    # Create heatmap
    sns.heatmap(corr, mask=mask, annot=True, fmt='.2f', cmap='RdBu_r',
                center=0, square=True, linewidths=1, linecolor='white',
                cbar_kws={"shrink": 0.8, "label": "Correlation Coefficient"},
                annot_kws={'size': 10, 'weight': 'bold'},
                ax=ax)
    
    ax.set_title('Correlation Matrix', fontsize=16, fontweight='bold', pad=20)
    
    plt.tight_layout()
    return fig_to_base64(fig, dpi=120)


def create_missing_heatmap(df: pd.DataFrame) -> Optional[str]:
    """Create beautiful missing values heatmap"""
    fig, ax = plt.subplots(figsize=(14, max(8, len(df.columns) * 0.3)))
    
    # Calculate missing percentage
    missing_pct = (df.isnull().sum() / len(df) * 100).sort_values(ascending=False)
    
    # Create heatmap of missing values
    sns.heatmap(df.isnull().T, cmap=['#10b981', '#ef4444'],
                cbar=False, ax=ax, yticklabels=True, 
                cbar_kws={'label': 'Missing'})
    
    ax.set_title('Missing Values Heatmap', fontsize=16, fontweight='bold', pad=20)
    ax.set_xlabel('Row Index', fontsize=12)
    ax.set_ylabel('Columns', fontsize=12)
    
    # Add missing percentage annotation on the right
    ax_right = ax.twinx()
    ax_right.set_yticks(range(len(df.columns)))
    ax_right.set_yticklabels([f"{missing_pct.get(col, 0):.1f}%" for col in df.columns], fontsize=8)
    ax_right.set_ylim(ax.get_ylim())
    
    plt.tight_layout()
    return fig_to_base64(fig)


def create_bar_chart(df: pd.DataFrame, column: str, top_n: int = 10) -> Optional[str]:
    """Create beautiful bar chart for categorical column"""
    fig, ax = plt.subplots(figsize=(12, 7))
    
    value_counts = df[column].value_counts().head(top_n)
    
    if len(value_counts) == 0:
        plt.close(fig)
        return None
    
    # Create horizontal bar chart for better readability
    colors = COLOR_PALETTES["primary"][:len(value_counts)]
    bars = ax.barh(range(len(value_counts)), value_counts.values, color=colors, edgecolor='white', linewidth=1)
    
    ax.set_yticks(range(len(value_counts)))
    ax.set_yticklabels(value_counts.index, fontsize=10)
    ax.set_xlabel('Count', fontsize=12, fontweight='500')
    ax.set_title(f'Top {top_n} Values in {column}', fontsize=16, fontweight='bold', pad=20)
    ax.grid(True, alpha=0.3, axis='x', linestyle='--')
    
    # Add value labels on bars
    for bar, val in zip(bars, value_counts.values):
        ax.text(bar.get_width() + 0.5, bar.get_y() + bar.get_height()/2,
                str(val), va='center', fontsize=10, fontweight='bold')
    
    # Add percentage annotation
    total = len(df[column].dropna())
    ax.text(0.98, 0.02, f"Total unique: {len(value_counts)}", transform=ax.transAxes,
            verticalalignment='bottom', horizontalalignment='right',
            bbox=dict(boxstyle='round', facecolor='white', alpha=0.8),
            fontsize=10)
    
    plt.tight_layout()
    return fig_to_base64(fig)


def create_pie_chart(df: pd.DataFrame, column: str, top_n: int = 6) -> Optional[str]:
    """Create beautiful pie chart for categorical column"""
    fig, ax = plt.subplots(figsize=(10, 8))
    
    value_counts = df[column].value_counts()
    
    if len(value_counts) == 0:
        plt.close(fig)
        return None
    
    # Group small categories into "Other"
    if len(value_counts) > top_n:
        top_values = value_counts.head(top_n - 1)
        other_sum = value_counts.iloc[top_n - 1:].sum()
        plot_data = pd.concat([top_values, pd.Series({'Other': other_sum})])
    else:
        plot_data = value_counts
    
    colors = COLOR_PALETTES["mixed"][:len(plot_data)]
    
    # Create donut chart (pie with hole)
    wedges, texts, autotexts = ax.pie(plot_data.values, 
                                        labels=plot_data.index,
                                        autopct='%1.1f%%',
                                        colors=colors,
                                        textprops={'fontsize': 10},
                                        pctdistance=0.85,
                                        startangle=90)
    
    # Draw circle in the middle to create donut
    centre_circle = plt.Circle((0, 0), 0.70, fc='white', linewidth=0)
    ax.add_artist(centre_circle)
    
    ax.set_title(f'Distribution of {column}', fontsize=16, fontweight='bold', pad=20)
    
    # Add total count annotation
    ax.text(0, 0, f"n={len(df[column].dropna()):,}", 
            ha='center', va='center', fontsize=14, fontweight='bold')
    
    plt.tight_layout()
    return fig_to_base64(fig)


def create_quality_gauge(quality_score: int) -> str:
    """Create beautiful quality gauge chart"""
    fig, ax = plt.subplots(figsize=(8, 6))
    
    # Determine color based on score
    if quality_score >= 80:
        colors = [COLOR_PALETTES["success"][0], '#e2e8f0']
        status = "Excellent"
    elif quality_score >= 60:
        colors = [COLOR_PALETTES["warning"][0], '#e2e8f0']
        status = "Good"
    else:
        colors = [COLOR_PALETTES["error"][0], '#e2e8f0']
        status = "Needs Attention"
    
    # Create donut chart
    sizes = [quality_score, 100 - quality_score]
    wedges, texts, autotexts = ax.pie(sizes, colors=colors, startangle=90,
                                        autopct='', wedgeprops={'width': 0.3})
    
    # Add center text
    centre_circle = plt.Circle((0, 0), 0.70, fc='white', linewidth=0)
    ax.add_artist(centre_circle)
    
    ax.text(0, 0, f"{quality_score}%", ha='center', va='center', fontsize=28, fontweight='bold')
    ax.text(0, -0.15, status, ha='center', va='center', fontsize=12, fontweight='500', color=colors[0])
    
    ax.set_title('Data Quality Score', fontsize=16, fontweight='bold', pad=20)
    
    plt.tight_layout()
    return fig_to_base64(fig)


def create_time_series(df: pd.DataFrame, date_col: str, value_col: str) -> Optional[str]:
    """Create beautiful time series chart"""
    fig, ax = plt.subplots(figsize=(14, 7))
    
    # Convert to datetime and sort
    df_date = df.copy()
    df_date[date_col] = pd.to_datetime(df_date[date_col], errors='coerce')
    df_date = df_date.dropna(subset=[date_col, value_col]).sort_values(date_col)
    
    if len(df_date) == 0:
        plt.close(fig)
        return None
    
    # Create time series plot
    ax.plot(df_date[date_col], df_date[value_col], 
            color=COLOR_PALETTES["primary"][0], linewidth=2, marker='o', markersize=4, alpha=0.7)
    
    # Add trend line
    if len(df_date) > 10:
        x_numeric = np.arange(len(df_date))
        z = np.polyfit(x_numeric, df_date[value_col], 1)
        p = np.poly1d(z)
        ax.plot(df_date[date_col], p(x_numeric), color=COLOR_PALETTES["error"][0], 
                linestyle='--', linewidth=2, label='Trend')
    
    ax.set_title(f'{value_col} over Time', fontsize=16, fontweight='bold', pad=20)
    ax.set_xlabel(date_col, fontsize=12, fontweight='500')
    ax.set_ylabel(value_col, fontsize=12, fontweight='500')
    ax.legend(loc='best')
    ax.grid(True, alpha=0.3, linestyle='--')
    
    plt.xticks(rotation=45)
    plt.tight_layout()
    return fig_to_base64(fig)


def create_scatter_plot(df: pd.DataFrame, x_col: str, y_col: str) -> Optional[str]:
    """Create beautiful scatter plot for correlation analysis"""
    fig, ax = plt.subplots(figsize=(10, 8))
    
    # Drop NaN values
    plot_df = df[[x_col, y_col]].dropna()
    
    if len(plot_df) == 0:
        plt.close(fig)
        return None
    
    # Create scatter plot with regression line
    sns.regplot(data=plot_df, x=x_col, y=y_col, ax=ax,
                scatter_kws={'alpha': 0.5, 'color': COLOR_PALETTES["primary"][0], 's': 30},
                line_kws={'color': COLOR_PALETTES["error"][0], 'linewidth': 2})
    
    # Calculate correlation
    corr = plot_df[x_col].corr(plot_df[y_col])
    
    ax.set_title(f'Correlation: {x_col} vs {y_col}', fontsize=16, fontweight='bold', pad=20)
    ax.set_xlabel(x_col, fontsize=12, fontweight='500')
    ax.set_ylabel(y_col, fontsize=12, fontweight='500')
    ax.grid(True, alpha=0.3, linestyle='--')
    
    # Add correlation annotation
    ax.text(0.05, 0.95, f"r = {corr:.3f}", transform=ax.transAxes,
            verticalalignment='top', horizontalalignment='left',
            bbox=dict(boxstyle='round', facecolor='white', alpha=0.8),
            fontsize=12, fontweight='bold')
    
    plt.tight_layout()
    return fig_to_base64(fig)


@router.get("/charts/{job_id}")
async def generate_charts(
    job_id: str,
    chart_type: str = "all",
    column: Optional[str] = None,
    x_column: Optional[str] = None,
    y_column: Optional[str] = None,
    bins: int = 30
):
    """
    Generate beautiful charts for the cleaned data
    
    - **job_id**: Job ID from upload endpoint
    - **chart_type**: Type of chart (histogram, boxplot, correlation, missing, bar, pie, scatter, timeseries, all)
    - **column**: Column name (required for histogram, boxplot, bar, pie)
    - **x_column**: X-axis column for scatter plot
    - **y_column**: Y-axis column for scatter plot
    - **bins**: Number of bins for histogram (default: 30)
    
    Returns base64 encoded images
    """
    
    # Find job directory
    job_dir = os.path.join(settings.UPLOAD_DIR, job_id)
    if not os.path.exists(job_dir):
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    # Find the cleaned file
    files = os.listdir(job_dir)
    cleaned_file = None
    for f in files:
        if f.startswith('cleaned_'):
            cleaned_file = f
            break
    
    if not cleaned_file:
        for f in files:
            if not f.startswith('cleaned_'):
                cleaned_file = f
                break
    
    if not cleaned_file:
        raise HTTPException(status_code=404, detail="No file found")
    
    file_path = os.path.join(job_dir, cleaned_file)
    file_ext = os.path.splitext(file_path)[1].lower()
    
    try:
        # Read the file
        if file_ext == '.csv':
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = df.select_dtypes(include=['object']).columns.tolist()
        
        charts = {}
        
        # Single chart types
        if chart_type == "histogram":
            if not column:
                raise HTTPException(status_code=400, detail="Column name required for histogram")
            if column not in numeric_cols:
                raise HTTPException(status_code=400, detail=f"Column '{column}' is not numeric")
            result = create_histogram(df, column, bins)
            if result:
                charts["histogram"] = result
        
        elif chart_type == "boxplot":
            if not column:
                raise HTTPException(status_code=400, detail="Column name required for boxplot")
            if column not in numeric_cols:
                raise HTTPException(status_code=400, detail=f"Column '{column}' is not numeric")
            result = create_boxplot(df, column)
            if result:
                charts["boxplot"] = result
        
        elif chart_type == "correlation":
            result = create_correlation_heatmap(df, numeric_cols)
            if result:
                charts["correlation"] = result
        
        elif chart_type == "missing":
            result = create_missing_heatmap(df)
            if result:
                charts["missing"] = result
        
        elif chart_type == "bar":
            if not column:
                raise HTTPException(status_code=400, detail="Column name required for bar chart")
            if column not in categorical_cols:
                raise HTTPException(status_code=400, detail=f"Column '{column}' is not categorical")
            result = create_bar_chart(df, column)
            if result:
                charts["bar"] = result
        
        elif chart_type == "pie":
            if not column:
                raise HTTPException(status_code=400, detail="Column name required for pie chart")
            if column not in categorical_cols:
                raise HTTPException(status_code=400, detail=f"Column '{column}' is not categorical")
            result = create_pie_chart(df, column)
            if result:
                charts["pie"] = result
        
        elif chart_type == "scatter":
            if not x_column or not y_column:
                raise HTTPException(status_code=400, detail="Both x_column and y_column required for scatter plot")
            if x_column not in numeric_cols:
                raise HTTPException(status_code=400, detail=f"Column '{x_column}' is not numeric")
            if y_column not in numeric_cols:
                raise HTTPException(status_code=400, detail=f"Column '{y_column}' is not numeric")
            result = create_scatter_plot(df, x_column, y_column)
            if result:
                charts["scatter"] = result
        
        elif chart_type == "quality":
            # Calculate quality score (mock for now, can be passed as parameter)
            quality_score = 75
            result = create_quality_gauge(quality_score)
            if result:
                charts["quality"] = result
        
        elif chart_type == "all":
            # Generate all available charts
            # Quality gauge
            quality_score = 75
            quality_result = create_quality_gauge(quality_score)
            if quality_result:
                charts["quality"] = quality_result
            
            # Missing heatmap
            missing_result = create_missing_heatmap(df)
            if missing_result:
                charts["missing"] = missing_result
            
            # Numeric column charts (first 5)
            for col in numeric_cols[:5]:
                hist_result = create_histogram(df, col, bins)
                if hist_result:
                    charts[f"histogram_{col}"] = hist_result
                box_result = create_boxplot(df, col)
                if box_result:
                    charts[f"boxplot_{col}"] = box_result
            
            # Correlation heatmap
            if len(numeric_cols) >= 2:
                corr_result = create_correlation_heatmap(df, numeric_cols)
                if corr_result:
                    charts["correlation"] = corr_result
            
            # Categorical column charts (first 3)
            for col in categorical_cols[:3]:
                bar_result = create_bar_chart(df, col)
                if bar_result:
                    charts[f"bar_{col}"] = bar_result
                pie_result = create_pie_chart(df, col)
                if pie_result:
                    charts[f"pie_{col}"] = pie_result
        
        return JSONResponse(content={
            "job_id": job_id,
            "chart_type": chart_type,
            "charts": charts,
            "message": f"Generated {len(charts)} charts successfully"
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating charts: {str(e)}")