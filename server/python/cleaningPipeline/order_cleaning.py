# Step 1: Import libraries
from common_utils import normalize_columns_name, check_mandatory_columns, remove_duplicate_entries, standardize_customer_id;
import pandas as pd
import numpy as np
from datetime import datetime, date
from fuzzywuzzy import process, fuzz

# ============================================= (ORDER DATASET) STAGE 0: NORMALIZE COLUMN NAMES =============================================
# From Generic function: normalize_columns_name

# ============================================= (ORDER DATASET) STAGE 1: SCHEMA & COLUMN VALIDATION =============================================
# From Generic function

# ============================================= (ORDER DATASET) STAGE 2: REMOVE DUPLICATE ENTRY ROW =================================================
# From Generic function: remove_duplicate_entries

# ============================================= (ORDER DATASET) STAGE 3: STANDARDIZATION & NORMALIZATION =============================================
# From Generic function: standardize_customer_id

def standardized_order_id(df):
    """Standardize OrderID format (null is '')"""
    print("[LOG - STAGE 3] Running standardize_order_id...")
    if 'orderid' in df.columns:
        # Fill '' with empty string before converting to string
        df.loc[:, 'orderid'] = df['orderid'].fillna('').astype(str).str.strip().str.upper()
        print("[LOG - STAGE 3] OrderID column standardized")
    else:
        print("[LOG - STAGE 3] OrderID column not found, skipping")
    return df

def standardize_purchase_item(df):
    """"Standardize Purchase Item names (NaN preserved)"""
    print("[LOG - STAGE 3] Running standardized_purchase_item...")
    if "purchase item" in df.columns:
        df.loc[:, "purchase item"] = (
            df["purchase item"]
            .astype(str)
            .str.strip()
            .str.title()
        )
        print("[LOG - STAGE 3] Purchase item standardized")
    return df

def standardize_purchase_date(df):
    """Standardize Purchase Date into separate date and time columns(NaT preserved)"""
    print("[LOG - STAGE 3] Running standardize_purchase_date...")
    message = None
    if "purchase date" in df.columns:
        # Ensure df is a deep copy (prevents SettingWithCopyWarning)
        df = df.copy()
        
        # Clean values
        df.loc[:, "purchase date"] = df["purchase date"].astype(str).str.strip()

        # Convert to datetime
        df.loc[:, "purchase datetime"] = pd.to_datetime(
            df["purchase date"], errors="coerce", dayfirst=True
        )

        # Detect which rows have time info
        has_time_mask = df["purchase date"].str.contains(":", regex=False)

        # Create standardized columns
        df.loc[:, "purchase date"] = df["purchase datetime"].dt.strftime("%Y-%m-%d")
        df.loc[:, "purchase time"] = None
        df.loc[has_time_mask, "purchase time"] = (
            df.loc[has_time_mask, "purchase datetime"].dt.strftime("%H:%M:%S")
        )
        
        # Drop intermediate column
        df.drop(columns=["purchase datetime"], inplace=True, errors="ignore")
        
        if has_time_mask.any():
            message = (
                "Since your Purchase Date information have include time information, "
                "so a separate 'purchase time' column has been derived to be used for segmentation later."
            )
    else:
        print("[WARN - STAGE 3] 'purchase date' column not found, skipping.")
    print("[LOG - STAGE 3] Purchase date standardization complete.")
    return df, message

def standardized_item_price_and_total_spend(df):
    """
    Standardize 'item price' and 'total spend' columns in the dataset.

    Steps performed for each column:
    1. Remove all non-numeric characters except digits, decimal points, and negative signs
    (e.g., currency symbols like RM, $, MYR are removed)
    2. Convert the resulting strings to numeric values; invalid or non-convertible entries are set to NaN
    3. Round numeric values to 2 decimal places

    This ensures the columns are clean, numeric, and ready for analysis.
    """

    print("[LOG - STAGE 3] Running standardized_item_price_and_total_spend...")

    for col in ["item price", "total spend"]:
        if col in df.columns:
            # Step 1: Remove currency symbols and text
            df[col] = (
                df[col]
                .astype(str)
                .str.replace(r"[^\d\.\-]", "", regex=True)
            )

            # Step 2: Convert to numeric, coercing invalid values to NaN
            df[col] = pd.to_numeric(df[col], errors="coerce")

            # Step 3: Round to 2 decimal places
            df[col] = df[col].round(2)

            print(f"[LOG - STAGE 3] {col} standardized: numeric, 2 decimal places")
        else:
            print(f"[LOG - STAGE 3] '{col}' column not found, skipping")

    return df

