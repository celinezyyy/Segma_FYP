# Step 1: Import libraries
from common_utils import normalize_columns_name, check_mandatory_columns, remove_duplicate_entries, standardize_customer_id; 
import pandas as pd
import numpy as np
import os
import pycountry
import re
import requests
import time
from datetime import datetime, date
from fuzzywuzzy import process, fuzz

# ============================================= (CUSTOMER DATASET) STAGE 0: NORMALIZE COLUMN NAMES =============================================
# From Generic function: normalize_columns_name

# ============================================= (CUSTOMER DATASET) STAGE 1: SCHEMA & COLUMN VALIDATION =============================================
# Optional columns & Mandatory columns(FROM GENERIC FUNCTION - check_mandatory_columns)
def customer_check_optional_columns(df, threshold=0.8):
    """
    Check optional columns for fill percentage and drop columns that are mostly empty.
    Returns the modified DataFrame and a friendly message.
    """
    print("[LOG] Running customer_check_optional_columns...")
    optional_columns = ["date of birth", "gender"]
    dropped_columns = []
    missing_report = []

    for col in optional_columns:
        if col in df.columns:
            fill_ratio = df[col].notna().mean()
            missing_percent = (1 - fill_ratio) * 100
            missing_report.append(f"{col}: {missing_percent:.1f}% missing")
            print(f"[LOG] Optional column '{col}' fill ratio: {fill_ratio:.2f}")
            if fill_ratio < threshold:
                dropped_columns.append(col)
                df.drop(columns=[col], inplace=True)  # Drop the column immediately
                # df[col].count(): This counts the number of non-missing (non-null/non-NaN) values in the current column (col).
                # len(df): This gives the total number of rows in the DataFrame.
                # fill_ratio: The division calculates the proportion of filled (non-missing) values in that column. A ratio of 1.0 means the column is entirely filled; a ratio of 0.1 means 90% of the values are missing.
                print(f"[LOG] Dropped optional column '{col}' due to too many missing values")
        else:
            print(f"[LOG] Optional column '{col}' not found")
            missing_report.append(f"{col}: column not found (100% missing)")
            dropped_columns.append(col)

    # Generate user-friendly message
    if dropped_columns:
        dropped_str = ", ".join(dropped_columns)
        message = (
            f"We noticed that very few entries were provided for {dropped_str}. "
            "These columns have been removed. "
            "Segmentation will still be performed using geographic (City, State) "
            "and behavioral data (e.g., orders, purchase items, total spend).\n\n"
            "Missing Data Summary:\n" + "\n".join(missing_report)
        )
    else:
        message = (
            "All optional columns have enough data and are kept for analysis.\n\n"
            "Missing Data Summary:\n" + "\n".join(missing_report)
        )
    
    return df, message

# ============================================= (CUSTOMER DATASET) STAGE 2: REMOVE DUPLICATE ENTRY ROW =================================================
# From Generic function: remove_duplicate_entries

# ============================================= (CUSTOMER DATASET) STAGE 3: DEDUPLICATE =================================================
def deduplicate_customers(df):
    print("[LOG] Running deduplicate_customers...")
    if 'customerid' not in df.columns:
        print("[LOG] 'customerid' column missing, skipping deduplication")
        return df

    before_dup_id = len(df)
    def resolve_conflict(series):
        vals = series.dropna().unique()
        if len(vals) == 0:
            return pd.NA
        elif len(vals) == 1:
            return vals[0]
        else:
            return series.mode().iloc[0]

    # ⚡ Vectorized groupby instead of per-group loop
    df = df.groupby('customerid', as_index=False).agg(resolve_conflict)
    
    removed_dup_id = before_dup_id - len(df)
    if removed_dup_id > 0:
        message = (f"{removed_dup_id} duplicate CustomerIDs removed.")
    print("[LOG] Deduplication complete (vectorized)")
    return df, message

# ============================================= (CUSTOMER DATASET) STAGE 4: STANDARDIZATION & NORMALIZATION =============================================
# From Generic function: standardize_customer_id

