import json
import warnings
from typing import List, Dict, Any
import sys

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score, davies_bouldin_score
from sklearn.preprocessing import StandardScaler, RobustScaler, OneHotEncoder, OrdinalEncoder, MinMaxScaler

warnings.filterwarnings("ignore")

# Simple logger that only emits when verbose enabled; logs to stderr so JSON file stays clean
VERBOSE = False
def vlog(msg: str):
    if VERBOSE:
        print(f"[SEGMENT][STEP] {msg}", file=sys.stderr)

# ====================================================
#  FIXED ENCODING / SCALING CONFIG (Production-style)
# ====================================================
# Numeric scaling strategy:
#   RobustScaler: RFM

def run_segmentation(df: pd.DataFrame, selected_features: List[str]) -> Dict[str, Any]:
    """Run segmentation with fixed encoding/scaling rules.
    Returns a JSON-friendly dict with best_k, evaluation metrics, assignments, and summary.
    """

    vlog(f"===========================Start run_segmentation with features={selected_features}")
    usable_df = df[selected_features].copy()

    # RFM-only fast path: skip all categorical/frequency encoding; scale numerics only
    vlog("Using RFM-only encoding path (RobustScaler on recency, frequency, monetary)")
    #NEW========== Add on invert Recency and log-transform Frequency & Monetary
    # Transform RFM
    rfm_df = usable_df[selected_features].copy()

    # Invert Recency
    if 'Recency' in rfm_df.columns:
        rfm_df['Recency'] = rfm_df['Recency'].max() - rfm_df['Recency']

    # Log-transform Frequency and Monetary
    for col in ['Frequency', 'Monetary', 'Recency']:
        if col in rfm_df.columns:
            rfm_df[col] = np.log1p(rfm_df[col])

    scaler = RobustScaler()
    X = scaler.fit_transform(rfm_df[selected_features])
    # Populate feature info for downstream payload
    robust_present = list(selected_features)
    vlog(f"Encoded matrix shape={X.shape}")
    
    # Evaluate K (2..10)
    from collections import Counter
    k_results = []
    vlog("Begin K evaluation loop 2..6")
    for k in range(2, 7):
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = km.fit_predict(X)
        sil = silhouette_score(X, labels)
        dbi = davies_bouldin_score(X, labels)
        counts = Counter(labels)
        sizes = [counts[i] for i in range(k)]
        k_results.append({'k': k, 'silhouette': float(sil), 'dbi': float(dbi), 'sizes': sizes})
        if VERBOSE:
            print(f"[SEGMENT][K-EVAL] k={k} sil={sil:.4f} dbi={dbi:.4f} sizes={sizes}", file=sys.stderr)

    # Silhouette = higher better (Range: -1 to 1)
        # How well customers fit inside their own cluster
        # How far they are from other cluster
    # DBI = lower better (Range: 0 to ∞)
        # How compact and separated clusters are

    # Composite selection: silhouette plateau + DBI threshold + size sanity + target K range
    kr = pd.DataFrame(k_results)
    sil_max = kr['silhouette'].max()
    plateau_cut = 0.95 * sil_max
    kr['largest_pct'] = kr['sizes'].apply(lambda s: max(s)/sum(s))
    kr['smallest_pct'] = kr['sizes'].apply(lambda s: min(s)/sum(s))
    dbi_max_accept = 1.30
    largest_pct_max = 0.60
    smallest_pct_min = 0.03
    target_k_min, target_k_max = 3, 6
    candidates = kr[(
        (kr['silhouette'] >= plateau_cut) &
        (kr['dbi'] < dbi_max_accept) &
        (kr['largest_pct'] <= largest_pct_max) &
        (kr['smallest_pct'] >= smallest_pct_min) &
        (kr['k'] >= target_k_min) & (kr['k'] <= target_k_max)
    )]
    if candidates.empty:
        best_row = kr.loc[kr['silhouette'].idxmax()]
        reason = "fallback_max_silhouette"
    else:
        candidates = candidates.sort_values('k')
        first = candidates.iloc[0]
        better = candidates[candidates['dbi'] <= first['dbi'] * 0.90]
        best_row = better.iloc[0] if not better.empty else first
        reason = "plateau_DBI_size_range_pref_lower_K"

    best_k = int(best_row['k'])
    vlog(f"Selected best_k={best_k} reason={reason}")

    # Final model
    final_km = KMeans(n_clusters=best_k, random_state=42, n_init=10)
    final_labels = final_km.fit_predict(X)
    df = df.copy()
    # Use capitalized 'Cluster' column as requested
    df['Cluster'] = final_labels
    vlog("Final clustering complete; generating summary")

    summary = generate_cluster_summary(df, selected_features)

    decision = {
        'selected_k': int(best_k),
        'silhouette_max': float(sil_max),
        'plateau_threshold': float(plateau_cut),
        'row': {k: (float(v) if isinstance(v, (np.floating, float)) else v) for k, v in best_row.to_dict().items()},
        'criteria': {
            'silhouette_plateau_ratio': 0.95,
            'dbi_max': dbi_max_accept,
            'largest_cluster_pct_max': largest_pct_max,
            'smallest_cluster_pct_min': smallest_pct_min,
            'target_k_range': [target_k_min, target_k_max],
            'reason': reason
        }
    }

    assignments = df[['CustomerId', 'Cluster']].to_dict(orient='records')

    response = {
        'best_k': int(best_k),
        'evaluation': k_results,
        'cluster_assignments': assignments,
        'cluster_summary': summary,
        'feature_info': {
            'selected_features': selected_features,
            'robust_scaled': robust_present,
            'transformed_shape': list(X.shape)
        },
        'decision': decision
    }
    return response


