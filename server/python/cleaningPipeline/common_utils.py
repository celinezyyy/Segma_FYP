# Step 1: Import libraries
# import pandas as pd
import numpy as np
# import os
# import pycountry
# import re
# import requests
# import time
# from datetime import datetime, date
# from fuzzywuzzy import process, fuzz

# ============================================ GENERIC FUNCTIONS ============================================ #

def normalize_columns_name(df):
    """Normalize column names: lowercase, strip spaces"""
    print("[LOG - STAGE 0] Running normalize_columns_name...")
    df.columns = df.columns.str.strip().str.lower()
    print(f"[LOG - STAGE 0] Columns after normalization: {list(df.columns)}")
    return df

def check_mandatory_columns(df, dataset_type, mandatory_columns, threshold=0.9):
    """
    Generic function to check mandatory columns for both Customer and Order datasets.
    - dataset_type: 'customer' or 'order'
    - mandatory_columns: list of required columns for that dataset
    - threshold: minimum acceptable fill ratio (default 0.8)
    """
    print(f"[LOG - STAGE 1] Running check_mandatory_columns for {dataset_type} dataset...")

    missing_report = []
    warning_columns = []

    # Step 1: Check each mandatory column
    for col in mandatory_columns:
        if col in df.columns:
            fill_ratio = df[col].notna().mean()
            print(f"[LOG - STAGE 1] Mandatory column '{col}' fill ratio: {fill_ratio:.2f}")
            missing_percent = (1 - fill_ratio) * 100
            missing_report.append(f"{col}: {missing_percent:.1f}% missing")

            if fill_ratio < threshold:
                warning_columns.append(col)
        else:
            print(f"[LOG - STAGE 1] Mandatory column '{col}' not found")
            missing_report.append(f"{col}: column not found (100% missing)")
            warning_columns.append(col)

    # Step 2: Generate message
    if warning_columns:
        # Bold and capitalize each column name in the warning list
        def _title_cap(s):
            return " ".join(w.capitalize() for w in str(s).split())

        formatted_cols = [f"**{_title_cap(col)}**" for col in warning_columns]
        warning_str = ", ".join(formatted_cols)
        warning_details = [report for report in missing_report if any(col in report for col in warning_columns)]
        
        # Check if location fields (city/state) are in warning (reserved for future use)
        location_warning = any(col in ['city', 'state'] for col in warning_columns)
        
        message = (
            f"⚠️ ATTENTION - The following field(s) is missing in many records: {warning_str}\n\n"
        )
        
        message += (
            f"\n🔴 STRONGLY RECOMMENDED:\n"
            f"Please REVIEW and REUPLOAD your source data with complete information!\n"
        )
        
    else:
        message = (
            f"✅ All Mandatory Fields Validated"
        )

    return df, message

def remove_duplicate_entries(df):
    """Remove duplicate rows, keeping the first occurrence"""
    print("[LOG - STAGE 2] Running remove_duplicate_entries...")
    initial_len = len(df)
    df = df.drop_duplicates(keep='first', ignore_index=True)
    removed_dup = initial_len - len(df)
    print(f"[LOG - STAGE 2] Removed {removed_dup} duplicate rows.")
    return df

def standardize_customer_id(df):
    """Standardize CustomerID format and keep null as NaN"""
    print("[LOG - STAGE 4] Running standardize_customer_id...")

    if 'customerid' in df.columns:
        # Convert to string, strip spaces
        df.loc[:, 'customerid'] = df['customerid'].astype(str).str.strip().str.upper()

        # Convert empty string back to NaN
        df.loc[df['customerid'] == '', 'customerid'] = np.nan

        print("[LOG - STAGE 4] CustomerID column standardized (empty -> NaN)")
    else:
        print("[LOG - STAGE 4] CustomerID column not found, skipping")

    return df
# Might have special case of dirty data exist such as "****", "1234....", "annbwbciwbciowb"
# not sure how to handle it (Currently will say bcs we focus on small business enterprise that have use digital system, so normally customerID will not have inconsistent format issue, even the inconsistant format exist, at the end this row will not be use as when we merge we cant found that customerID)
