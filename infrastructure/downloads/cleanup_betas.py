#!/usr/bin/env python3
import json
import argparse
import boto3
from datetime import datetime
import sys
import os

def load_manifest(s3_client, bucket: str) -> dict:
    """Load manifest from S3."""
    try:
        response = s3_client.get_object(Bucket=bucket, Key='manifest.json')
        return json.loads(response['Body'].read().decode('utf-8'))
    except Exception as e:
        print(f"Error loading manifest: {e}")
        sys.exit(1)

def save_manifest(s3_client, bucket: str, manifest: dict) -> None:
    """Save manifest back to S3."""
    try:
        s3_client.put_object(
            Bucket=bucket,
            Key='manifest.json',
            Body=json.dumps(manifest, indent=2),
            ContentType='application/json',
            CacheControl='no-cache'
        )
    except Exception as e:
        print(f"Error saving manifest: {e}")
        sys.exit(1)

def delete_s3_prefix(s3_client, bucket: str, prefix: str) -> None:
    """Delete all objects under a prefix in S3."""
    try:
        paginator = s3_client.get_paginator('list_objects_v2')
        for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
            if 'Contents' in page:
                for obj in page['Contents']:
                    print(f"Deleting {obj['Key']}...")
                    s3_client.delete_object(Bucket=bucket, Key=obj['Key'])
    except Exception as e:
        print(f"Error deleting objects with prefix {prefix}: {e}")

def cleanup_expired_betas(bucket: str, dry_run: bool = False) -> None:
    """Clean up expired beta releases."""
    s3_client = boto3.client('s3')
    manifest = load_manifest(s3_client, bucket)
    
    if 'beta' not in manifest:
        print("No beta releases found in manifest")
        return
    
    today = datetime.now().date()
    expired_versions = []
    
    print("\nChecking for expired beta releases...")
    for version, info in manifest['beta'].items():
        if 'expires' in info:
            expiry_date = datetime.strptime(info['expires'], '%Y-%m-%d').date()
            if today > expiry_date:
                expired_versions.append(version)
                print(f"Found expired beta: {version} (expired on {info['expires']})")
    
    if not expired_versions:
        print("No expired beta releases found")
        return
    
    if dry_run:
        print("\nDRY RUN - Would delete the following:")
        for version in expired_versions:
            print(f"- Beta version {version} and all associated files")
        return
    
    print("\nDeleting expired beta releases...")
    for version in expired_versions:
        # Delete files from S3
        prefix = f"beta/v{version}"
        print(f"\nDeleting files for {version}...")
        delete_s3_prefix(s3_client, bucket, prefix)
        
        # Remove from manifest
        print(f"Removing {version} from manifest...")
        del manifest['beta'][version]
        
        # Update latest_beta if necessary
        if manifest.get('latest_beta') == version:
            remaining_betas = list(manifest['beta'].keys())
            if remaining_betas:
                manifest['latest_beta'] = max(remaining_betas)
            else:
                del manifest['latest_beta']
    
    # Save updated manifest
    print("\nSaving updated manifest...")
    save_manifest(s3_client, bucket, manifest)
    
    print("\nCleanup complete!")

def main():
    parser = argparse.ArgumentParser(description="Clean up expired beta releases")
    parser.add_argument("--bucket", default="rinawarp-downloads-production",
                      help="S3 bucket name")
    parser.add_argument("--dry-run", action="store_true",
                      help="Show what would be deleted without actually deleting")
    
    args = parser.parse_args()
    cleanup_expired_betas(args.bucket, args.dry_run)

if __name__ == "__main__":
    main()
