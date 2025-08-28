#!/usr/bin/env python3

import argparse
import json
import os
from datetime import datetime
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
from jinja2 import Environment, FileSystemLoader

def load_json(file_path):
    with open(file_path, 'r') as f:
        return json.load(f)

def create_downloads_chart(stats_data):
    # Extract daily download data
    dates = list(stats_data['daily_downloads'].keys())
    versions = list(stats_data['daily_downloads'][dates[0]].keys())
    platforms = ['macos', 'windows', 'linux']
    
    data = []
    for date in dates:
        for version in versions:
            for platform in platforms:
                count = stats_data['daily_downloads'][date][version][platform]
                data.append({
                    'date': date,
                    'version': version,
                    'platform': platform.title(),
                    'downloads': count
                })
    
    df = pd.DataFrame(data)
    fig = px.line(df, x='date', y='downloads', 
                  color='platform', facet_row='version',
                  title='Daily Downloads by Version and Platform',
                  labels={'platform': 'Platform', 'date': 'Date', 'downloads': 'Downloads'})
    
    # Improve layout
    fig.update_layout(
        height=600,
        showlegend=True,
        legend=dict(
            yanchor="top",
            y=0.99,
            xanchor="left",
            x=0.01
        ),
        margin=dict(t=60, r=20, b=40, l=60)
    )
    return fig.to_html(full_html=False, include_plotlyjs='cdn')

def create_platform_distribution(stats_data):
    # Use cumulative data for platform distribution
    platforms = ['macos', 'windows', 'linux']
    versions = list(stats_data['cumulative_downloads'].keys())
    
    data = []
    for version in versions:
        for platform in platforms:
            count = stats_data['cumulative_downloads'][version][platform]
            data.append({
                'version': version,
                'platform': platform.title(),
                'downloads': count
            })
    
    df = pd.DataFrame(data)
    fig = px.pie(df, values='downloads', names='platform',
                 title='Platform Distribution',
                 labels={'platform': 'Platform', 'downloads': 'Total Downloads'})
    
    # Improve layout
    fig.update_layout(
        showlegend=True,
        legend=dict(
            yanchor="top",
            y=0.99,
            xanchor="left",
            x=0.7
        ),
        margin=dict(t=60, r=20, b=40, l=60)
    )
    return fig.to_html(full_html=False, include_plotlyjs=False)

def generate_report(manifest_path, stats_path=None, output_path='version-report.html'):
    manifest = load_json(manifest_path)
    
    # Basic version info
    context = {
        'latest_version': manifest['latest'],
        'latest_beta': manifest.get('latest_beta'),
        'minimum_supported': manifest['minimum_supported'],
        'generated_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC'),
        'has_stats': False
    }
    
    # Version details
    versions = []
    for ver, details in manifest['versions'].items():
        details['version'] = ver
        versions.append(details)
    context['versions'] = sorted(versions, key=lambda x: x['version'], reverse=True)
    
    # Beta versions
    if 'beta' in manifest:
        beta_versions = []
        for ver, details in manifest['beta'].items():
            details['version'] = ver
            beta_versions.append(details)
        context['beta_versions'] = sorted(beta_versions, 
                                        key=lambda x: x['version'],
                                        reverse=True)
    
    # Add download statistics if available
    if stats_path and os.path.exists(stats_path):
        stats_data = load_json(stats_path)
        context['has_stats'] = True
        context['downloads_chart'] = create_downloads_chart(stats_data)
        context['platform_chart'] = create_platform_distribution(stats_data)
        
        # Calculate total downloads
        total = 0
        for version in stats_data['cumulative_downloads']:
            for platform in stats_data['cumulative_downloads'][version]:
                total += stats_data['cumulative_downloads'][version][platform]
        context['total_downloads'] = total
    
    # Load template and render
    env = Environment(loader=FileSystemLoader('templates'))
    template = env.get_template('report.html')
    output = template.render(context)
    
    with open(output_path, 'w') as f:
        f.write(output)

def main():
    parser = argparse.ArgumentParser(description='Generate version report')
    parser.add_argument('manifest', help='Path to version manifest JSON')
    parser.add_argument('--stats', help='Path to download statistics JSON')
    parser.add_argument('--output', default='version-report.html',
                       help='Output path for HTML report')
    
    args = parser.parse_args()
    generate_report(args.manifest, args.stats, args.output)

if __name__ == '__main__':
    main()