def standardize_purchase_quantity(df):
    """Standardize Purchase Quantity to integer (NaN preserved)"""
    print("[LOG - STAGE 3] Running standardize_purchase_quantity...")

    if "purchase quantity" in df.columns:
        # Remove non-numeric characters (like pcs, x, units, etc.)
        df["purchase quantity"] = (
            df["purchase quantity"]
            .astype(str)
            .str.replace(r"[^\d\.\-]", "", regex=True)  # keep digits only
        )

        # Convert to numeric (NaN for invalid)
        df["purchase quantity"] = pd.to_numeric(df["purchase quantity"], errors="coerce")

        # Round any decimals (e.g. 2.5 → 2)
        df["purchase quantity"] = df["purchase quantity"].round(0).astype("Int64")

        print("[LOG - STAGE 3] Purchase quantity standardized to integer format")
    else:
        print("[LOG - STAGE 3] 'purchase quantity' column not found, skipping")

    return df

def standardize_transaction_method(df):
    """
    Standardize 'transaction method' into categories:
    ['Cash', 'Card', 'E-Wallet', 'Online Banking', 'Auto-Debit', 'Cheque']
    (Unknown represents missing values)
    """
    import re

    print("[LOG - STAGE 3] Running standardize_transaction_method...")

    if "transaction method" not in df.columns:
        print("[LOG - STAGE 3] 'transaction method' column not found, skipping.")
        return df

    # Step 1: Normalize text
    df["transaction method"] = (df["transaction method"].astype(str).str.lower().str.strip())

    # Step 2: Define patterns (non-capturing groups)
    patterns = {
        "Cash": r"\b(?:cash|tunai|otc|counter)\b",
        "Card": r"\b(?:card|visa|master|credit|debit|amex|credit.?debit)\b",
        "E-Wallet": r"\b(?:tng|touch\s*n\s*go|grab\s*pay|grabpay|boost|shopee\s*pay|shopeepay|spaylater|duitnow|ewallet|e-?wallet|qr|qr\s*pay|qrcode)\b",
        "Online Banking": r"\b(?:bank|transfer|fpx|online\s*payment|maybank2u|cimbclicks|duitnow\s*qr|public\s*bank)\b",
        "Auto-Debit": r"\b(?:auto.?debit|standing|recurring|subscription|auto\s*pay)\b",
        "Cheque": r"\b(?:cheque|cek|check)\b",
    }

    # Step 4: Apply vectorized regex matching
    for category, pattern in patterns.items():
        mask = df["transaction method"].str.contains(pattern, flags=re.IGNORECASE, na=False, regex=True)
        df.loc[mask, "transaction method"] = category
    
    # Step 5: Replace values that didn’t match anything
    valid_categories = list(patterns.keys())
    df.loc[~df["transaction method"].isin(valid_categories), "transaction method"] = "Unknown"

    print("[LOG - STAGE 3] Transaction method standardized successfully.")
    return df

# ============================================= (ORDER DATASET) STAGE 4: MISSING VALUE HANDLING =============================================
def handle_missing_values_order(df):
    """
    Strategy (for SME context):
    - Drop rows if critical identifiers are missing (orderid, customerid, purchase date)
    - Drop rows if both item price and total spend are missing
    - Fill or infer non-critical missing fields logically:
        - purchase item: "Unknown Item"
        - purchase quantity: 1
        - item price: median price
        - total spend: item_price * quantity (if available)
        - transaction method: "Unknown"
        - purchase time: "Unknown"
    """

    initial_count = len(df)

    # Drop rows missing critical identifiers
    critical_cols = ["orderid", "customerid", "purchase date"]
    existing_critical = [c for c in critical_cols if c in df.columns]
    df = df.dropna(subset=existing_critical)
    print(f"[LOG - STAGE 4] Dropped rows with missing critical identifiers: {initial_count - len(df)}")

    # Drop rows missing both financial info
    before_financial = len(df)
    df = df.dropna(subset=["item price", "total spend"], how="all")
    print(f"[LOG - STAGE 4] Dropped {before_financial - len(df)} rows with no financial info")

    # Fill non-critical fields
    if "purchase item" in df.columns:
        df["purchase item"] = df["purchase item"].fillna("Unknown Item")

    if "purchase quantity" in df.columns:
        df["purchase quantity"] = df["purchase quantity"].fillna(1)

    # Handle item price (replace with median)
    if "item price" in df.columns:
        median_price = df["item price"].median(skipna=True)
        df["item price"] = df["item price"].fillna(median_price)

    # Handle total spend (calculate or fallback)
    if {"item price", "purchase quantity", "total spend"}.issubset(df.columns):
        mask_missing_total = df["total spend"].isna()
        df.loc[mask_missing_total, "total spend"] = (
            df.loc[mask_missing_total, "item price"] * df.loc[mask_missing_total, "purchase quantity"]
        )
        # Fill any still missing values with median
        median_total = df["total spend"].median(skipna=True)
        df["total spend"] = df["total spend"].fillna(median_total)

    # Transaction method → Unknown
    if "transaction method" in df.columns:
        df["transaction method"] = df["transaction method"].replace(["", "NaN", None], np.nan)
        df["transaction method"] = df["transaction method"].fillna("Unknown")

    # Purchase time → Unknown
    if "purchase time" in df.columns:
        df["purchase time"] = df["purchase time"].fillna("Unknown")

    # Final summary
    dropped_total = initial_count - len(df)
    print(f"[LOG - STAGE 4] Dropped total {dropped_total} rows ({dropped_total/initial_count:.2%}) due to missing critical data")
    print(f"[LOG - STAGE 4] Dataset now has {len(df)} rows after missing value handling")

    return df