def standardize_dob(df):
    """Standardize Date of Birth column and convert to YYYY-MM-DD"""
    print("[LOG] Running standardize_dob...")
    # Rename only 'date of birth' to 'dob'
    message = None
    df = df.rename(columns={'date of birth': 'dob'})  
    if 'dob' in df.columns:
        print("[LOG] DOB column found, parsing dates...")
        def parse_date(x):
            if pd.isnull(x):
                return pd.NaT
            for format in ("%d/%m/%Y", "%m-%d-%y", "%Y-%m-%d", "%d-%b-%Y", "%d-%m-%Y"):    
                try:
                    return datetime.strptime(str(x), format).date() # Final format: YYYY-MM-DD | 2025-10-15
                except Exception:
                    continue
            return pd.NaT  # If no valid format found
        df['dob'] = df['dob'].apply(parse_date)
        df['dob'] = pd.to_datetime(df['dob'])
        print("[LOG] DOB parsing complete. Invalid dates marked as NaT")
        message = (
            "Since your dataset includes a Date of Birth information, we derived two useful fields — "
            "'age' and 'age_group' — for segmentation purposes, and the original 'dob' column will be remove."
        )
    else:
        print("[LOG] DOB column not found, skipping")
    return df, message

    # %d/%m/%Y → 12/05/2000
    # %m-%d-%y → 05-12-00
    # %Y-%m-%d → 2000-05-12
    # %d-%b-%Y → 12-May-2000
    # %d-%m-%Y → 12-5-2000

# ===============================================================================

def derive_age_features(df):
    """Derive Age from DOB"""
    print("[LOG] Running derive_age_features...")
    if 'dob' in df.columns:
        today = date.today()
        df['age'] = df['dob'].apply(
            lambda x: today.year - x.year - ((today.month, today.day) < (x.month, x.day))
            if pd.notnull(x) else None
        )
        df['age'] = pd.to_numeric(df['age'], errors='coerce')
        print("[LOG] Age derived from DOB")
    else:
        print("[LOG] DOB column not found, skipping")
    return df
    # Example: ((today.month, today.day) < (x.month, x.day))
    # (10,15) < (12,1) → True (birthday in Dec is after Oct 15)
    # (10,15) < (10,16) → True (birthday tomorrow)
    # (10,15) < (5,20) → False (birthday already passed)

    # This function calculates each person’s age from their date of birth (dob) by subtracting their birth year from the current year and adjusting if their birthday hasn’t occurred yet this year.

# ===============================================================================

def derive_age_group(df):
    """Derive Age Group based on defined buckets"""
    print("[LOG] Running derive_age_group...")
    if 'age' in df.columns:
        def categorize_age(age):
            if pd.isnull(age):
                return 'Unknown'
            if age < 18: return 'Below 18'
            elif 18 <= age <= 24: return '18-24'
            elif 25 <= age <= 34: return '25-34'
            elif 35 <= age <= 44: return '35-44'
            elif 45 <= age <= 54: return '45-54'
            elif 55 <= age <= 64: return '55-64'
            else: return 'Above 65'
        df['age_group'] = df['age'].apply(categorize_age)
        print("[LOG] Age groups derived")
    else:
        print("[LOG] Age column not found, skipping")
    return df

# ===============================================================================

def drop_dob_after_age_derived(df):
    """Drop DOB column after deriving age and age_group"""
    print("[LOG] Running drop_dob_after_age_derived...")
    if 'dob' in df.columns:
        df = df.drop(columns=['dob'])
        print("[LOG] Dropped DOB column")
    else:
        print("[LOG] DOB column not found, skipping")
    return df

# =================================================================================

def standardize_gender(df):
    """Clean and standardize gender values"""
    print("[LOG] Running standardize_gender...")
    if 'gender' in df.columns:
        df['gender'] = (
            df['gender']
            .astype(str)
            .str.strip()
            .str.lower()
            .replace({
                'm': 'Male', 'male': 'Male', 'man': 'Male', 'boy': 'Male',
                'f': 'Female', 'female': 'Female', 'woman': 'Female', 'girl': 'Female'
            })
        )
        df.loc[~df['gender'].isin(['Male', 'Female']), 'gender'] = 'Unknown'
        print("[LOG] Gender standardized (vectorized)")
    else:
        print("[LOG] Gender column not found, skipping")
    return df

# ==================================================================================

