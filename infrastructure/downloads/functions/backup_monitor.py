#!/usr/bin/env python3
import boto3
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def check_backup_compliance(bucket_name: str, region: str) -> Dict:
    """Check backup compliance against defined policies."""
    s3 = boto3.client('s3', region_name=region)
    cloudwatch = boto3.client('cloudwatch', region_name=region)
    
    compliance_results = {
        'bucket': bucket_name,
        'region': region,
        'timestamp': datetime.utcnow().isoformat(),
        'checks': [],
        'overall_status': 'COMPLIANT'
    }
    
    # Check 1: Versioning enabled
    try:
        versioning = s3.get_bucket_versioning(Bucket=bucket_name)
        status = versioning.get('Status', 'Disabled')
        compliance_results['checks'].append({
            'name': 'versioning_enabled',
            'status': 'COMPLIANT' if status == 'Enabled' else 'NON_COMPLIANT',
            'details': f'Versioning is {status}'
        })
    except Exception as e:
        logger.error(f"Error checking versioning: {str(e)}")
        compliance_results['checks'].append({
            'name': 'versioning_enabled',
            'status': 'ERROR',
            'details': str(e)
        })

    # Check 2: Encryption enabled
    try:
        encryption = s3.get_bucket_encryption(Bucket=bucket_name)
        compliance_results['checks'].append({
            'name': 'encryption_enabled',
            'status': 'COMPLIANT',
            'details': 'Server-side encryption is enabled'
        })
    except s3.exceptions.ClientError as e:
        if e.response['Error']['Code'] == 'ServerSideEncryptionConfigurationNotFoundError':
            compliance_results['checks'].append({
                'name': 'encryption_enabled',
                'status': 'NON_COMPLIANT',
                'details': 'Server-side encryption is not enabled'
            })
        else:
            compliance_results['checks'].append({
                'name': 'encryption_enabled',
                'status': 'ERROR',
                'details': str(e)
            })

    # Check 3: Replication health
    try:
        metrics = cloudwatch.get_metric_statistics(
            Namespace='AWS/S3',
            MetricName='ReplicationLatency',
            Dimensions=[{'Name': 'BucketName', 'Value': bucket_name}],
            StartTime=datetime.utcnow() - timedelta(hours=24),
            EndTime=datetime.utcnow(),
            Period=3600,
            Statistics=['Average']
        )
        
        max_latency = max([point['Average'] for point in metrics['Datapoints']], default=0)
        is_compliant = max_latency <= 43200  # 12 hours
        compliance_results['checks'].append({
            'name': 'replication_latency',
            'status': 'COMPLIANT' if is_compliant else 'NON_COMPLIANT',
            'details': f'Max replication latency in last 24h: {max_latency/3600:.1f} hours'
        })
    except Exception as e:
        logger.error(f"Error checking replication: {str(e)}")
        compliance_results['checks'].append({
            'name': 'replication_latency',
            'status': 'ERROR',
            'details': str(e)
        })

    # Check 4: Lifecycle rules
    try:
        lifecycle = s3.get_bucket_lifecycle_configuration(Bucket=bucket_name)
        required_rules = {
            'archive_old_versions',
            'clean_old_artifacts'
        }
        found_rules = {rule['ID'] for rule in lifecycle['Rules']}
        missing_rules = required_rules - found_rules
        
        compliance_results['checks'].append({
            'name': 'lifecycle_rules',
            'status': 'COMPLIANT' if not missing_rules else 'NON_COMPLIANT',
            'details': f'Missing rules: {list(missing_rules)}' if missing_rules else 'All required rules present'
        })
    except Exception as e:
        logger.error(f"Error checking lifecycle rules: {str(e)}")
        compliance_results['checks'].append({
            'name': 'lifecycle_rules',
            'status': 'ERROR',
            'details': str(e)
        })

    # Check 5: Test backup recovery
    try:
        test_key = f'compliance-test/test-{datetime.utcnow().isoformat()}.txt'
        test_content = f'Backup test at {datetime.utcnow().isoformat()}'
        
        # Upload test file
        s3.put_object(
            Bucket=bucket_name,
            Key=test_key,
            Body=test_content.encode()
        )
        
        # Wait briefly for replication
        import time
        time.sleep(5)
        
        # Verify file exists and is readable
        response = s3.get_object(
            Bucket=bucket_name,
            Key=test_key
        )
        retrieved_content = response['Body'].read().decode()
        
        is_valid = retrieved_content == test_content
        compliance_results['checks'].append({
            'name': 'backup_recovery_test',
            'status': 'COMPLIANT' if is_valid else 'NON_COMPLIANT',
            'details': 'Backup test successful' if is_valid else 'Backup test failed: content mismatch'
        })
        
        # Clean up test file
        s3.delete_object(
            Bucket=bucket_name,
            Key=test_key
        )
    except Exception as e:
        logger.error(f"Error testing backup recovery: {str(e)}")
        compliance_results['checks'].append({
            'name': 'backup_recovery_test',
            'status': 'ERROR',
            'details': str(e)
        })

    # Update overall status
    statuses = [check['status'] for check in compliance_results['checks']]
    if 'ERROR' in statuses:
        compliance_results['overall_status'] = 'ERROR'
    elif 'NON_COMPLIANT' in statuses:
        compliance_results['overall_status'] = 'NON_COMPLIANT'

    return compliance_results

