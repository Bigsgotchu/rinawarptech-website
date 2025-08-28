#!/usr/bin/env python3
import argparse
import json
from datetime import datetime
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd
import os

def load_manifest(file_path: str) -> dict:
    """Load version manifest."""
    with open(file_path, 'r') as f:
        return json.load(f)

def create_size_comparison_chart(manifest: dict, versions: list) -> go.Figure:
    """Create size comparison bar chart."""
    platforms = set()
    data = []
    
    # Collect all platforms and data
    for version in versions:
        version_info = manifest['versions'].get(version) or manifest['beta'].get(version)
        if version_info:
            for platform, info in version_info['platforms'].items():
                platforms.add(platform)
                data.append({
                    'version': version,
                    'platform': platform,
                    'size': info['size'] / 1024 / 1024  # Convert to MB
                })
    
    fig = go.Figure()
    
    for platform in sorted(platforms):
        platform_data = [d for d in data if d['platform'] == platform]
        fig.add_trace(go.Bar(
            name=platform,
            x=[d['version'] for d in platform_data],
            y=[d['size'] for d in platform_data],
            text=[f"{size:.1f} MB" for size in [d['size'] for d in platform_data]],
            textposition='auto',
        ))
    
    fig.update_layout(
        title='Installer Size by Platform',
        barmode='group',
        xaxis_title='Version',
        yaxis_title='Size (MB)'
    )
    
    return fig
    platforms = set(old_version['platforms'].keys()) | set(new_version['platforms'].keys())
    old_sizes = [old_version['platforms'].get(p, {}).get('size', 0) / 1024 / 1024 for p in platforms]
    new_sizes = [new_version['platforms'].get(p, {}).get('size', 0) / 1024 / 1024 for p in platforms]
    
    fig = go.Figure(data=[
        go.Bar(name=f'Old ({next(iter(old_version["platforms"].values()))["version"]})', 
               x=list(platforms), y=old_sizes),
        go.Bar(name=f'New ({next(iter(new_version["platforms"].values()))["version"]})', 
               x=list(platforms), y=new_sizes)
    ])
    
    fig.update_layout(
        title='Installer Size Comparison (MB)',
        barmode='group',
        yaxis_title='Size (MB)'
    )
    
    return fig

def create_download_stats_chart(manifest: dict, versions: list) -> go.Figure:
    """Create download statistics visualization."""
    data = []
    
    for version in versions:
        version_info = manifest['versions'].get(version) or manifest['beta'].get(version)
        if version_info and 'stats' in version_info:
            stats = version_info['stats']
            data.append({
                'version': version,
                'downloads': stats['total_downloads'],
                'active_users': stats['active_users'],
            })
    
    fig = go.Figure()
    
    # Add total downloads bar
    fig.add_trace(go.Bar(
        name='Total Downloads',
        x=[d['version'] for d in data],
        y=[d['downloads'] for d in data],
        text=[f"{d['downloads']:,}" for d in data],
        textposition='auto',
    ))
    
    # Add active users line
    fig.add_trace(go.Scatter(
        name='Active Users',
        x=[d['version'] for d in data],
        y=[d['active_users'] for d in data],
        mode='lines+markers+text',
        text=[f"{d['active_users']:,}" for d in data],
        textposition='top center',
    ))
    
    fig.update_layout(
        title='Download Statistics by Version',
        xaxis_title='Version',
        yaxis_title='Count',
        barmode='group'
    )
    
    return fig

def create_geographic_chart(manifest: dict, versions: list) -> go.Figure:
    """Create geographic distribution visualization."""
    data = []
    regions = set()
    
    for version in versions:
        version_info = manifest['versions'].get(version) or manifest['beta'].get(version)
        if version_info and 'stats' in version_info:
            stats = version_info['stats']
            if 'by_region' in stats:
                for region, count in stats['by_region'].items():
                    regions.add(region)
                    data.append({
                        'version': version,
                        'region': region,
                        'users': count
                    })
    
    fig = go.Figure()
    
    for region in sorted(regions):
        region_data = [d for d in data if d['region'] == region]
        fig.add_trace(go.Bar(
            name=region,
            x=[d['version'] for d in region_data],
            y=[d['users'] for d in region_data],
            text=[f"{d['users']:,}" for d in region_data],
            textposition='auto',
        ))
    
    fig.update_layout(
        title='Geographic Distribution by Version',
        xaxis_title='Version',
        yaxis_title='Users',
        barmode='stack'
    )
    
    return fig

