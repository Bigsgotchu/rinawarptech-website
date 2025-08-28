#!/usr/bin/env python3
import argparse
import json
import os
import subprocess
import requests
from typing import Dict, List, Optional
import semantic_version
from datetime import datetime

class GitHubRelease:
    def __init__(self, token: str, repo: str):
        self.token = token
        self.repo = repo
        self.api_base = f"https://api.github.com/repos/{repo}"
        self.headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json"
        }

    def create_release(self, 
                      tag: str,
                      name: str,
                      body: str,
                      files: List[str],
                      prerelease: bool = False,
                      draft: bool = False) -> Dict:
        """Create a GitHub release with assets."""
        # Create release
        release_data = {
            "tag_name": tag,
            "name": name,
            "body": body,
            "draft": draft,
            "prerelease": prerelease
        }
        
        response = requests.post(
            f"{self.api_base}/releases",
            headers=self.headers,
            json=release_data
        )
        response.raise_for_status()
        release = response.json()
        
        # Upload assets
        upload_url = release['upload_url'].split('{')[0]
        for file_path in files:
            if not os.path.exists(file_path):
                print(f"Warning: File not found: {file_path}")
                continue
            
            filename = os.path.basename(file_path)
            content_type = self._get_content_type(filename)
            
            with open(file_path, 'rb') as f:
                response = requests.post(
                    f"{upload_url}?name={filename}",
                    headers={
                        **self.headers,
                        "Content-Type": content_type
                    },
                    data=f.read()
                )
                response.raise_for_status()
        
        return release

    def _get_content_type(self, filename: str) -> str:
        """Get content type based on file extension."""
        ext = filename.lower().split('.')[-1]
        return {
            'dmg': 'application/x-apple-diskimage',
            'exe': 'application/vnd.microsoft.portable-executable',
            'appimage': 'application/x-executable',
            'json': 'application/json',
            'md': 'text/markdown'
        }.get(ext, 'application/octet-stream')

def get_repo_info() -> Optional[str]:
    """Get repository info from git remote."""
    try:
        remote = subprocess.check_output(['git', 'remote', 'get-url', 'origin'],
                                      text=True).strip()
        if 'github.com' in remote:
            # Extract owner/repo from various URL formats
            if remote.startswith('git@github.com:'):
                repo = remote.split('git@github.com:')[1]
            else:
                repo = remote.split('github.com/')[1]
            return repo.replace('.git', '')
    except subprocess.CalledProcessError:
        return None

def load_manifest(file_path: str) -> dict:
    """Load version manifest."""
    with open(file_path, 'r') as f:
        return json.load(f)

def get_version_assets(manifest: dict, version: str) -> List[str]:
    """Get list of asset files for a version."""
    version_info = None
    is_beta = False
    
    if version in manifest.get('versions', {}):
        version_info = manifest['versions'][version]
    elif version in manifest.get('beta', {}):
        version_info = manifest['beta'][version]
        is_beta = True
    
    if not version_info:
        return []
    
    assets = []
    base_path = 'beta' if is_beta else ''
    
    for platform, info in version_info['platforms'].items():
        url = info['url']
        filename = url.split('/')[-1]
        path = os.path.join(base_path, f'v{version}', platform, filename)
        if os.path.exists(path):
            assets.append(path)
    
    return assets

def main():
    parser = argparse.ArgumentParser(description="Create GitHub release from version")
    parser.add_argument("version", help="Version to release")
    parser.add_argument("--token", help="GitHub token (or set GITHUB_TOKEN env var)")
    parser.add_argument("--repo", help="GitHub repository (owner/repo)")
    parser.add_argument("--manifest", default="version-manifest.json",
                      help="Path to version manifest")
    parser.add_argument("--draft", action="store_true",
                      help="Create as draft release")
    parser.add_argument("--assets-dir", default=".",
                      help="Base directory for assets")
    
    args = parser.parse_args()
    
    # Get GitHub token
    token = args.token or os.environ.get('GITHUB_TOKEN')
    if not token:
        print("Error: GitHub token required (--token or GITHUB_TOKEN env var)")
        sys.exit(1)
    
    # Get repo info
    repo = args.repo or get_repo_info()
    if not repo:
        print("Error: Could not determine GitHub repository")
        sys.exit(1)
    
    # Load manifest
    try:
        manifest = load_manifest(args.manifest)
    except Exception as e:
        print(f"Error loading manifest: {e}")
        sys.exit(1)
    
    # Get version info
    version = args.version
    is_beta = '-beta' in version
    version_info = None
    
    if version in manifest.get('versions', {}):
        version_info = manifest['versions'][version]
    elif version in manifest.get('beta', {}):
        version_info = manifest['beta'][version]
    
    if not version_info:
        print(f"Error: Version {version} not found in manifest")
        sys.exit(1)
    
    # Get release notes
    notes_file = f"release-notes-{version}.md"
    subprocess.run([
        './generate_notes.py',
        version,
        '--beta' if is_beta else '',
        '--output', notes_file
    ])
    
    with open(notes_file, 'r') as f:
        release_notes = f.read()
    
    # Get assets
    assets = get_version_assets(manifest, version)
    if not assets:
        print("Warning: No assets found for version")
    
    # Create release
    gh = GitHubRelease(token, repo)
    try:
        release = gh.create_release(
            tag=f"v{version}",
            name=f"RinaWarp Terminal {version}",
            body=release_notes,
            files=assets,
            prerelease=is_beta,
            draft=args.draft
        )
        print(f"\nCreated release: {release['html_url']}")
        
        # Clean up notes file
        os.remove(notes_file)
        
    except Exception as e:
        print(f"Error creating release: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
