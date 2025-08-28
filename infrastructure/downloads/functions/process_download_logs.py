import json
import os
import boto3
from datetime import datetime
import urllib.parse

dynamodb = boto3.resource('dynamodb')
downloads_table = dynamodb.Table(os.environ['DOWNLOADS_TABLE'])
manifest_bucket = os.environ['MANIFEST_BUCKET']
manifest_key = 'manifest.json'

s3 = boto3.client('s3')
cloudwatch = boto3.client('cloudwatch')

def extract_version_from_path(path):
    """Extract version from download path."""
    parts = path.split('/')
    if 'beta' in parts:
        # Beta path: /beta/v1.1.0-beta.1/platform/file
        beta_index = parts.index('beta')
        return parts[beta_index + 1] if len(parts) > beta_index + 1 else None
    else:
        # Stable path: /v1.0.0/platform/file
        return next((part for part in parts if part.startswith('v')), None)

def extract_platform(path):
    """Extract platform from download path."""
    if 'macos' in path or 'mac' in path:
        return 'macos'
    elif 'windows' in path or 'win' in path:
        return 'windows'
    elif 'linux' in path:
        return 'linux'
    return 'unknown'

def get_manifest():
    """Get current version manifest."""
    try:
        response = s3.get_object(Bucket=manifest_bucket, Key=manifest_key)
        return json.loads(response['Body'].read().decode('utf-8'))
    except Exception as e:
        print(f"Error reading manifest: {e}")
        return None

def put_download_record(version, platform, user_agent, country, timestamp):
    """Record download in DynamoDB."""
    try:
        downloads_table.put_item(Item={
            'download_id': f"{platform}#{version}#{timestamp}",
            'version': version,
            'platform': platform,
            'timestamp': timestamp,
            'user_agent': user_agent,
            'country': country,
            'year_month': timestamp[:7]  # YYYY-MM for partition
        })
    except Exception as e:
        print(f"Error recording download: {e}")

def put_metrics(version, platform):
    """Put download metrics to CloudWatch."""
    try:
        cloudwatch.put_metric_data(
            Namespace='RinaWarp/Downloads',
            MetricData=[
                {
                    'MetricName': 'Downloads',
                    'Value': 1,
                    'Unit': 'Count',
                    'Dimensions': [
                        {'Name': 'Version', 'Value': version},
                        {'Name': 'Platform', 'Value': platform}
                    ]
                }
            ]
        )
    except Exception as e:
        print(f"Error putting metrics: {e}")

def lambda_handler(event, context):
    """Process CloudFront log events."""
    try:
        for record in event['Records']:
            # Parse CloudFront log
            cf_event = json.loads(record['cf']['request'])
            
            # Extract info
            path = cf_event['uri']
            user_agent = cf_event.get('headers', {}).get('user-agent', [{}])[0].get('value', 'Unknown')
            country = cf_event.get('headers', {}).get('cloudfront-viewer-country', [{}])[0].get('value', 'Unknown')
            timestamp = datetime.now().isoformat()
            
            # Only process actual downloads
            if not any(ext in path.lower() for ext in ['.dmg', '.exe', '.appimage']):
                continue
            
            # Extract version and platform
            version = extract_version_from_path(path)
            platform = extract_platform(path)
            
            if not version or platform == 'unknown':
                continue
            
            # Record download
            put_download_record(version, platform, user_agent, country, timestamp)
            
            # Update metrics
            put_metrics(version, platform)
            
        return {
            'statusCode': 200,
            'body': json.dumps('Download analytics processed')
        }
        
    except Exception as e:
        print(f"Error processing download analytics: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps('Error processing download analytics')
        }
