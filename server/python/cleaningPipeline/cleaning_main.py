import pandas as pd
import argparse
import sys
import os
import json
from customer_cleaning import clean_customer_dataset
from order_cleaning import clean_order_dataset

def main():
    parser = argparse.ArgumentParser(description="Data cleaning pipeline for customer and order datasets")
    parser.add_argument("--type", choices=["customer", "order"], required=True, help="Dataset type (customer or order)")
    parser.add_argument("--temp_file_path_with_filename", required=True, help="Path to the input CSV file")
    parser.add_argument("--original_file_name", required=True, help="Original dataset name")
    args = parser.parse_args()

    try:
        # Read CSV from file path
        df = pd.read_csv(args.temp_file_path_with_filename)
        
        # Get the directory of the input file (temp directory)
        temp_dir = os.path.dirname(args.temp_file_path_with_filename)
        
        # Determine the original filename to pass into the pipeline
        original_filename = args.original_file_name 
        
        # Create the full path for the cleaned file in the temp directory
        base_name, ext = os.path.splitext(original_filename)
        cleaned_path = os.path.join(temp_dir, f"{base_name}_cleaned{ext}")
        report_path = os.path.join(temp_dir, f"{base_name}_report.json")
        
        print(f"[1/5] Read file: {args.temp_file_path_with_filename}")
        sys.stdout.flush()
        # Run appropriate cleaning function and receive (df, messages)
        if args.type == "customer":
            cleaned_df, report = clean_customer_dataset(df, cleaned_path)
        else:
            cleaned_df, report = clean_order_dataset(df, cleaned_path)

        # The cleaning pipelines save cleaned files to disk themselves; print any messages for logging
        # if messages:
        #     for m in messages:
        #         if m:
        #             print(m)
        # Save report json
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=4, default=str)

        print(f"[DONE] Cleaned saved: {cleaned_path}")
        print(f"[DONE] Report saved: {report_path}")
        sys.stdout.flush()
        sys.exit(0)

    except Exception as e:
        print(f"❌ Error during cleaning: {str(e)}", file=sys.stderr)
        sys.stderr.flush()
        sys.exit(1)

if __name__ == "__main__":
    main()