def standardize_location(df):
    """Standardize City, and State fields"""
    print("[LOG] Running standardize_location...")
        
    # Helper function: detect suspicious city names
    def is_suspicious_city(name):
        if not name or name.strip() == '':
            return True
        name = str(name).strip()
        
        if len(name) < 2 or len(name) > 50: # Too short or too long
            return True
        
        if re.search(r'[^A-Za-z\s\'-]', name):  # Contains non-alphabetic or weird symbols   # letters, space, apostrophe, dash allowed
            return True
        
        if re.search(r'(.)\1{3,}', name):   # Repeated characters (e.g., "Ccciiiittty")
            return True
        return False

    # --- City ---
    if 'city' in df.columns:
        df['city'] = df['city'].fillna('').astype(str).str.title().str.strip()
        # Common city aliases (short forms, local spellings, etc.)
        city_alias_map = {
            "Kl": "Kuala Lumpur",
            "PJ": "Petaling Jaya",
        }
        # Apply alias replacements first
        df['city'] = df['city'].replace(city_alias_map)
        
        suspicious_mask = df['city'].apply(lambda x: is_suspicious_city(x) or x.lower() in ['others', 'other'])
        suspicious_count = suspicious_mask.sum()
        df.loc[suspicious_mask, 'city'] = 'Unknown'
        
        print(f"[LOG] Standardized 'city'. Suspicious/unknown entries set to 'Unknown': {suspicious_count}")
    else:
        print("[LOG] 'city' column not found, skipping city standardization")
    
    # --- State ---
    if 'state' in df.columns:
        # malaysia_states = ["Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan","Pahang", "Perak", "Perlis", "Pulau Pinang", "Sabah", "Sarawak", "Selangor", "Terengganu", "Kuala Lumpur", "Labuan", "Putrajaya"]
        malaysia_states = [sub.name for sub in pycountry.subdivisions if sub.country_code == 'MY']
        alias_map = {
            "Kuala Lumpur": "Wilayah Persekutuan Kuala Lumpur",
            "Kl": "Wilayah Persekutuan Kuala Lumpur",
            "Labuan": "Wilayah Persekutuan Labuan",
            "Putrajaya": "Wilayah Persekutuan Putrajaya"
        }

        df['state'] = df['state'].fillna('').astype(str).str.title().str.strip()
        # ⚡ Match only unique states once
        unique_states = df['state'].unique()
        state_map = {}
        for s in unique_states:
            s_clean = s.strip().title()

            if not s_clean or s_clean == 'Unknown':
                state_map[s] = 'Unknown'

            elif s_clean in alias_map:   # Check alias first
                state_map[s] = alias_map[s_clean]

            else:
                match, score = process.extractOne(s_clean, malaysia_states, scorer=fuzz.token_sort_ratio)
                state_map[s] = match if score >= 80 else 'Unknown'

        # Apply mapping to the dataframe
        df['state'] = df['state'].map(state_map)
        print("[LOG] State standardized (cached fuzzy matching)")
    else:
        print("[LOG] 'state' column not found, skipping state standardization")

    return df

