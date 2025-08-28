#!/usr/bin/env python3
import os
import json
import sys
import time
import requests
from typing import Optional

def get_zone_id(auth_token: str, domain: str) -> Optional[str]:
    """Get Cloudflare zone ID for domain."""
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json",
    }
    
    response = requests.get(
        "https://api.cloudflare.com/client/v4/zones",
        headers=headers,
        params={"name": domain}
    )
    
    if response.status_code == 200:
        data = response.json()
        if data["success"] and data["result"]:
            return data["result"][0]["id"]
    return None

def list_dns_records(auth_token: str, zone_id: str) -> list:
    """List all DNS records in the zone."""
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json",
    }
    
    response = requests.get(
        f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        if data["success"]:
            print("\nCurrent DNS Records:")
            for record in data["result"]:
                print(f"Name: {record['name']}")
                print(f"Type: {record['type']}")
                print(f"Content: {record['content']}")
                print(f"Proxied: {record['proxied']}")
                print("---")
            return data["result"]
    return []

def update_dns_record(auth_token: str, zone_id: str, record_id: str, name: str, record_type: str, content: str, proxied: bool = False) -> bool:
    """Update an existing DNS record in Cloudflare zone."""
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json",
    }
    
    # Remove domain from record name if present
    if name.endswith('.rinawarptech.com'):
        name = name.replace('.rinawarptech.com', '')
    
    data = {
        "type": record_type,
        "name": name,
        "content": content,
        "ttl": 1,
        "proxied": proxied
    }
    
    response = requests.put(
        f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records/{record_id}",
        headers=headers,
        json=data
    )
    
    if response.status_code == 200:
        result = response.json()
        return result["success"]
    return False

def list_dns_records(auth_token: str, zone_id: str) -> None:
    """List all DNS records in the zone."""
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json",
    }
    
    response = requests.get(
        f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        if data["success"]:
            print("\nCurrent DNS Records:")
            for record in data["result"]:
                print(f"Name: {record['name']}")
                print(f"Type: {record['type']}")
                print(f"Content: {record['content']}")
                print(f"Proxied: {record['proxied']}")
                print("---")
        return data["result"]
    return None
    
    response = requests.get(
        "https://api.cloudflare.com/client/v4/zones",
        headers=headers,
        params={"name": domain}
    )
    
    if response.status_code == 200:
        data = response.json()
        if data["success"] and data["result"]:
            return data["result"][0]["id"]
    return None

def add_dns_record(auth_token: str, zone_id: str, name: str, record_type: str, content: str, proxied: bool = False) -> bool:
    """Add DNS record to Cloudflare zone."""
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json",
    }
    
    # Remove domain from validation record name if present
    if name.endswith('.rinawarptech.com'):
        name = name.replace('.rinawarptech.com', '')
    
    data = {
        "type": record_type,
        "name": name,
        "content": content,
        "ttl": 1,  # Auto TTL
        "proxied": proxied
    }
    
    response = requests.post(
        f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records",
        headers=headers,
        json=data
    )
    
    if response.status_code == 200:
        result = response.json()
        return result["success"]
    return False

def monitor_certificate(cert_arn: str) -> bool:
    """Monitor ACM certificate validation status."""
    import boto3
    
    acm = boto3.client('acm', region_name='us-east-1')
    max_attempts = 30  # 5 minutes total (10 second intervals)
    
    print("Monitoring certificate validation status...")
    for attempt in range(max_attempts):
        response = acm.describe_certificate(CertificateArn=cert_arn)
        status = response['Certificate']['Status']
        
        if status == 'ISSUED':
            print("\nCertificate has been validated successfully!")
            return True
        elif status == 'FAILED':
            print("\nCertificate validation failed!")
            return False
        
        print(".", end="", flush=True)
        time.sleep(10)
    
    print("\nTimeout waiting for certificate validation")
    return False

