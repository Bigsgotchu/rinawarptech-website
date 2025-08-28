#!/usr/bin/env python3
import argparse
import json
import hashlib
import requests
import sys
import time
import concurrent.futures
from typing import Dict, List, Tuple

def get_manifest(manifest_url: str) -> dict:
    """Fetch and parse the version manifest."""
    response = requests.get(manifest_url)
    response.raise_for_status()
    return response.json()

def download_file(url: str) -> bytes:
    """Download a file and return its contents."""
    response = requests.get(url, stream=True)
    response.raise_for_status()
    return response.content

def calculate_md5(content: bytes) -> str:
    """Calculate MD5 hash of content."""
    return hashlib.md5(content).hexdigest()

def validate_download(url: str, expected_checksum: str) -> Tuple[str, bool, str]:
    """Validate a single download."""
    try:
        content = download_file(url)
        actual_checksum = calculate_md5(content)
        is_valid = actual_checksum == expected_checksum
        message = "OK" if is_valid else f"Checksum mismatch: expected {expected_checksum}, got {actual_checksum}"
        return url, is_valid, message
    except Exception as e:
        return url, False, str(e)

def validate_version(manifest: dict, version: str, include_beta: bool = False) -> List[Dict[str, any]]:
    """Validate all downloads for a specific version."""
    results = []
    
    if version not in manifest["versions"]:
        print(f"Error: Version {version} not found in manifest")
        sys.exit(1)
    
    version_info = manifest["versions"][version]
    
    # Skip beta versions unless specifically included
    if not include_beta and version_info.get("beta", False):
        return []
    
    # Validate each platform's download
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        future_to_url = {}
        for platform, platform_info in version_info["platforms"].items():
            url = platform_info["url"]
            checksum = platform_info["checksum"]
            future = executor.submit(validate_download, url, checksum)
            future_to_url[future] = (platform, url)
        
        for future in concurrent.futures.as_completed(future_to_url):
            platform, url = future_to_url[future]
            try:
                url, is_valid, message = future.result()
                results.append({
                    "version": version,
                    "platform": platform,
                    "url": url,
                    "valid": is_valid,
                    "message": message
                })
            except Exception as e:
                results.append({
                    "version": version,
                    "platform": platform,
                    "url": url,
                    "valid": False,
                    "message": str(e)
                })
    
    return results

def main():
    parser = argparse.ArgumentParser(description="Validate RinaWarp downloads")
    parser.add_argument("--manifest", default="https://downloads.rinawarptech.com/manifest.json",
                      help="URL to version manifest")
    parser.add_argument("--version", help="Specific version to validate")
    parser.add_argument("--include-beta", action="store_true",
                      help="Include beta versions in validation")
    parser.add_argument("--output", help="Output file for results (JSON)")
    
    args = parser.parse_args()
    
    try:
        manifest = get_manifest(args.manifest)
        results = []
        
        if args.version:
            versions = [args.version]
        else:
            versions = list(manifest["versions"].keys())
        
        print(f"Validating {len(versions)} version(s)...")
        for version in versions:
            version_results = validate_version(manifest, version, args.include_beta)
            results.extend(version_results)
            
            # Print results as we go
            for result in version_results:
                status = "✅" if result["valid"] else "❌"
                print(f"{status} {result['version']} {result['platform']}: {result['message']}")
        
        # Calculate summary
        total = len(results)
        valid = sum(1 for r in results if r["valid"])
        print(f"\nSummary: {valid}/{total} downloads validated successfully")
        
        # Write detailed results to file if requested
        if args.output:
            with open(args.output, 'w') as f:
                json.dump({
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "manifest_url": args.manifest,
                    "total_downloads": total,
                    "valid_downloads": valid,
                    "results": results
                }, f, indent=2)
            print(f"\nDetailed results written to {args.output}")
        
        # Exit with error if any validation failed
        if valid != total:
            sys.exit(1)
            
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
