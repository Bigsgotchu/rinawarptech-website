#!/usr/bin/env python3
import subprocess
import re
import argparse
from typing import List, Dict, Optional
from datetime import datetime

def get_git_log(from_tag: Optional[str], to_ref: str = 'HEAD') -> str:
    """Get git log between two references."""
    cmd = ['git', 'log', '--no-merges', '--pretty=format:%s|%h|%an|%at']
    if from_tag:
        cmd.append(f'{from_tag}..{to_ref}')
    else:
        cmd.append(to_ref)
    
    try:
        return subprocess.check_output(cmd, text=True)
    except subprocess.CalledProcessError as e:
        print(f"Error getting git log: {e}")
        return ""

def parse_conventional_commit(message: str) -> Dict[str, str]:
    """Parse a conventional commit message."""
    pattern = r'^(?P<type>feat|fix|docs|style|refactor|perf|test|build|ci|chore)(?:\((?P<scope>[^)]+)\))?: (?P<description>.+)$'
    match = re.match(pattern, message)
    
    if match:
        return match.groupdict()
    return {'type': 'other', 'scope': None, 'description': message}

def categorize_changes(log: str) -> Dict[str, List[Dict[str, str]]]:
    """Categorize changes from git log."""
    if not log:
        return {}
    
    categories = {
        'Features': [],
        'Bug Fixes': [],
        'Performance': [],
        'Other Changes': []
    }
    
    for line in log.split('\n'):
        if not line:
            continue
        
        message, commit_hash, author, timestamp = line.split('|')
        parsed = parse_conventional_commit(message)
        
        change = {
            'description': parsed['description'],
            'commit': commit_hash,
            'author': author,
            'timestamp': int(timestamp)
        }
        
        if parsed['scope']:
            change['scope'] = parsed['scope']
        
        if parsed['type'] == 'feat':
            categories['Features'].append(change)
        elif parsed['type'] == 'fix':
            categories['Bug Fixes'].append(change)
        elif parsed['type'] == 'perf':
            categories['Performance'].append(change)
        else:
            categories['Other Changes'].append(change)
    
    return categories

def format_release_notes(categories: Dict[str, List[Dict[str, str]]], version: str, is_beta: bool = False) -> str:
    """Format release notes in Markdown."""
    lines = []
    
    # Header
    if is_beta:
        lines.append(f"# RinaWarp Terminal {version} (Beta)")
        lines.append("\n⚠️ This is a beta release and may contain bugs or incomplete features.\n")
    else:
        lines.append(f"# RinaWarp Terminal {version}")
    
    lines.append(f"\nRelease Date: {datetime.now().strftime('%Y-%m-%d')}\n")
    
    # Add changes by category
    for category, changes in categories.items():
        if changes:
            lines.append(f"\n## {category}\n")
            for change in sorted(changes, key=lambda x: x['timestamp'], reverse=True):
                description = change['description']
                if 'scope' in change:
                    description = f"**{change['scope']}:** {description}"
                lines.append(f"- {description} ({change['commit']})")
    
    # Add beta notice if applicable
    if is_beta:
        lines.append("\n## ⚠️ Beta Release Notes")
        lines.append("- This version is for testing purposes only")
        lines.append("- Please report any bugs or issues")
        lines.append("- Some features may be incomplete or subject to change")
    
    return '\n'.join(lines)

def generate_release_notes(version: str, from_tag: Optional[str] = None, is_beta: bool = False) -> str:
    """Generate release notes from git history."""
    print(f"Generating release notes for version {version}...")
    
    # Get git log
    log = get_git_log(from_tag)
    if not log:
        print("Warning: No git history found")
        return "No changes recorded for this release."
    
    # Categorize changes
    categories = categorize_changes(log)
    
    # Format release notes
    return format_release_notes(categories, version, is_beta)

def main():
    parser = argparse.ArgumentParser(description="Generate release notes from git history")
    parser.add_argument("version", help="Version number for the release")
    parser.add_argument("--from-tag", help="Previous version tag to generate changes from")
    parser.add_argument("--beta", action="store_true", help="Generate beta release notes")
    parser.add_argument("--output", help="Output file (default: print to stdout)")
    
    args = parser.parse_args()
    
    notes = generate_release_notes(args.version, args.from_tag, args.beta)
    
    if args.output:
        with open(args.output, 'w') as f:
            f.write(notes)
        print(f"\nRelease notes written to {args.output}")
    else:
        print("\n" + notes)

if __name__ == "__main__":
    main()