def main():
    # Check command line arguments
    if len(sys.argv) > 1:
        auth_token = os.getenv('CLOUDFLARE_API_TOKEN')
        if not auth_token:
            print("Error: CLOUDFLARE_API_TOKEN environment variable is required")
            sys.exit(1)
        
        zone_id = get_zone_id(auth_token, "rinawarptech.com")
        if not zone_id:
            print("Error: Could not find Cloudflare zone ID for domain")
            sys.exit(1)

        if sys.argv[1] == "--list":
            list_dns_records(auth_token, zone_id)
            sys.exit(0)
        elif sys.argv[1] == "--update-cloudfront":
            # Get records
            records = list_dns_records(auth_token, zone_id)
            cloudfront_record = next((r for r in records if r['name'] == 'downloads.rinawarptech.com' and r['type'] == 'CNAME'), None)
            
            if not cloudfront_record:
                print("Error: Could not find CloudFront DNS record")
                sys.exit(1)
            
            # Get current CloudFront domain
            cloudfront_info = json.loads(os.popen('aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items[?contains(@, \'downloads.rinawarptech.com\')]].DomainName" --output json').read())
            if not cloudfront_info or not cloudfront_info[0]:
                print("Error: Could not find CloudFront distribution")
                sys.exit(1)
            
            cloudfront_domain = cloudfront_info[0]
            
            # Update record
            print(f"Updating CloudFront record to point to {cloudfront_domain}...")
            success = update_dns_record(
                auth_token,
                zone_id,
                cloudfront_record['id'],
                'downloads',
                'CNAME',
                cloudfront_domain,
                proxied=True
            )
            
            if success:
                print("CloudFront DNS record updated successfully!")
            else:
                print("Error: Failed to update CloudFront DNS record")
                sys.exit(1)
            
            sys.exit(0)

    # Check environment variables
    auth_token = os.getenv('CLOUDFLARE_API_TOKEN')
    if not auth_token:
        print("Error: CLOUDFLARE_API_TOKEN environment variable is required")
        sys.exit(1)
    
    # Get Terraform output
    try:
        with open('terraform.tfstate') as f:
            tf_state = json.load(f)
    except FileNotFoundError:
        print("Error: terraform.tfstate file not found")
        sys.exit(1)
    
    # Extract validation record and CloudFront details from state
    validation_record = None
    cert_arn = None
    cloudfront_domain = None
    
    for resource in tf_state.get('resources', []):
        if resource['type'] == 'aws_acm_certificate':
            cert_arn = resource['instances'][0]['attributes']['arn']
            validation_options = resource['instances'][0]['attributes']['domain_validation_options']
            if validation_options:
                validation_record = {
                    'name': validation_options[0]['resource_record_name'],
                    'type': validation_options[0]['resource_record_type'],
                    'value': validation_options[0]['resource_record_value']
                }
        elif resource['type'] == 'aws_cloudfront_distribution':
            cloudfront_domain = resource['instances'][0]['attributes']['domain_name']
    
    if not validation_record or not cert_arn or not cloudfront_domain:
        print("Error: Could not find required details in Terraform state")
        sys.exit(1)
    
    # Get zone ID for domain
    zone_id = get_zone_id(auth_token, "rinawarptech.com")
    if not zone_id:
        print("Error: Could not find Cloudflare zone ID for domain")
        sys.exit(1)
    
    # Add CloudFront DNS record
    print("Adding CloudFront DNS record to Cloudflare...")
    success = add_dns_record(
        auth_token,
        zone_id,
        "downloads",
        "CNAME",
        cloudfront_domain,
        proxied=True  # Enable Cloudflare proxy
    )
    
    if not success:
        print("Error: Failed to add CloudFront DNS record")
        sys.exit(1)
    
    print("CloudFront DNS record added successfully!")
    
    # Add ACM validation record
    print("Adding ACM validation record to Cloudflare...")
    success = add_dns_record(
        auth_token,
        zone_id,
        validation_record['name'],
        validation_record['type'],
        validation_record['value'],
        proxied=False  # DNS only for validation
    )
    
    if not success:
        print("Error: Failed to add validation record")
        sys.exit(1)
    
    print("ACM validation record added successfully!")
    
    # Monitor certificate validation
    if monitor_certificate(cert_arn):
        print("\nYou can now run 'terraform apply' to create the CloudFront distribution")
    else:
        print("\nCertificate validation failed or timed out")
        sys.exit(1)

if __name__ == '__main__':
    main()
