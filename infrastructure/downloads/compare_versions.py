#!/usr/bin/env python3
import argparse
import json
import subprocess
import sys
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import semantic_version

@dataclass
class VersionChange:
    type: str  # added, removed, modified
    component: str  # feature, bugfix, etc.
    description: str
    platform: Optional[str] = None

def load_manifest(file_path: str) -> dict:
    """Load version manifest from file."""
    with open(file_path, 'r') as f:
        return json.load(f)

def get_version_details(manifest: dict, version: str, include_beta: bool = False) -> Optional[dict]:
    """Get details for a specific version."""
    if version in manifest.get('versions', {}):
        return manifest['versions'][version]
    elif include_beta and version in manifest.get('beta', {}):
        return manifest['beta'][version]
    return None

def compare_platform_info(old_info: dict, new_info: dict) -> List[VersionChange]:
    """Compare platform-specific information between versions."""
    changes = []
    
    # Compare basic fields
    for field in ['min_os', 'architecture']:
        if old_info.get(field) != new_info.get(field):
            changes.append(VersionChange(
                type='modified',
                component='platform',
                description=f'Updated {field}: {old_info.get(field)} → {new_info.get(field)}',
                platform=new_info.get('platform')
            ))
    
    # Compare size changes
    old_size = old_info.get('size', 0)
    new_size = new_info.get('size', 0)
    if old_size != new_size:
        size_diff = new_size - old_size
        sign = '+' if size_diff > 0 else ''
        changes.append(VersionChange(
            type='modified',
            component='platform',
            description=f'Size changed by {sign}{size_diff} bytes',
            platform=new_info.get('platform')
        ))
    
    return changes

def get_commit_details(from_ref: str, to_ref: str) -> List[dict]:
    """Get detailed commit information between two refs."""
    cmd = [
        'git', 'log', '--no-merges',
        '--pretty=format:%H|%s|%an|%at|%b',
        f'{from_ref}..{to_ref}'
    ]
    
    try:
        output = subprocess.check_output(cmd, text=True)
        commits = []
        for line in output.split('\n'):
            if not line:
                continue
            parts = line.split('|', 4)
            if len(parts) >= 4:
                hash, subject, author, timestamp = parts[:4]
                body = parts[4] if len(parts) > 4 else ''
                commits.append({
                    'hash': hash,
                    'subject': subject,
                    'author': author,
                    'timestamp': int(timestamp),
                    'body': body
                })
        return commits
    except subprocess.CalledProcessError:
        return []

def compare_versions(old_version: str, new_version: str, manifest_path: str) -> Tuple[List[VersionChange], List[dict]]:
    """Compare two versions and generate changelog."""
    manifest = load_manifest(manifest_path)
    
    old_details = get_version_details(manifest, old_version, True)
    new_details = get_version_details(manifest, new_version, True)
    
    if not old_details or not new_details:
        print("Error: One or both versions not found in manifest")
        sys.exit(1)
    
    changes = []
    
    # Compare release notes
    if old_details.get('release_notes') != new_details.get('release_notes'):
        changes.append(VersionChange(
            type='modified',
            component='documentation',
            description='Release notes updated'
        ))
    
    # Compare critical flag
    if old_details.get('critical') != new_details.get('critical'):
        changes.append(VersionChange(
            type='modified',
            component='release',
            description=f"Critical flag changed: {old_details.get('critical')} → {new_details.get('critical')}"
        ))
    
    # Compare platforms
    old_platforms = set(old_details.get('platforms', {}).keys())
    new_platforms = set(new_details.get('platforms', {}).keys())
    
    # Added platforms
    for platform in new_platforms - old_platforms:
        changes.append(VersionChange(
            type='added',
            component='platform',
            description=f'Added support for {platform}',
            platform=platform
        ))
    
    # Removed platforms
    for platform in old_platforms - new_platforms:
        changes.append(VersionChange(
            type='removed',
            component='platform',
            description=f'Removed support for {platform}',
            platform=platform
        ))
    
    # Modified platforms
    for platform in old_platforms & new_platforms:
        old_platform = old_details['platforms'][platform]
        new_platform = new_details['platforms'][platform]
        changes.extend(compare_platform_info(old_platform, new_platform))
    
    # Get commit history between versions
    commits = get_commit_details(f'v{old_version}', f'v{new_version}')
    
    return changes, commits

def format_changelog(changes: List[VersionChange], commits: List[dict], format: str = 'markdown') -> str:
    """Format changelog in the specified format."""
    if format == 'markdown':
        lines = []
        
        # Platform Changes
        platform_changes = [c for c in changes if c.component == 'platform']
        if platform_changes:
            lines.append("\n## Platform Changes\n")
            for change in platform_changes:
                platform = f" ({change.platform})" if change.platform else ""
                lines.append(f"- {change.description}{platform}")
        
        # Feature Changes
        feature_changes = [c for c in changes if c.component == 'feature']
        if feature_changes:
            lines.append("\n## Feature Changes\n")
            for change in feature_changes:
                lines.append(f"- {change.description}")
        
        # Commits
        if commits:
            lines.append("\n## Commits\n")
            for commit in commits:
                subject = commit['subject']
                hash = commit['hash'][:7]
                lines.append(f"- {subject} ({hash})")
        
        return '\n'.join(lines)
    
    elif format == 'json':
        return json.dumps({
            'changes': [vars(c) for c in changes],
            'commits': commits
        }, indent=2)
    
    else:
        return "Unsupported format"

def main():
    parser = argparse.ArgumentParser(description="Compare two versions and generate changelog")
    parser.add_argument("old_version", help="Old version number")
    parser.add_argument("new_version", help="New version number")
    parser.add_argument("--manifest", default="version-manifest.json",
                      help="Path to version manifest")
    parser.add_argument("--format", choices=['markdown', 'json'],
                      default='markdown', help="Output format")
    parser.add_argument("--output", help="Output file (default: stdout)")
    
    args = parser.parse_args()
    
    try:
        old_ver = semantic_version.Version(args.old_version.replace('-beta.', '-beta'))
        new_ver = semantic_version.Version(args.new_version.replace('-beta.', '-beta'))
        
        if old_ver >= new_ver:
            print("Error: Old version must be less than new version")
            sys.exit(1)
    except ValueError as e:
        print(f"Error: Invalid version format - {e}")
        sys.exit(1)
    
    changes, commits = compare_versions(args.old_version, args.new_version, args.manifest)
    output = format_changelog(changes, commits, args.format)
    
    if args.output:
        with open(args.output, 'w') as f:
            f.write(output)
        print(f"\nChangelog written to {args.output}")
    else:
        print(output)

if __name__ == "__main__":
    main()
