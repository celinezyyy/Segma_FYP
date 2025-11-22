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
        df.loc[:, 'orderid'] = df['orderid'].astype(str).str.strip().str.upper()
        
        # Convert empty string back to NaN
        df.loc[df['orderid'] == '', 'orderid'] = np.nan
        
        print("[LOG - STAGE 3] OrderID column standardized (empty -> NaN)")
    else:
        print("[LOG - STAGE 3] OrderID column not found, skipping")
    return df

def standardize_purchase_item(df):
    """"Standardize Purchase Item names (NaN preserved)"""
    print("[LOG - STAGE 3] Running standardized_purchase_item...")
    if "purchase item" in df.columns:
        mask = df["purchase item"].notna()
        df.loc[mask, "purchase item"] = (
            df.loc[mask, "purchase item"]
            .astype(str)
            .str.strip()
            .str.title()
        )
        df.loc[df["purchase item"].str.strip() == "", "purchase item"] = np.nan
        print("[LOG - STAGE 3] Purchase Item standardized, NaN preserved")
    else:
        print("[LOG - STAGE 3] 'purchase item' column not found, skipping")
    return df

def standardize_purchase_date(df):
    """Standardize Purchase Date into separate date and time columns(NaT preserved)"""
    print("[LOG - STAGE 3] Running standardize_purchase_date...")
    message = None
    if "purchase date" in df.columns:
        # Ensure df is a deep copy (prevents SettingWithCopyWarning)
        df = df.copy()
        
        # Clean values
        df.loc[df["purchase date"].notna(), "purchase date"] = df.loc[df["purchase date"].notna(), "purchase date"].astype(str).str.strip()

        # Convert to datetime
        df.loc[:, "purchase datetime"] = pd.to_datetime(
            df["purchase date"], errors="coerce", dayfirst=True
        )

        # Detect which rows have time info
        has_time_mask = df["purchase date"].notna() & df["purchase date"].str.contains(":", regex=False)
        
        # Create standardized columns
        df.loc[:, "purchase date"] = df["purchase datetime"].dt.strftime("%Y-%m-%d")
        df.loc[:, "purchase date"] = df["purchase date"].replace("NaT", pd.NA)
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
    print("[LOG - STAGE 3] Purchase date standardization complete, NaN preserved.")
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

            print(f"[LOG - STAGE 3] {col} standardized: numeric, 2 decimal places, NaN preserved")
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

        print("[LOG - STAGE 3] Purchase quantity standardized to integer format, NaN preserved")
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
    
    # Step1: Only process non-null values
    mask_notna = df["transaction method"].notna()
    df.loc[mask_notna, "transaction method"] = (
        df.loc[mask_notna, "transaction method"].astype(str).str.lower().str.strip()
    )
    
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

    mask_unmatched = mask_notna & ~df["transaction method"].isin(patterns.keys())
    df.loc[mask_unmatched, "transaction method"] = pd.NA

    print("[LOG - STAGE 3] Transaction method standardized successfully, NaN preserved.")
    return df

