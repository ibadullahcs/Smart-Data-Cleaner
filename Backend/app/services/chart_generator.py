# backend/app/services/chart_generator.py

import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np
from io import BytesIO
import base64
from typing import List, Optional, Dict, Any

# Set style
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette(["#667eea", "#764ba2", "#10b981", "#ef4444", "#f59e0b"])

class ChartGenerator:
    """Generate charts using Matplotlib and Seaborn"""
    
    def __init__(self, df: pd.DataFrame):
        self.df = df
        self.numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        self.categorical_cols = df.select_dtypes(include=['object']).columns.tolist()
    
    def _fig_to_base64(self, fig) -> str:
        """Convert matplotlib figure to base64 string"""
        buffer = BytesIO()
        fig.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
        plt.close(fig)
        return image_base64
    
    def histogram(self, column: str, bins: int = 30) -> str:
        """Generate histogram for a numeric column"""
        fig, ax = plt.subplots(figsize=(10, 6))
        
        data = self.df[column].dropna()
        if len(data) == 0:
            return None
        
        ax.hist(data, bins=bins, edgecolor='black', alpha=0.7, color='#667eea')
        ax.set_title(f'Distribution of {column}', fontsize=14, fontweight='bold')
        ax.set_xlabel(column, fontsize=12)
        ax.set_ylabel('Frequency', fontsize=12)
        ax.grid(True, alpha=0.3)
        
        # Add statistics annotation
        stats_text = f"Mean: {data.mean():.2f}\nMedian: {data.median():.2f}\nStd: {data.std():.2f}"
        ax.text(0.95, 0.95, stats_text, transform=ax.transAxes,
                verticalalignment='top', horizontalalignment='right',
                bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))
        
        return self._fig_to_base64(fig)
    
    def boxplot(self, column: str) -> str:
        """Generate boxplot for outlier detection"""
        fig, ax = plt.subplots(figsize=(10, 6))
        
        data = self.df[column].dropna()
        if len(data) == 0:
            return None
        
        bp = ax.boxplot(data, vert=True, patch_artist=True,
                        boxprops=dict(facecolor='#667eea', alpha=0.7),
                        flierprops=dict(marker='o', markerfacecolor='#ef4444', markersize=8))
        
        ax.set_title(f'Boxplot of {column}', fontsize=14, fontweight='bold')
        ax.set_ylabel(column, fontsize=12)
        ax.grid(True, alpha=0.3)
        
        # Calculate outliers
        Q1 = data.quantile(0.25)
        Q3 = data.quantile(0.75)
        IQR = Q3 - Q1
        outliers = data[(data < Q1 - 1.5 * IQR) | (data > Q3 + 1.5 * IQR)]
        
        if len(outliers) > 0:
            ax.text(0.95, 0.05, f"Outliers: {len(outliers)}", transform=ax.transAxes,
                    verticalalignment='bottom', horizontalalignment='right',
                    bbox=dict(boxstyle='round', facecolor='#fef3c7', alpha=0.8))
        
        return self._fig_to_base64(fig)
    
    def correlation_heatmap(self) -> str:
        """Generate correlation heatmap for numeric columns"""
        if len(self.numeric_cols) < 2:
            return None
        
        fig, ax = plt.subplots(figsize=(12, 10))
        
        corr = self.df[self.numeric_cols].corr()
        mask = np.triu(np.ones_like(corr, dtype=bool))
        
        sns.heatmap(corr, mask=mask, annot=True, fmt='.2f', cmap='coolwarm',
                    center=0, square=True, linewidths=0.5, ax=ax,
                    cbar_kws={"shrink": 0.8})
        
        ax.set_title('Correlation Matrix', fontsize=14, fontweight='bold')
        
        return self._fig_to_base64(fig)
    
    def missing_heatmap(self) -> str:
        """Generate missing values heatmap"""
        fig, ax = plt.subplots(figsize=(14, 8))
        
        missing_data = self.df.isnull()
        
        # Create heatmap of missing values
        sns.heatmap(missing_data.T, cmap=['#10b981', '#ef4444'],
                    cbar=False, ax=ax, yticklabels=True)
        
        ax.set_title('Missing Values Heatmap', fontsize=14, fontweight='bold')
        ax.set_xlabel('Row Index', fontsize=12)
        ax.set_ylabel('Columns', fontsize=12)
        
        # Add missing percentage annotation
        missing_pct = (self.df.isnull().sum() / len(self.df) * 100).sort_values(ascending=False)
        missing_text = "Missing percentages:\n" + "\n".join([f"{col}: {pct:.1f}%" for col, pct in missing_pct.head(10).items()])
        ax.text(1.02, 0.5, missing_text, transform=ax.transAxes,
                verticalalignment='center', fontsize=8,
                bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))
        
        return self._fig_to_base64(fig)
    
    def bar_chart(self, column: str, top_n: int = 10) -> str:
        """Generate bar chart for categorical column"""
        fig, ax = plt.subplots(figsize=(12, 6))
        
        value_counts = self.df[column].value_counts().head(top_n)
        
        bars = ax.bar(range(len(value_counts)), value_counts.values, color='#667eea', edgecolor='black')
        ax.set_xticks(range(len(value_counts)))
        ax.set_xticklabels(value_counts.index, rotation=45, ha='right')
        ax.set_title(f'Top {top_n} Values in {column}', fontsize=14, fontweight='bold')
        ax.set_xlabel(column, fontsize=12)
        ax.set_ylabel('Count', fontsize=12)
        
        # Add value labels on bars
        for bar, val in zip(bars, value_counts.values):
            ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5,
                    str(val), ha='center', va='bottom', fontsize=10)
        
        plt.tight_layout()
        return self._fig_to_base64(fig)
    
    def quality_gauge(self, quality_score: int) -> str:
        """Generate quality gauge chart"""
        fig, ax = plt.subplots(figsize=(8, 6), subplot_kw={'projection': 'polar'})
        
        # Create gauge
        theta = np.linspace(0, np.pi, 100)
        values = np.linspace(0, 100, 100)
        
        # Color based on score
        if quality_score >= 80:
            color = '#10b981'
        elif quality_score >= 60:
            color = '#f59e0b'
        else:
            color = '#ef4444'
        
        # Draw gauge
        ax.barh(0, quality_score, left=0, height=0.5, color=color, alpha=0.8)
        ax.barh(0, 100, left=0, height=0.5, color='#e2e8f0', alpha=0.3)
        
        ax.set_ylim(-0.5, 0.5)
        ax.set_yticks([])
        ax.set_xticks([0, 25, 50, 75, 100])
        ax.set_xticklabels(['0', '25', '50', '75', '100'])
        ax.set_title(f'Data Quality Score: {quality_score}%', fontsize=14, fontweight='bold', pad=20)
        
        return self._fig_to_base64(fig)

def generate_charts(df: pd.DataFrame, chart_type: str, column: str = None) -> Dict[str, Any]:
    """Main chart generation function"""
    generator = ChartGenerator(df)
    
    charts = {}
    
    if chart_type == "histogram" and column:
        charts["histogram"] = generator.histogram(column)
    elif chart_type == "boxplot" and column:
        charts["boxplot"] = generator.boxplot(column)
    elif chart_type == "correlation":
        charts["correlation"] = generator.correlation_heatmap()
    elif chart_type == "missing":
        charts["missing"] = generator.missing_heatmap()
    elif chart_type == "bar" and column:
        charts["bar"] = generator.bar_chart(column)
    elif chart_type == "all":
        # Generate all charts for numeric columns
        for col in generator.numeric_cols[:5]:  # Limit to 5 columns
            charts[f"histogram_{col}"] = generator.histogram(col)
            charts[f"boxplot_{col}"] = generator.boxplot(col)
        charts["correlation"] = generator.correlation_heatmap()
        charts["missing"] = generator.missing_heatmap()
    
    return charts