def generate_cluster_summary(df: pd.DataFrame, selected_features: List[str]) -> Dict[str, Any]:

    ROUNDING_RULES = {
        "recency": 0,
        "daysSinceLastPurchase": 0,
        "monetary": 2,
        "totalSpend": 2,
        "avgOrderValue": 2,
        "frequency": 2,
        "purchaseFrequency": 0,
        "customerLifetimeMonths": 0,
        "totalOrders": 0,
    }

    clusters = sorted(df['Cluster'].unique())
    out: Dict[str, Any] = {}

    for c in clusters:
        part = df[df['Cluster'] == c]
        stats: Dict[str, Any] = {}

        for col in selected_features:
            if col not in part.columns:
                continue

            if part[col].dtype == 'O':
                # categorical → pick mode
                stats[col] = str(part[col].value_counts().idxmax())
            else:
                mean_val = float(part[col].mean())

                # apply rounding if rule exists
                if col in ROUNDING_RULES:
                    decimals = ROUNDING_RULES[col]
                    stats[col] = round(mean_val, decimals)
                else:
                    # default: 2 decimals (safe fallback)
                    stats[col] = round(mean_val, 2)

        out[f'cluster_{c}'] = {
            'count': int(len(part)),
            'percentage': round(len(part) / len(df) * 100, 2),
            'attributes': stats
        }

    return out

def run_segmentation_from_csv(csv_path: str, selected_features: List[str]) -> Dict[str, Any]:
    df = pd.read_csv(csv_path)

    if 'CustomerId' not in df.columns:
        raise ValueError(f"'customerid' column not found. Available columns: {list(df.columns)}")

    # keep customers with at least one order
    if 'TotalOrders' in df.columns:
        df = df[df['TotalOrders'] > 0].copy()
    vlog(f"Loaded CSV rows={len(df)} after order filter")

    # Keep only selected features that exist (use exact names provided by caller)
    existing = [c for c in selected_features if c in df.columns]
    if len(existing) == 0:
        raise ValueError(f"None of the selected features are present in CSV. selected={selected_features}, columns={list(df.columns)}")

    df = df.dropna(subset=existing)
    vlog(f"Rows after NA drop for existing features={len(df)}")
    return run_segmentation(df, existing)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Run customer segmentation.')
    parser.add_argument('--csv', required=True, help='Path to merged CSV file')
    parser.add_argument('--features', required=True, help='Comma-separated list of selected features')
    parser.add_argument('--out', required=False, help='Optional path to write JSON result instead of stdout')
    parser.add_argument('--verbose', action='store_true', help='Emit progress logs to stderr')
    args = parser.parse_args()

    if args.verbose:
        VERBOSE = True
        vlog('Verbose logging enabled')

    features = [x.strip() for x in args.features.split(',') if x.strip()]
    try:
        result = run_segmentation_from_csv(args.csv, features)
    except Exception as e:
        vlog(f"ERROR during segmentation: {e}")
        err_payload = json.dumps({'error': str(e)})
        if args.out:
            try:
                with open(args.out, 'w', encoding='utf-8') as f:
                    f.write(err_payload)
            except:
                pass
        print(err_payload)
        sys.exit(1)
    payload = json.dumps(result)
    if args.out:
        try:
            with open(args.out, 'w', encoding='utf-8') as f:
                f.write(payload)
        except Exception as e:
            print(json.dumps({'error': f'WRITE_FAIL:{str(e)}'}))
            sys.exit(1)
    else:
        print(payload)