def notify_slack(webhook_url: str, results: Dict) -> None:
    """Send compliance results to Slack."""
    import urllib3
    http = urllib3.PoolManager()
    
    color = {
        'COMPLIANT': '#36a64f',
        'NON_COMPLIANT': '#ff9000',
        'ERROR': '#ff0000'
    }.get(results['overall_status'], '#000000')
    
    message = {
        'attachments': [{
            'color': color,
            'title': f'Backup Compliance Report - {results["bucket"]}',
            'text': f'Region: {results["region"]}\nStatus: {results["overall_status"]}',
            'fields': [
                {
                    'title': check['name'],
                    'value': f'{check["status"]}: {check["details"]}',
                    'short': False
                }
                for check in results['checks']
            ],
            'footer': f'Report generated at {results["timestamp"]}'
        }]
    }
    
    encoded_msg = json.dumps(message).encode('utf-8')
    http.request('POST', webhook_url, body=encoded_msg)

def store_compliance_report(results: Dict) -> None:
    """Store compliance results in S3."""
    s3 = boto3.client('s3')
    bucket = os.environ['REPORTS_BUCKET']
    key = f'compliance/{results["bucket"]}/{datetime.utcnow().strftime("%Y/%m/%d")}/report.json'
    
    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=json.dumps(results, indent=2).encode(),
        ContentType='application/json'
    )

def lambda_handler(event: Dict, context: Dict) -> Dict:
    """Main Lambda handler for backup testing and compliance monitoring."""
    try:
        # Get environment variables
        primary_bucket = os.environ['PRIMARY_BUCKET']
        backup_buckets = json.loads(os.environ['BACKUP_BUCKETS'])
        slack_webhook = os.environ.get('SLACK_WEBHOOK_URL')
        
        all_results = []
        
        # Check primary bucket
        results = check_backup_compliance(primary_bucket, 'us-east-1')
        all_results.append(results)
        store_compliance_report(results)
        if slack_webhook:
            notify_slack(slack_webhook, results)
        
        # Check backup buckets
        for bucket, region in backup_buckets.items():
            results = check_backup_compliance(bucket, region)
            all_results.append(results)
            store_compliance_report(results)
            if slack_webhook:
                notify_slack(slack_webhook, results)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Compliance checks completed',
                'results': all_results
            })
        }
    
    except Exception as e:
        logger.error(f"Error in lambda_handler: {str(e)}")
        raise
