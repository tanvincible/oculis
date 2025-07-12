import pandas as pd
from typing import List, Dict, Tuple


class DataPreparationUtils:
    @staticmethod
    def validate_balance_sheet_format(df: pd.DataFrame) -> Tuple[bool, str]:
        """Validate that uploaded file has required columns"""
        required_cols = {"Company Name", "Year", "Metric", "Value"}

        if not required_cols.issubset(df.columns):
            missing = required_cols - set(df.columns)
            return False, f"Missing required columns: {missing}"

        return True, "Valid format"

    @staticmethod
    def clean_balance_sheet_data(df: pd.DataFrame) -> pd.DataFrame:
        """Clean and standardize balance sheet data"""
        df = df.dropna(subset=["Company Name", "Year", "Metric", "Value"])

        df["Company Name"] = df["Company Name"].str.strip()

        df["Year"] = pd.to_numeric(df["Year"], errors="coerce")
        df = df.dropna(subset=["Year"])
        df["Year"] = df["Year"].astype(int)

        df["Metric"] = df["Metric"].str.strip()

        df["Value"] = df["Value"].astype(str).str.strip()

        return df

    @staticmethod
    def create_company_summary_chunks(df: pd.DataFrame) -> List[Dict]:
        """Create summary chunks for each company-year combination"""
        summaries = []

        for (company, year), group in df.groupby(["Company Name", "Year"]):
            metrics = group.set_index("Metric")["Value"].to_dict()

            summary_text = f"{company} financial summary for {year}: "
            summary_parts = []

            for metric, value in metrics.items():
                summary_parts.append(f"{metric} was {value}")

            summary_text += "; ".join(summary_parts)

            summaries.append(
                {
                    "company": company,
                    "year": year,
                    "metric_name": "Annual Summary",
                    "value": summary_text,
                    "chunk": summary_text,
                }
            )

        return summaries