# ============================================= (ORDER DATASET) STAGE 4: MISSING VALUE HANDLING =============================================
def handle_missing_values_order(df):
    """
    Strategy (for SME context):
    - Drop rows if (orderid, customerid, purchase date) are missing
    - Drop rows if (purchase time) is missing (when time column exists)
    - Drop rows if (purchase item) is missing (important for segmentation analysis)
    - Drop rows if both (item price and total spend) are missing
    - Drop rows if (item price) is missing (critical for calculations)
    - Fill or calculate non-critical missing fields logically:
        - purchase quantity: calculate from (total spend / item price) if possible, otherwise fill with 1
        - total spend: calculate from (item price × quantity) if possible, otherwise drop row
        - transaction method: fill with "Unknown"
    """

    initial_count = len(df)
    messages = []
    stats = {
        "critical_ids_removed": 0,
        "purchase_time_removed": 0,
        "no_financial_removed": 0,
        "item_price_removed": 0,
        "total_spend_removed": 0,
        "qty_calculated": 0,
        "total_spend_calculated": 0,
        "transaction_method_filled": 0
    }

    # Drop rows missing critical identifiers (orderid, customerid, purchase date, purchase item)
    critical_cols = ["orderid", "customerid", "purchase date", "purchase item"]
    existing_critical = [c for c in critical_cols if c in df.columns]
    before_critical = len(df)
    df = df.dropna(subset=existing_critical)
    stats["critical_ids_removed"] = before_critical - len(df)
    print(f"[LOG - STAGE 4] Dropped {stats['critical_ids_removed']} rows with missing critical identifiers (OrderID, CustomerID, Purchase Date, Purchase Item)")
    
    if "purchase time" in df.columns:
        # Drop rows where purchase time is null
        before_drop = len(df)
        df = df.dropna(subset=["purchase time"])
        stats["purchase_time_removed"] = before_drop - len(df)
        print(f"[LOG - STAGE 4] Dropped {stats['purchase_time_removed']} rows with missing purchase time")

    # Drop rows missing both financial info
    before_financial = len(df)
    df = df.dropna(subset=["item price", "total spend"], how="all")
    stats["no_financial_removed"] = before_financial - len(df)
    print(f"[LOG - STAGE 4] Dropped {stats['no_financial_removed']} rows with no financial info")

    for col in ["item price", "total spend"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.replace(r"[^\d\.\-]", "", regex=True)
            df[col] = pd.to_numeric(df[col], errors="coerce").round(2)
            
            # Remove zero or negative values that are logically impossible
            df.loc[df[col] <= 0, col] = np.nan
            zero_count = df[col].isna().sum()
            if zero_count > 0:
                print(f"[WARN - STAGE 4] {zero_count} rows in '{col}' are zero or invalid and set to NaN")

    # Handle purchase quantity: calculate if possible
    if "purchase quantity" in df.columns:
        mask_missing_qty = df['purchase quantity'].isna() & df['total spend'].notna() & df['item price'].notna()
        calculated_count = mask_missing_qty.sum()
        df.loc[mask_missing_qty, 'purchase quantity'] = (df.loc[mask_missing_qty, 'total spend'] / df.loc[mask_missing_qty, 'item price']).round(0).astype('Int64')
        stats["qty_calculated"] = calculated_count
        # Remaining missing → 1 as fallback
        df['purchase quantity'] = df['purchase quantity'].fillna(1)

    # Handle item price - but very rare happened so I decided to simply drop that row
    if "item price" in df.columns:
        before_drop = len(df)
        df = df.dropna(subset=["item price"])
        stats["item_price_removed"] = before_drop - len(df)
        print(f"[LOG - STAGE 4] Dropped {stats['item_price_removed']} rows with missing 'item price' (critical for calculations)")

    # Handle total spend
    if {"item price", "purchase quantity", "total spend"}.issubset(df.columns):
        mask_missing_total = df["total spend"].isna() & df["item price"].notna() & df["purchase quantity"].notna()
        calculated_total_count = mask_missing_total.sum()
        df.loc[mask_missing_total, "total spend"] = (
            df.loc[mask_missing_total, "item price"] * df.loc[mask_missing_total, "purchase quantity"]
        ).round(2)
        stats["total_spend_calculated"] = calculated_total_count
        # Any remaining missing → drop (very rare)
        before_drop = len(df)
        df = df.dropna(subset=["total spend"])
        stats["total_spend_removed"] = before_drop - len(df)
        print(f"[LOG - STAGE 4] Dropped {stats['total_spend_removed']} rows with missing 'total spend' after calculation")

    # Transaction method → Unknown
    if "transaction method" in df.columns:
        before_fill = df["transaction method"].isna().sum()
        df["transaction method"] = df["transaction method"].replace(["", "NaN", None], np.nan)
        df["transaction method"] = df["transaction method"].fillna("Unknown")
        stats["transaction_method_filled"] = before_fill

    # Build message
    dropped_total = initial_count - len(df)
    
    if dropped_total > 0:
        messages.append(f"{dropped_total} order(s) removed due to missing critical information:")
        if stats["critical_ids_removed"] > 0:
            messages.append(f"  - {stats['critical_ids_removed']} order(s) without OrderID, CustomerID, Purchase Date, or Purchase Item")
        if stats["purchase_time_removed"] > 0:
            messages.append(f"  - {stats['purchase_time_removed']} order(s) without Purchase Time")
        if stats["no_financial_removed"] > 0:
            messages.append(f"  - {stats['no_financial_removed']} order(s) without any price or total spend information")
        if stats["item_price_removed"] > 0:
            messages.append(f"  - {stats['item_price_removed']} order(s) without Item Price (needed for calculations)")
        if stats["total_spend_removed"] > 0:
            messages.append(f"  - {stats['total_spend_removed']} order(s) without Total Spend even after calculation")
    
    calculation_msgs = []
    if stats["qty_calculated"] > 0:
        calculation_msgs.append(f"  - Calculated Purchase Quantity for {stats['qty_calculated']} order(s) using Total Spend / Item Price")
    if stats["total_spend_calculated"] > 0:
        calculation_msgs.append(f"  - Calculated Total Spend for {stats['total_spend_calculated']} order(s) using Item Price x Quantity")
    if stats["transaction_method_filled"] > 0:
        calculation_msgs.append(f"  - Filled {stats['transaction_method_filled']} missing Transaction Method(s) with 'Unknown'")
    
    if calculation_msgs:
        messages.append("\nData Filled/Calculated:")
        messages.extend(calculation_msgs)
    
    if not messages:
        final_message = "All order records have complete information. No missing values found."
    else:
        final_message = "Missing Value Handling Summary:\n\n" + "\n".join(messages)
    
    # Final summary
    print(f"[LOG - STAGE 4] Dropped total {dropped_total} rows ({dropped_total/initial_count:.2%}) due to missing critical data")
    print(f"[LOG - STAGE 4] Dataset now has {len(df)} rows after missing value handling")

    return df, final_message

# ============================================= (ORDER DATASET) STAGE 5: OUTLIER DETECTION =============================================
def order_detect_outliers(df):
    """
    Stage 5: Detect and flag outliers for order dataset (NO capping/replacement).
    - Apply IQR method if dataset < 500 rows.
    - Apply percentile method (1st–99th) if dataset >= 500 rows.
    - Columns: purchase quantity, total spend.
    - Outliers are FLAGGED only, original values preserved.
    """
    print(f"[LOG - STAGE 5] Dataset has {len(df)} rows")

    numeric_cols = ["purchase quantity", "total spend"]
    df = df.copy()
    
    messages = []
    outlier_info = []
    dataset_size = len(df)
    
    # Initialize flag columns
    df['is_quantity_outlier'] = False
    df['is_spend_outlier'] = False
    
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
            method = "IQR method"
        else:
            # Percentile Method
            lower = df[col].quantile(0.01)
            upper = df[col].quantile(0.99)
            method = "Percentile method"

        # Flag outliers (do NOT modify original values)
        outlier_mask = (df[col] < lower) | (df[col] > upper)
        outliers_count = outlier_mask.sum()
        
        # Set appropriate flag column
        if col == "purchase quantity":
            df.loc[outlier_mask, 'is_quantity_outlier'] = True
        elif col == "total spend":
            df.loc[outlier_mask, 'is_spend_outlier'] = True
        
        print(f"[LOG - STAGE 5] {method} applied on '{col}'. Range: [{lower:.2f}, {upper:.2f}]. Outliers flagged: {outliers_count}")
        
        if outliers_count > 0:
            col_display = col.replace('_', ' ').title()
            outlier_info.append(f"  - {col_display}: {outliers_count} unusual value(s) detected (may indicate high-value customers)")

    # Build message
    if outlier_info:
        messages.append("Unusual Values Detected:")
        messages.append("\nWe found some extremely high or low values in your order data.")
        messages.append("\nWhat we did: Flagged these values for your attention. Original values are preserved.")
        messages.append("\nDetails:")
        messages.extend(outlier_info)
        messages.append("\nNote: These outliers might represent VIP customers or bulk buyers. They will be considered during segmentation to help identify high-value customer groups.")
    else:
        messages.append("Order Values Look Good:")
        messages.append("\nAll order values (quantities and amounts) appear normal and consistent. No unusual values detected.")

    final_message = "\n".join(messages)
    
    print("✅ [STAGE 5 COMPLETE] Outliers flagged successfully (values preserved).")
    return df, final_message

# ============================================= (ORDER DATASET) DATASET CLEANING PIPELINE =============================================
def clean_order_dataset(df, cleaned_output_path):
    print("🚀 Starting order data cleaning pipeline...\n")
    messages = [] 
    report = {"summary": {}, "detailed_messages": {}}
    
    # Capture initial row count before cleaning
    initial_row_count = len(df)
    report["summary"]["initial_rows"] = initial_row_count
    
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
    df, mandatory_msg = check_mandatory_columns(df, dataset_type="order", mandatory_columns=order_mandatory)
    messages.append(mandatory_msg)
    report["detailed_messages"]["check_mandatory_columns"] = mandatory_msg
    print(mandatory_msg)
    print("✅ [STAGE 1 COMPLETE] Schema validation done.\n")
    
    # ============================================================
    # STAGE 2: REMOVE DUPLICATE ENTRY ROWS (FROM GENERIC FUNCTION)
    # ============================================================
    print("========== [STAGE 2 START] Remove Duplicate Entry Rows ==========")
    initial_rows = len(df)
    df, message = remove_duplicate_entries(df)
    messages.append(message)
    report["detailed_messages"]["remove_duplicate_entries"] = message
    report["summary"]["duplicates_removed_rows"] = initial_rows - len(df)
    print("✅ [STAGE 2 COMPLETE] Duplicate entries removed.\n")
    
    # =============================================
    # STAGE 3: STANDARDIZATION & NORMALIZATION
    # =============================================
    print("========== [STAGE 3 START] Standardization & Normalization ==========")
    df = standardized_order_id(df)
    df = standardize_customer_id(df)
    df = standardize_purchase_item(df)
    df, standardize_purchaseDateMessage = standardize_purchase_date(df)
    messages.append(standardize_purchaseDateMessage)
    report["detailed_messages"]["standardize_purchase_date"] = standardize_purchaseDateMessage
    df = standardized_item_price_and_total_spend(df)
    df = standardize_purchase_quantity(df)
    df = standardize_transaction_method(df)
    print("✅ [STAGE 3 COMPLETE] Standardization and normalization finished.\n")

    # ===============================================
    # STAGE 4: MISSING VALUE HANDLING
    # ===============================================
    print("========== [STAGE 4 START] Missing Value Handling ==========")
    df, missing_value_msg = handle_missing_values_order(df)
    messages.append(missing_value_msg)
    report["detailed_messages"]["handle_missing_values_order"] = missing_value_msg
    print("✅ [STAGE 4 COMPLETE] Missing values handled.\n")
    
    # =============================================
    # STAGE 5: OUTLIER DETECTION
    # =============================================
    print("========== [STAGE 5 START] Outlier Detection ==========")
    df, outlier_msg = order_detect_outliers(df)
    messages.append(outlier_msg)
    report["detailed_messages"]["order_detect_outliers"] = outlier_msg
    print("✅ [STAGE 5 COMPLETE] Outliers handled.\n")
    
    # final profiling summary
    report["summary"].update({
        "total_rows_final": len(df),
        "total_columns_final": len(df.columns),
        "final_columns": list(df.columns),  # Add list of remaining column names
    })
    # =============================================
    # SAVE CLEANED DATASET
    # =============================================
    print("========== [FINAL STAGE START] Save Cleaned Dataset ==========")
    # base_name, ext = os.path.splitext(original_order_dataset_name)
    df.to_csv(cleaned_output_path, index=False)
    print(f"✅ [FINAL STAGE COMPLETE] Cleaned dataset saved at: {cleaned_output_path}\n")

    print("==========================================================")
    print("🎉 Data cleaning pipeline completed successfully!\n")
    return df, report
    # later add on return clean file name