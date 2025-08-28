#!/usr/bin/env python3
import argparse
import json
import os
import sys
import hashlib
import datetime
from typing import Dict, Optional

def calculate_md5(file_path: str) -> str:
    """Calculate MD5 hash of a file."""
    md5_hash = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            md5_hash.update(chunk)
    return md5_hash.hexdigest()

def get_file_info(file_path: str) -> Dict[str, any]:
    """Get file information (size, checksum)."""
    return {
        "size": os.path.getsize(file_path),
        "checksum": calculate_md5(file_path)
    }

def update_manifest(version: str, files: Dict[str, str], manifest_path: str, 
                   release_notes: str = "", critical: bool = False,
                   beta: bool = False, beta_expires: str = None) -> None:
    """Update the version manifest with new release information."""
    try:
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
    except FileNotFoundError:
        manifest = {
            "latest": version,
            "versions": {},
            "minimum_supported": version
        }

    # Update appropriate latest version
    if beta:
        if "latest_beta" not in manifest or version > manifest["latest_beta"]:
            manifest["latest_beta"] = version
    else:
        if version > manifest["latest"]:
            manifest["latest"] = version

    # Add new version info
    version_info = {
        "release_date": datetime.datetime.now().strftime("%Y-%m-%d"),
        "release_notes": release_notes,
        "critical": critical,
        "beta": beta,
        "platforms": {}
    }
    
    if beta and beta_expires:
        version_info["expires"] = beta_expires

    # Process each platform's files
    for platform, file_path in files.items():
        if not os.path.exists(file_path):
            print(f"Warning: File not found: {file_path}")
            continue

        file_info = get_file_info(file_path)
        
        # Platform-specific configurations
        platform_config = {
            "macos": {
                "min_os": "11.0.0",
                "architecture": ["x86_64", "arm64"]
            },
            "windows": {
                "min_os": "10.0.0",
                "architecture": ["x86_64"]
            },
            "linux": {
                "min_os": "Ubuntu 20.04",
                "architecture": ["x86_64", "arm64"]
            }
        }

        # Construct download URL with beta path if applicable
        filename = os.path.basename(file_path)
        base_path = "beta/" if beta else ""
        url = f"https://downloads.rinawarptech.com/{base_path}v{version}/{platform}/{filename}"

        version_info["platforms"][platform] = {
            "version": version,
            "url": url,
            "checksum": file_info["checksum"],
            "size": file_info["size"],
            **platform_config[platform]
        }

    # Add version info to appropriate section
    if beta:
        if "beta" not in manifest:
            manifest["beta"] = {}
        manifest["beta"][version] = version_info
    else:
        manifest["versions"][version] = version_info

    # Write updated manifest
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)

def upload_files(version: str, files: Dict[str, str], manifest_path: str, beta: bool = False) -> None:
    """Upload files to S3 and update manifest."""
    s3_bucket = "rinawarp-downloads-production"
    
    # Upload each file
    for platform, file_path in files.items():
        if not os.path.exists(file_path):
            print(f"Error: File not found: {file_path}")
            continue

        # Determine content type
        content_types = {
            "macos": "application/x-apple-diskimage",
            "windows": "application/vnd.microsoft.portable-executable",
            "linux": "application/x-executable"
        }

        filename = os.path.basename(file_path)
        base_path = "beta/" if beta else ""
        s3_key = f"{base_path}v{version}/{platform}/{filename}"
        
        # Upload file to S3 with appropriate metadata
        os.system(f"""
        aws s3 cp "{file_path}" "s3://{s3_bucket}/{s3_key}" \
            --content-type "{content_types[platform]}" \
            --metadata "version={version},platform={platform}" \
            --cache-control "public, max-age=31536000" \
            --content-disposition "attachment; filename={filename}"
        """)

    # Upload manifest file
    os.system(f"""
    aws s3 cp "{manifest_path}" "s3://{s3_bucket}/manifest.json" \
        --content-type "application/json" \
        --cache-control "no-cache" \
        --metadata-directive "REPLACE"
    """)

def main():
    parser = argparse.ArgumentParser(description="Manage RinaWarp release uploads")
    parser.add_argument("version", help="Version number (e.g., 1.0.0)")
    parser.add_argument("--macos", help="Path to macOS installer")
    parser.add_argument("--windows", help="Path to Windows installer")
    parser.add_argument("--linux", help="Path to Linux installer")
    parser.add_argument("--notes", help="Release notes", default="")
    parser.add_argument("--critical", action="store_true", help="Mark as critical update")
    parser.add_argument("--beta", action="store_true", help="Mark as beta release")
    parser.add_argument("--beta-expires", help="Expiration date for beta (YYYY-MM-DD)")
    parser.add_argument("--manifest", default="version-manifest.json", help="Path to manifest file")
    
    args = parser.parse_args()

    # Collect files
    files = {
        "macos": args.macos,
        "windows": args.windows,
        "linux": args.linux
    }
    
    # Filter out None values
    files = {k: v for k, v in files.items() if v is not None}

    if not files:
        print("Error: At least one platform installer must be specified")
        sys.exit(1)

    # Update manifest
    # Validate beta expiration date format if provided
    if args.beta and args.beta_expires:
        try:
            datetime.datetime.strptime(args.beta_expires, '%Y-%m-%d')
        except ValueError:
            print("Error: Beta expiration date must be in YYYY-MM-DD format")
            sys.exit(1)
    
    # If it's a beta release but no expiration provided, set default to 30 days
    if args.beta and not args.beta_expires:
        beta_expires = (datetime.datetime.now() + datetime.timedelta(days=30)).strftime('%Y-%m-%d')
    else:
        beta_expires = args.beta_expires
    
    update_manifest(args.version, files, args.manifest, args.notes, args.critical,
                    args.beta, beta_expires)
    
    # Upload files
    upload_files(args.version, files, args.manifest, args.beta)

    print(f"Successfully uploaded version {args.version}")

if __name__ == "__main__":
    main()
