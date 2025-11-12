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
        warning_str = ", ".join(warning_columns)
        warning_details = [report for report in missing_report if any(col in report for col in warning_columns)]
        
        # Check if location fields (city/state) are in warning
        location_warning = any(col in ['city', 'state'] for col in warning_columns)
        
        message = (
            f"⚠️ WARNING - Critical Data Gaps Detected:\n\n"
            f"The following MANDATORY field(s) have excessive missing values (>10%): {warning_str}\n\n"
        )
        if warning_details:
            message += "Missing Data Details:\n" + "\n".join(f"  • {d}" for d in warning_details) + "\n\n"
        
        message += (
            f"⚠️ Impact: Missing mandatory data can significantly reduce the accuracy of your {dataset_type} segmentation results.\n\n"
            f"How Missing Values Will Be Handled:\n"
        )
        
        # Add specific handling explanation based on dataset type and fields
        if dataset_type == "customer":
            message += (
                f"  • CustomerID: Rows without ID will be REMOVED (cannot be predicted)\n"
            )
            if location_warning:
                message += (
                    f"  • Location (City/State): Missing values will be filled using:\n"
                    f"      1. Geocoding API (if city known, find correct state)\n"
                    f"      2. Statistical mode (most frequent city/state in your data)\n"
                    f"      3. If both missing: use most common city-state pair\n"
                    f"    ⚠️ Note: This creates estimated data which may not reflect true customer locations\n"
                )
            message += (
                f"  • Demographics (Age/Gender): Missing values will be kept as 'Unknown' for segmentation\n"
            )
        elif dataset_type == "order":
            message += (
                f"  • OrderID/CustomerID: Rows without IDs will be REMOVED\n"
                f"  • Financial data (Item Price/Total Spend): Missing values will be calculated or rows removed\n"
                f"  • Other fields: Filled with statistical defaults or 'Unknown'\n"
            )
        
        message += (
            f"\n🔴 STRONGLY RECOMMENDED:\n"
            f"{'=' * 70}\n"
            f"Please REVIEW and REUPLOAD your source data with complete information!\n"
        )
        
        if location_warning:
            message += (
                f"\n⚠️ LOCATION DATA IS CRITICAL for accurate customer segmentation!\n"
                f"   Filling missing locations with statistical estimates may lead to:\n"
                f"   • Incorrect geographic segments\n"
                f"   • Misleading regional analysis\n"
                f"   • Poor targeting accuracy\n"
                f"\n   For best results, provide complete City and State information.\n"
            )
        
        message += f"{'=' * 70}\n"
        
    else:
        complete_details = "\n".join(f"  • {report}" for report in missing_report)
        message = (
            f"✅ All Mandatory Fields Validated:\n\n"
            f"All required {dataset_type} columns have sufficient data (≥90% filled) and are ready for cleaning.\n\n"
            f"Data Completeness:\n{complete_details}\n\n"
            f"Note: We already clean missing values in these columns during the cleaning process."
        )

    return df, message

def remove_duplicate_entries(df):
    """Remove duplicate rows, keeping the first occurrence"""
    print("[LOG - STAGE 2] Running remove_duplicate_entries...")
    initial_len = len(df)
    df = df.drop_duplicates(keep='first', ignore_index=True)
    removed_dup = initial_len - len(df)
    message = None
    if removed_dup > 0:
        message = (f"{removed_dup} duplicate records have found, we have removed it.")
    print(f"[LOG - STAGE 2] Removed {initial_len - len(df)} duplicate rows.")
    return df, message

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