# ============================================= (CUSTOMER DATASET) STAGE 5: MISSING VALUE HANDLING =============================================
def handle_missing_values_customer(df):
    print("[LOG] Running handle_missing_values...")

    API_KEY = "68f8ce9a38c3f632237334dyiedb96e"
    GEOCODE_URL = "https://geocode.maps.co/search"
    SLEEP_TIME = 1.2
    cache = {}  # ⚡ moved outside loops

    # --- Drop rows without ID ---
    if 'customerid' in df.columns:
        before_drop = len(df)
        df = df[df['customerid'].notna()].copy()
        print(f"[LOG] Dropped {before_drop - len(df)} rows without CustomerID")
    else:
        print("[LOG] 'customerid' column missing, skipping drop")

    # ----- Age -----
    if 'age' in df.columns:
        missing_ratio = df['age'].isna().mean()
        print(f"[LOG] Age missing ratio: {missing_ratio:.2%}")
        if missing_ratio > 0:
            if 'gender' in df.columns and df['gender'].nunique() > 1:
                # Group by gender if available
                df['age'] = df.groupby('gender')['age'].transform(
                    lambda x: x.fillna(x.median())
                )
                print("[LOG] Applied gender-based median imputation for missing age")
                
                # Always fill any remaining missing values with overall median 
                df['age'] = df['age'].fillna(df['age'].median())
                
                # Update derived column if needed
                df = derive_age_group(df)
        else:
            print("[LOG] No missing values for age")
    else:
        print("[LOG] 'age' column missing, skipping age imputation")

    # --- Gender mode imputation ---
    if 'gender' in df.columns:
        mode_series = df.loc[df['gender'].isin(['Male', 'Female']), 'gender'].mode()

        if not mode_series.empty:
            mode = mode_series[0]
            unknown_mask = df['gender'] == 'Unknown'
            count = unknown_mask.sum()
            if count > 0:
                df.loc[unknown_mask, 'gender'] = mode
                print(f"[LOG] Replaced {count} 'Unknown' gender values with mode: {mode}")
        else:
            print("[WARN] No valid gender mode found (only 'Unknown' present) — skipping imputation.")
    else:
        print("[LOG] 'gender' column missing, skipping gender imputation")

   
    # --- City & State handling ---
    if {'city', 'state'}.issubset(df.columns):
        print("\n🔍 Handling missing city/state values...")
        malaysia_states = [sub.name for sub in pycountry.subdivisions if sub.country_code == 'MY']
        cache = {}  # city -> validated state
        SLEEP_TIME = 1.2
        
        # Case 1: missing state but city known → fill via geocoding API
        print("\n[LOG] Case 1: Filling missing state where city is known...")
        # Get rows needing state fill (city known, state unknown)
        mask_case1 = (df['city'] != 'Unknown') & (df['state'] == 'Unknown')
        cities_to_query = df.loc[mask_case1, 'city'].unique().tolist()

        print(f"[LOG] {len(cities_to_query)} unique cities need state lookup")
        
        for city in cities_to_query:
            if city not in cache:
                # Call API
                try:
                    resp = requests.get(GEOCODE_URL, params={"q": f"{city}, Malaysia", "api_key": API_KEY}, timeout=10)
                    if resp.status_code == 200:
                        data = resp.json()
                        if isinstance(data, list) and data:
                            state_name = data[0].get("address", {}).get("state")
                            if state_name and state_name in malaysia_states:
                                cache[city] = state_name
                            else:
                                cache[city] = None
                        else:
                            cache[city] = None
                    else:
                        cache[city] = None
                    time.sleep(SLEEP_TIME)
                except Exception as e:
                    print(f"[WARN] Failed to get state for city '{city}': {e}")
                    cache[city] = None

            # Fill values
            fill_state = cache.get(city)
            if fill_state:
                df.loc[(df['city'] == city) & (df['state'] == 'Unknown'), 'state'] = fill_state
                print(f"[TRACE] Filled {city} → state='{fill_state}' (API valid)")
            else:
                # Fallback: use mode state & mode city for that state
                # The API fails to find the city || The response doesn’t contain a valid "state" field || Or the returned "state" isn’t in the official Malaysia subdivision list.
                valid_states = df[df['state'] != 'Unknown']['state']
                mode_state = valid_states.mode()[0] if not valid_states.empty else 'Unknown'

                # Compute mode city per state
                mode_city_per_state = (
                    df[df['city'] != 'Unknown'].groupby('state')['city']
                    .agg(lambda x: x.mode().iloc[0] if not x.mode().empty else 'Unknown')
                    .to_dict()
                )
                mode_city = mode_city_per_state.get(mode_state, 'Unknown')

                mask_fill = (df['city'] == city) & (df['state'] == 'Unknown')
                df.loc[mask_fill, 'state'] = mode_state
                df.loc[mask_fill, 'city'] = mode_city
                print(f"[TRACE] Filled {mask_fill.sum()} row(s) → city='{mode_city}', state='{mode_state}' (Fallback)")

        # Case 2: missing city but state known → fill with mode city per state
        print("\n[LOG] Case 2: Filling missing city where state is known...")
        mask_case2 = (df['city'] == 'Unknown') & (df['state'] != 'Unknown')
        if mask_case2.any():
            mode_city_per_state = (
                df[df['city'] != 'Unknown'].groupby('state')['city']
                .agg(lambda x: x.mode().iloc[0] if not x.mode().empty else 'Unknown')
                .to_dict()
            )
            for state, city_mode in mode_city_per_state.items():
                mask_fill = mask_case2 & (df['state'] == state)
                df.loc[mask_fill, 'city'] = city_mode
                print(f"[TRACE] Filled {mask_fill.sum()} row(s) → missing city for state='{state}' → city='{city_mode}'")

        # Case 3: both missing → fill with most frequent pair
        print("\n[LOG] Case 3: Filling missing city and state...")
        mask_case3 = (df['city'] == 'Unknown') & (df['state'] == 'Unknown')
        if mask_case3.any():
            valid_pairs = df[(df['city'] != 'Unknown') & (df['state'] != 'Unknown')]
            if not valid_pairs.empty:
                city_mode, state_mode = valid_pairs.groupby(['city', 'state']).size().idxmax()
                df.loc[mask_case3, ['city', 'state']] = [city_mode, state_mode]
                print(f"[TRACE] Filled {mask_case3.sum()} row(s) → missing city/state → City='{city_mode}', State='{state_mode}'")
            else:
                print("[WARN] No valid city/state pairs to fill missing both values")

    return df

