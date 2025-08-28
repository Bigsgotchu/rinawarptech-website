import json
import os
import boto3
import pandas as pd
from datetime import datetime, timedelta
from decimal import Decimal
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from typing import List, Dict, Any

dynamodb = boto3.resource('dynamodb')
sns = boto3.client('sns')
s3 = boto3.client('s3')
downloads_table = dynamodb.Table(os.environ['DOWNLOADS_TABLE'])
topic_arn = os.environ['TOPIC_ARN']
reports_bucket = os.environ['REPORTS_BUCKET']

def get_downloads_by_time(start_time: str, end_time: str = None) -> List[Dict]:
    """Get downloads within time range."""
    if not end_time:
        end_time = datetime.now().isoformat()
        
    response = downloads_table.query(
        IndexName='YearMonthIndex',
        KeyConditionExpression='year_month = :ym',
        ExpressionAttributeValues={
            ':ym': start_time[:7]  # YYYY-MM
        }
    )
    
    downloads = response.get('Items', [])
    while 'LastEvaluatedKey' in response:
        response = downloads_table.query(
            IndexName='YearMonthIndex',
            KeyConditionExpression='year_month = :ym',
            ExpressionAttributeValues={
                ':ym': start_time[:7]
            },
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        downloads.extend(response.get('Items', []))
    
    return [d for d in downloads if start_time <= d['timestamp'] <= end_time]

def process_download_event(event: Dict) -> None:
    """Process real-time download event."""
    try:
        for record in event['Records']:
            if record['eventName'] == 'INSERT':
                new_image = record['dynamodb']['NewImage']
                platform = new_image['platform']['S']
                version = new_image['version']['S']
                country = new_image['country']['S']
                
                # Send notification
                message = {
                    'type': 'download',
                    'platform': platform,
                    'version': version,
                    'country': country,
                    'timestamp': new_image['timestamp']['S']
                }
                
                sns.publish(
                    TopicArn=topic_arn,
                    Message=json.dumps(message),
                    MessageAttributes={
                        'type': {
                            'DataType': 'String',
                            'StringValue': 'download'
                        },
                        'platform': {
                            'DataType': 'String',
                            'StringValue': platform
                        }
                    }
                )
    except Exception as e:
        print(f"Error processing download event: {e}")

def generate_trend_report() -> None:
    """Generate weekly trend report."""
    try:
        now = datetime.now()
        start_time = (now - timedelta(days=7)).isoformat()
        downloads = get_downloads_by_time(start_time)
        
        if not downloads:
            print("No downloads in the past week")
            return
        
        # Create DataFrame
        df = pd.DataFrame(downloads)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df.set_index('timestamp', inplace=True)
        
        # Create report visualizations
        fig = make_subplots(
            rows=3, cols=1,
            subplot_titles=(
                'Downloads by Platform',
                'Geographic Distribution',
                'Version Distribution'
            ),
            vertical_spacing=0.2
        )
        
        # Downloads by platform
        platform_counts = df['platform'].value_counts()
        fig.add_trace(
            go.Bar(
                x=platform_counts.index,
                y=platform_counts.values,
                text=platform_counts.values,
                textposition='auto',
                name='Platform'
            ),
            row=1, col=1
        )
        
        # Geographic distribution
        geo_counts = df['country'].value_counts()
        fig.add_trace(
            go.Bar(
                x=geo_counts.index,
                y=geo_counts.values,
                text=geo_counts.values,
                textposition='auto',
                name='Country'
            ),
            row=2, col=1
        )
        
        # Version distribution
        version_counts = df['version'].value_counts()
        fig.add_trace(
            go.Bar(
                x=version_counts.index,
                y=version_counts.values,
                text=version_counts.values,
                textposition='auto',
                name='Version'
            ),
            row=3, col=1
        )
        
        fig.update_layout(
            height=1200,
            title_text=f"Download Trends Report ({start_time[:10]} to {now.date()})",
            showlegend=False
        )
        
        # Save report
        report_path = f"reports/weekly/{now.strftime('%Y-%m-%d')}.html"
        report_html = fig.to_html(
            include_plotlyjs="cdn",
            full_html=True,
            config={'displayModeBar': False}
        )
        
        s3.put_object(
            Bucket=reports_bucket,
            Key=report_path,
            Body=report_html,
            ContentType='text/html'
        )
        
        # Send notification with report link
        report_url = f"https://{reports_bucket}.s3.amazonaws.com/{report_path}"
        message = {
            'type': 'report',
            'url': report_url,
            'period': 'weekly',
            'start_date': start_time[:10],
            'end_date': now.strftime('%Y-%m-%d'),
            'summary': {
                'total_downloads': len(downloads),
                'platforms': platform_counts.to_dict(),
                'top_countries': geo_counts.head(3).to_dict(),
                'top_versions': version_counts.head(3).to_dict()
            }
        }
        
        sns.publish(
            TopicArn=topic_arn,
            Message=json.dumps(message),
            MessageAttributes={
                'type': {
                    'DataType': 'String',
                    'StringValue': 'report'
                }
            }
        )
        
    except Exception as e:
        print(f"Error generating trend report: {e}")

def lambda_handler(event: Dict, context: Any) -> Dict:
    """Handle Lambda events."""
    try:
        # Check event type
        if 'Records' in event and 'dynamodb' in event['Records'][0]:
            # DynamoDB stream event - process download
            process_download_event(event)
        else:
            # CloudWatch scheduled event - generate report
            generate_trend_report()
        
        return {
            'statusCode': 200,
            'body': json.dumps('Processing complete')
        }
        
    except Exception as e:
        print(f"Error in lambda_handler: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps('Error processing event')
        }