def create_timeline_widget(manifest: dict, width: int = 800, height: int = 300) -> str:
    """Create an embeddable timeline widget."""
    fig = create_release_timeline(manifest)
    
    # Update layout for widget format
    fig.update_layout(
        margin=dict(l=50, r=20, t=70, b=40),
        height=height,
        width=width,
        title={
            'text': 'Release Timeline',
            'y': 0.95,
            'x': 0.5,
            'xanchor': 'center',
            'yanchor': 'top'
        },
        plot_bgcolor='white',
        paper_bgcolor='white',
    )
    
    # Generate standalone HTML with minimal dependencies
    widget_html = f"""
    <div class="timeline-widget" style="width: {width}px; height: {height}px;">
        {fig.to_html(full_html=False, include_plotlyjs='cdn')}
    </div>
    <style>
        .timeline-widget {{{{ 
            border: 1px solid #eee;
            border-radius: 4px;
            padding: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}}}
    </style>
    """
    
    return widget_html

def create_subscription_chart(manifest: dict, versions: list) -> go.Figure:
    """Create subscription distribution visualization."""
    data = []
    tiers = set()
    
    for version in versions:
        version_info = manifest['versions'].get(version) or manifest['beta'].get(version)
        if version_info and 'stats' in version_info:
            stats = version_info['stats']
            if 'by_subscription' in stats:
                for tier, count in stats['by_subscription'].items():
                    tiers.add(tier)
                    data.append({
                        'version': version,
                        'tier': tier,
                        'users': count
                    })
    
    fig = go.Figure()
    
    for tier in sorted(tiers):
        tier_data = [d for d in data if d['tier'] == tier]
        fig.add_trace(go.Bar(
            name=tier.title(),
            x=[d['version'] for d in tier_data],
            y=[d['users'] for d in tier_data],
            text=[f"{d['users']:,}" for d in tier_data],
            textposition='auto',
        ))
    
    fig.update_layout(
        title='Subscription Distribution by Version',
        xaxis_title='Version',
        yaxis_title='Users',
        barmode='stack'
    )
    
    return fig

def create_architecture_chart(manifest: dict, versions: list) -> go.Figure:
    """Create architecture support chart."""
    data = []
    
    for version in versions:
        version_info = manifest['versions'].get(version) or manifest['beta'].get(version)
        if version_info:
            for platform, info in version_info['platforms'].items():
                for arch in info['architecture']:
                    data.append({
                        'version': version,
                        'platform': platform,
                        'architecture': arch
                    })
    
    # Create heatmap data
    df = pd.DataFrame(data)
    pivot = pd.crosstab(df['platform'], df['version'])
    
    fig = go.Figure(data=go.Heatmap(
        z=pivot.values,
        x=pivot.columns,
        y=pivot.index,
        text=pivot.values,
        texttemplate="%{text} arch",
        colorscale='Viridis'
    ))
    
    fig.update_layout(
        title='Architecture Support by Platform',
        xaxis_title='Version',
        yaxis_title='Platform'
    )
    
    return fig
    platforms = set(old_version['platforms'].keys()) | set(new_version['platforms'].keys())
    
    old_archs = {p: len(old_version['platforms'].get(p, {}).get('architecture', [])) 
                 for p in platforms}
    new_archs = {p: len(new_version['platforms'].get(p, {}).get('architecture', [])) 
                 for p in platforms}
    
    fig = go.Figure(data=[
        go.Bar(name=f'Old ({next(iter(old_version["platforms"].values()))["version"]})', 
               x=list(platforms), y=list(old_archs.values())),
        go.Bar(name=f'New ({next(iter(new_version["platforms"].values()))["version"]})', 
               x=list(platforms), y=list(new_archs.values()))
    ])
    
    fig.update_layout(
        title='Architecture Support by Platform',
        barmode='group',
        yaxis_title='Number of Supported Architectures'
    )
    
    return fig

def create_release_timeline(manifest: dict) -> go.Figure:
    """Create release timeline visualization."""
    versions = []
    dates = []
    types = []
    
    # Process stable versions
    for version, info in manifest.get('versions', {}).items():
        versions.append(version)
        dates.append(info['release_date'])
        types.append('stable')
    
    # Process beta versions
    for version, info in manifest.get('beta', {}).items():
        versions.append(version)
        dates.append(info['release_date'])
        types.append('beta')
    
    # Convert to pandas for easier plotting
    df = pd.DataFrame({
        'version': versions,
        'date': pd.to_datetime(dates),
        'type': types
    }).sort_values('date')
    
    fig = go.Figure()
    
    # Add stable releases
    stable = df[df['type'] == 'stable']
    fig.add_trace(go.Scatter(
        x=stable['date'],
        y=stable['version'],
        mode='markers+text',
        name='Stable',
        text=stable['version'],
        textposition="top center",
        marker=dict(size=15, symbol='circle', color='green')
    ))
    
    # Add beta releases
    beta = df[df['type'] == 'beta']
    fig.add_trace(go.Scatter(
        x=beta['date'],
        y=beta['version'],
        mode='markers+text',
        name='Beta',
        text=beta['version'],
        textposition="top center",
        marker=dict(size=12, symbol='diamond', color='orange')
    ))
    
    fig.update_layout(
        title='Release Timeline',
        xaxis_title='Release Date',
        yaxis_title='Version',
        showlegend=True
    )
    
    return fig