# ============================================= (ORDER DATASET) STAGE 5: OUTLIER DETECTION =============================================
def order_detect_outliers(df):
    """
    Stage 5: Handle outliers for order dataset.
    - Apply IQR method if dataset < 500 rows.
    - Apply percentile capping (1st–99th) if dataset >= 500 rows.
    - Columns: item price, purchase quantity, total spend.
    """
    print(f"[LOG - STAGE 5] Dataset has {len(df)} rows")

    numeric_cols = ["purchase quantity", "total spend"]
    df = df.copy()
    
    for col in numeric_cols:
        if col not in df.columns:
            continue

        if df[col].dropna().empty:
            print(f"[WARN - STAGE 5] {col} is empty or missing, skipping.")
            continue

        if len(df) < 500:
            # IQR Method
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            lower = Q1 - 1.5 * IQR
            upper = Q3 + 1.5 * IQR
            method = "IQR"
        else:
            # Percentile Capping
            lower = df[col].quantile(0.01)
            upper = df[col].quantile(0.99)
            method = "Percentile Capping"

        # Apply capping
        df[col] = df[col].clip(lower, upper)
        print(f"[LOG - STAGE 5] {method} applied on '{col}', capped between [{lower:.2f}, {upper:.2f}]")

    print("✅ [STAGE 5 COMPLETE] Outliers handled successfully.")
    return df

# ============================================= (ORDER DATASET) DATASET CLEANING PIPELINE =============================================
def clean_order_dataset(df, cleaned_output_path):
    print("🚀 Starting order data cleaning pipeline...\n")
    messages = []
    # =======================================================
    # STAGE 0: NORMALIZE COLUMN NAMES (FROM GENERIC FUNCTION)
    # =======================================================
    print("========== [STAGE 0 START] Normalize Column Names ==========")
    df = normalize_columns_name(df)
    print("✅ [STAGE 0 COMPLETE] Column names normalized.\n")
    
    # =============================================
    # STAGE 1: SCHEMA & COLUMN VALIDATION
    # =============================================
    print("========== [STAGE 1 START] Schema & Column Validation ==========")
    order_mandatory = ["orderid", "customerid", "purchase item", "purchase date", "item price", "purchase quantity", "total spend", "transaction method"]
    df, message = check_mandatory_columns(df, dataset_type="order", mandatory_columns=order_mandatory)
    messages.append(message)
    print(message)
    print("✅ [STAGE 1 COMPLETE] Schema validation done.\n")
    
    # ============================================================
    # STAGE 2: REMOVE DUPLICATE ENTRY ROWS (FROM GENERIC FUNCTION)
    # ============================================================
    print("========== [STAGE 2 START] Remove Duplicate Entry Rows ==========")
    df, message = remove_duplicate_entries(df)
    messages.append(message)
    print("✅ [STAGE 2 COMPLETE] Duplicate entries removed.\n")
    
    # =============================================
    # STAGE 3: STANDARDIZATION & NORMALIZATION
    # =============================================
    print("========== [STAGE 3 START] Standardization & Normalization ==========")
    df = standardized_order_id(df)
    df = standardize_customer_id(df)
    df = standardize_purchase_item(df)
    df, message = standardize_purchase_date(df)
    messages.append(message)
    df = standardized_item_price_and_total_spend(df)
    df = standardize_purchase_quantity(df)
    df = standardize_transaction_method(df)
    print("✅ [STAGE 3 COMPLETE] Standardization and normalization finished.\n")

    # ===============================================
    # STAGE 4: MISSING VALUE HANDLING
    # ===============================================
    print("========== [STAGE 4 START] Missing Value Handling ==========")
    df = handle_missing_values_order(df)
    print("✅ [STAGE 4 COMPLETE] Missing values handled.\n")
    
    # =============================================
    # STAGE 6: OUTLIER DETECTION
    # =============================================
    print("========== [STAGE 5 START] Outlier Detection ==========")
    df = order_detect_outliers(df)   # make sure detect_outliers returns df
    print("✅ [STAGE 5 COMPLETE] Outliers handled.\n")
    
    # =============================================
    # SAVE CLEANED DATASET
    # =============================================
    print("========== [FINAL STAGE START] Save Cleaned Dataset ==========")
    # base_name, ext = os.path.splitext(original_order_dataset_name)
    df.to_csv(cleaned_output_path, index=False)
    print(f"✅ [FINAL STAGE COMPLETE] Cleaned dataset saved at: {cleaned_output_path}\n")

    print("==========================================================")
    print("🎉 Data cleaning pipeline completed successfully!\n")
    return df, messages
    # later add on return clean file name