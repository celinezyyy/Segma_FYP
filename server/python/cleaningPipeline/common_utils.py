# Step 1: Import libraries
# import pandas as pd
# import numpy as np
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
    print("[LOG] Running normalize_columns_name...")
    df.columns = df.columns.str.strip().str.lower()
    print(f"[LOG] Columns after normalization: {list(df.columns)}")
    return df

def check_mandatory_columns(df, dataset_type, mandatory_columns, threshold=0.8):
    """
    Generic function to check mandatory columns for both Customer and Order datasets.
    - dataset_type: 'customer' or 'order'
    - mandatory_columns: list of required columns for that dataset
    - threshold: minimum acceptable fill ratio (default 0.8)
    """
    print(f"[LOG] Running check_mandatory_columns for {dataset_type} dataset...")

    missing_report = []
    warning_columns = []

    # Step 1: Check each mandatory column
    for col in mandatory_columns:
        if col in df.columns:
            fill_ratio = df[col].notna().mean()
            print(f"[LOG] Mandatory column '{col}' fill ratio: {fill_ratio:.2f}")
            missing_percent = (1 - fill_ratio) * 100
            missing_report.append(f"{col}: {missing_percent:.1f}% missing")

            if fill_ratio < threshold:
                warning_columns.append(col)
        else:
            print(f"[LOG] Mandatory column '{col}' not found")
            missing_report.append(f"{col}: column not found (100% missing)")
            warning_columns.append(col)

    # Step 2: Generate message
    if warning_columns:
        warning_str = ", ".join(warning_columns)
        message = (
            f"Some key fields in the {dataset_type} dataset have a high number of missing values: {warning_str}. "
            "The system will continue cleaning and handle missing values automatically, "
            "but we STRONGLY encourage you to reupload your source data, ensure it was as complete as possible for accurate segmentation result later.\n\n"
            "Missing Data Summary:\n" + "\n".join(missing_report)
        )
    else:
        message = (
            f"All mandatory columns in the {dataset_type} dataset have sufficient data and are ready for cleaning.\n\n"
            "Missing Data Summary:\n" + "\n".join(missing_report)
        )

    return df, message

def remove_duplicate_entries(df):
    """Remove duplicate rows, keeping the first occurrence"""
    print("[LOG] Running remove_duplicate_entries...")
    initial_len = len(df)
    df = df.drop_duplicates(keep='first', ignore_index=True)
    removed_dup = initial_len - len(df)
    message = None
    if removed_dup > 0:
        message = (f"{removed_dup} duplicate rows have found, we have removed it.")
    print(f"[LOG] Removed {initial_len - len(df)} duplicate rows.")
    return df, message

def standardize_customer_id(df):
    """Standardize CustomerID format (null value is '')"""
    print("[LOG] Running standardize_customer_id...")
    if 'customerid' in df.columns:
        # Fill NaN with empty string before converting to string
        df.loc[:, 'customerid'] = df['customerid'].fillna('').astype(str).str.strip().str.upper()
        print("[LOG] CustomerID column standardized")
    else:
        print("[LOG] CustomerID column not found, skipping")
    return df
    # Might have special case of dirty data exist such as "****", "1234....", "annbwbciwbciowb"
    # not sure how to handle it (Currently will say bcs we focus on small business enterprise that have use digital system, so normally customerID will not have inconsistent format issue, even the inconsistant format exist, at the end this row will not be use as when we merge we cant found that customerID)