def generate_widget(manifest: dict, output_dir: str):
    """Generate embeddable timeline widget."""
    widget_html = create_timeline_widget(manifest)
    
    # Save widget
    os.makedirs(output_dir, exist_ok=True)
    with open(os.path.join(output_dir, 'timeline-widget.html'), 'w') as f:
        f.write(widget_html)
    print(f"\nWidget generated in {output_dir}/timeline-widget.html")

def generate_html_report(manifest: dict, versions: list, output_dir: str):
    """Generate HTML report with visualizations."""
    # Create charts
    size_fig = create_size_comparison_chart(manifest, versions)
    download_fig = create_download_stats_chart(manifest, versions)
    subscription_fig = create_subscription_chart(manifest, versions)
    geographic_fig = create_geographic_chart(manifest, versions)
    arch_fig = create_architecture_chart(manifest, versions)
    timeline_fig = create_release_timeline(manifest)
    
    # Create HTML
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>RinaWarp Version Comparison</title>
        <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 20px; }}
            .chart {{ margin: 20px 0; }}
            table {{ border-collapse: collapse; width: 100%; margin: 20px 0; }}
            th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
            th {{ background-color: #f5f5f5; }}
            .changes {{ margin: 20px 0; }}
            .added {{ color: green; }}
            .removed {{ color: red; }}
            .modified {{ color: orange; }}
        </style>
    </head>
    <body>
        <h1>Version Comparison Report</h1>
        
        <div class="chart">
            <h2>Timeline</h2>
            {timeline_fig.to_html(full_html=False)}
        </div>
        
        <div class="chart">
            <h2>Size Comparison</h2>
            {size_fig.to_html(full_html=False)}
        </div>
        
        <div class="chart">
            <h2>Download Statistics</h2>
            {download_fig.to_html(full_html=False)}
        </div>
        
        <div class="chart">
            <h2>Subscription Distribution</h2>
            {subscription_fig.to_html(full_html=False)}
        </div>
        
        <div class="chart">
            <h2>Geographic Distribution</h2>
            {geographic_fig.to_html(full_html=False)}
        </div>

        <div class="chart">
            <h2>Architecture Support</h2>
            {arch_fig.to_html(full_html=False)}
        </div>
        
        <div class="changes">
            <h2>Changes Summary</h2>
            <h3>Platform Changes</h3>
            <ul>
    """
    
    # Add version summary
    for version in versions:
        version_info = manifest['versions'].get(version) or manifest['beta'].get(version)
        if version_info:
            html += f'<li>{version}: {version_info.get("release_notes", "No release notes available")}</li>\n'
    
    html += """
            </ul>
        </div>
    </body>
    </html>
    """
    
    # Save report
    os.makedirs(output_dir, exist_ok=True)
    with open(os.path.join(output_dir, 'report.html'), 'w') as f:
        f.write(html)

def main():
    parser = argparse.ArgumentParser(description="Generate visual version comparison report")
    parser.add_argument("versions", nargs="+", help="Versions to compare")
    parser.add_argument("--manifest", default="test-manifest.json",
                      help="Path to version manifest")
    parser.add_argument("--output-dir", default="reports",
                      help="Output directory for report")
    parser.add_argument("--generate-widget", action="store_true",
                      help="Generate embeddable timeline widget")
    
    args = parser.parse_args()
    manifest = load_manifest(args.manifest)
    
    # Verify versions exist
    for version in args.versions:
        if version not in manifest.get('versions', {}) and version not in manifest.get('beta', {}):
            print(f"Error: Version {version} not found in manifest")
            return
    
    # Generate comparison report
    generate_html_report(manifest, args.versions, args.output_dir)
    print(f"\nReport generated in {args.output_dir}/report.html")
    
    # Generate widget if requested
    if args.generate_widget:
        generate_widget(manifest, args.output_dir)

if __name__ == '__main__':
    main()