# ============================================= (CUSTOMER DATASET) STAGE 6: OUTLIER DETECTION =============================================
def customer_detect_outliers(df):
    """Adaptive outlier handling based on dataset size."""
    print("[LOG] Running detect_outliers...")
    if 'age' in df.columns:
        df['age'] = pd.to_numeric(df['age'], errors='coerce')
        # df['age_original'] = df['age']  # ✅ Keep a copy of original age values (for comparison or re-deriving age_group)

        n = len(df)
        print(f"[LOG] Dataset has {n} rows")
        if n < 500:
            # IQR method
            Q1 = df['age'].quantile(0.25)
            Q3 = df['age'].quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            outliers = df[(df['age'] <  Q1) | (df['age'] > Q3)].shape[0]
            df.loc[(df['age'] < lower_bound) | (df['age'] > upper_bound), 'age'] = np.nan
            print(f"[LOG] IQR Applied for {n} rows. Range: [{lower_bound:.1f}, {upper_bound:.1f}] Outliers set to NaN: {outliers}")
        else:
            # Percentile capping
            lower_bound = df['age'].quantile(0.01)
            upper_bound = df['age'].quantile(0.99)
            df['age'] = df['age'].clip(lower=lower_bound, upper=upper_bound)
            print(f"[LOG] Percentile capping  applied for {n} rows. Capped to [{lower_bound:.1f}, {upper_bound:.1f}]")
    else:
        print("[LOG] 'age' column missing, skipping outlier detection")
    return df

# ============================================= (CUSTOMER DATASET) DATASET CLEANING PIPELINE =============================================
def clean_customer_dataset(df, cleaned_output_path):
    """
    Main cleaning pipeline for customer dataset.
    Executes all stages in proper order:
    0. Column Normalization
    1. Schema & Column Validation
    2. Duplicate Entry Removal
    3. Standardization & Normalization
    4. Missing Value Handling
    5. Outlier Detection
    6. Deduplication
    Finally, saves the cleaned dataset to the specified path and returns it.
    """
    print("🚀 Starting customer data cleaning pipeline...\n")
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
    df, optional_msg = customer_check_optional_columns(df)
    messages.append(optional_msg)
    
    # (FROM GENERIC FUNCTION)
    customer_mandatory = ["customerid", "city", "state"]
    df, mandatory_msg = check_mandatory_columns(df,dataset_type="customer", mandatory_columns=customer_mandatory)
    messages.append(mandatory_msg)
    
    print(optional_msg)
    print(mandatory_msg)
    print("✅ [STAGE 1 COMPLETE] Schema validation done.\n")

    # ============================================================
    # STAGE 2: REMOVE DUPLICATE ENTRY ROWS (FROM GENERIC FUNCTION)
    # ============================================================
    print("========== [STAGE 2 START] Remove Duplicate Entry Rows ==========")
    df, message = remove_duplicate_entries(df)
    messages.append(message)
    print("✅ [STAGE 2 COMPLETE] Duplicate entries removed.\n")

    # =============================================
    # STAGE 3: DEDUPLICATION
    # =============================================
    print("========== [STAGE 3 START] Deduplication ==========")
    df, message = deduplicate_customers(df)
    messages.append(message)
    print("✅ [STAGE 3 COMPLETE] Duplicate CustomerIDs deduplicated.\n")

    # =============================================
    # STAGE 4: STANDARDIZATION & NORMALIZATION
    # =============================================
    print("========== [STAGE 4 START] Standardization & Normalization ==========")
    df = standardize_customer_id(df)
    df, dob_msg = standardize_dob(df)
    messages.append(dob_msg)
    df = derive_age_features(df)
    df = derive_age_group(df)
    df = drop_dob_after_age_derived(df)
    df = standardize_gender(df)
    df = standardize_location(df)
    print("✅ [STAGE 4 COMPLETE] Standardization and normalization finished.\n")
    
    # =============================================
    # STAGE 5: MISSING VALUE HANDLING
    # =============================================
    print("========== [STAGE 5 START] Missing Value Handling ==========")
    df = handle_missing_values_customer(df)
    print("✅ [STAGE 5 COMPLETE] Missing values handled.\n")

    # =============================================
    # STAGE 6: OUTLIER DETECTION
    # =============================================
    print("========== [STAGE 6 START] Outlier Detection ==========")
    df = customer_detect_outliers(df)   # make sure detect_outliers returns df
    print("✅ [STAGE 6 COMPLETE] Outliers handled.\n")

    # =============================================
    # SAVE CLEANED DATASET
    # =============================================
    print("========== [FINAL STAGE START] Save Cleaned Dataset ==========")
    df.to_csv(cleaned_output_path, index=False)
    print(f"✅ [FINAL STAGE COMPLETE] Cleaned dataset saved at: {cleaned_output_path}\n")
    print("==========================================================")
    print("🎉 Data cleaning pipeline completed successfully!\n")
    
    return df, messages # the messages can modify later if needed (now only handle neccessary part)