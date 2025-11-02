import pandas as pd
import argparse
import sys
import os
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

        # Run appropriate cleaning function and receive (df, messages)
        if args.type == "customer":
            cleaned_df, messages = clean_customer_dataset(df, cleaned_path)
        else:
            cleaned_df, messages = clean_order_dataset(df, cleaned_path)

        # The cleaning pipelines save cleaned files to disk themselves; print any messages for logging
        if messages:
            for m in messages:
                if m:
                    print(m)

        sys.exit(0)

    except Exception as e:
        print(f"❌ Error during cleaning: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()