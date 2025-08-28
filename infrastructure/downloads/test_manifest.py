#!/usr/bin/env python3
import json
import unittest
from datetime import datetime
import semantic_version
from typing import Dict, Any

class ManifestValidator:
    def __init__(self, manifest: Dict[str, Any]):
        self.manifest = manifest
        self.errors = []

    def validate_version_format(self, version: str) -> bool:
        """Validate semantic version format."""
        try:
            semantic_version.Version(version.replace('-beta.', '-beta'))
            return True
        except ValueError:
            return False

    def validate_url(self, url: str) -> bool:
        """Validate URL format."""
        return (
            url.startswith('https://downloads.rinawarptech.com/') and
            (url.endswith('.dmg') or url.endswith('.exe') or url.endswith('.AppImage'))
        )

    def validate_date_format(self, date_str: str) -> bool:
        """Validate date format (YYYY-MM-DD)."""
        try:
            datetime.strptime(date_str, '%Y-%m-%d')
            return True
        except ValueError:
            return False

    def validate_platform_info(self, platform_info: Dict[str, Any], version: str, is_beta: bool) -> None:
        """Validate platform-specific information."""
        required_fields = ['version', 'url', 'checksum', 'size', 'min_os', 'architecture']
        for field in required_fields:
            if field not in platform_info:
                self.errors.append(f"Missing required field '{field}' in platform info")

        if 'version' in platform_info and platform_info['version'] != version:
            self.errors.append(f"Version mismatch in platform info: {platform_info['version']} != {version}")

        if 'url' in platform_info:
            url = platform_info['url']
            expected_path = f"beta/v{version}" if is_beta else f"v{version}"
            if not url.startswith(f"https://downloads.rinawarptech.com/{expected_path}/"):
                self.errors.append(f"Invalid URL format: {url}")

        if 'architecture' in platform_info and not isinstance(platform_info['architecture'], list):
            self.errors.append("Architecture must be a list")

    def validate_version_info(self, version_info: Dict[str, Any], version: str, is_beta: bool) -> None:
        """Validate version information."""
        required_fields = ['release_date', 'release_notes', 'critical', 'platforms']
        for field in required_fields:
            if field not in version_info:
                self.errors.append(f"Missing required field '{field}' in version info")

        if 'release_date' in version_info and not self.validate_date_format(version_info['release_date']):
            self.errors.append(f"Invalid release date format: {version_info['release_date']}")

        if 'platforms' in version_info:
            for platform, platform_info in version_info['platforms'].items():
                self.validate_platform_info(platform_info, version, is_beta)

        if is_beta:
            if 'expires' not in version_info:
                self.errors.append("Beta release missing expiration date")
            elif not self.validate_date_format(version_info['expires']):
                self.errors.append(f"Invalid expiration date format: {version_info['expires']}")

    def validate(self) -> None:
        """Validate the entire manifest structure."""
        required_fields = ['latest', 'versions', 'minimum_supported']
        for field in required_fields:
            if field not in self.manifest:
                self.errors.append(f"Missing required field '{field}' in manifest")

        if 'latest' in self.manifest and not self.validate_version_format(self.manifest['latest']):
            self.errors.append(f"Invalid latest version format: {self.manifest['latest']}")

        if 'latest_beta' in self.manifest and not self.validate_version_format(self.manifest['latest_beta']):
            self.errors.append(f"Invalid latest beta version format: {self.manifest['latest_beta']}")

        if 'versions' in self.manifest:
            for version, version_info in self.manifest['versions'].items():
                if not self.validate_version_format(version):
                    self.errors.append(f"Invalid version format: {version}")
                self.validate_version_info(version_info, version, False)

        if 'beta' in self.manifest:
            for version, version_info in self.manifest['beta'].items():
                if not self.validate_version_format(version) or 'beta' not in version:
                    self.errors.append(f"Invalid beta version format: {version}")
                self.validate_version_info(version_info, version, True)

        if 'minimum_supported' in self.manifest:
            min_version = self.manifest['minimum_supported']
            if not self.validate_version_format(min_version):
                self.errors.append(f"Invalid minimum supported version format: {min_version}")

class TestManifest(unittest.TestCase):
    def setUp(self):
        with open('version-manifest.json', 'r') as f:
            self.manifest = json.load(f)
        self.validator = ManifestValidator(self.manifest)

    def test_manifest_structure(self):
        """Test basic manifest structure."""
        self.assertIn('latest', self.manifest)
        self.assertIn('versions', self.manifest)
        self.assertIn('minimum_supported', self.manifest)

    def test_version_formats(self):
        """Test version number formats."""
        self.assertTrue(self.validator.validate_version_format(self.manifest['latest']))
        if 'latest_beta' in self.manifest:
            self.assertTrue(self.validator.validate_version_format(self.manifest['latest_beta']))

    def test_version_info(self):
        """Test version information structure."""
        for version, info in self.manifest['versions'].items():
            self.assertIn('release_date', info)
            self.assertIn('release_notes', info)
            self.assertIn('platforms', info)
            self.assertIsInstance(info['critical'], bool)

    def test_beta_versions(self):
        """Test beta version structure."""
        if 'beta' in self.manifest:
            for version, info in self.manifest['beta'].items():
                self.assertIn('beta', version.lower())
                self.assertIn('expires', info)
                self.assertTrue(self.validator.validate_date_format(info['expires']))

    def test_platform_info(self):
        """Test platform-specific information."""
        for version_info in self.manifest['versions'].values():
            for platform_info in version_info['platforms'].values():
                self.assertIn('version', platform_info)
                self.assertIn('url', platform_info)
                self.assertIn('checksum', platform_info)
                self.assertIn('size', platform_info)
                self.assertIn('min_os', platform_info)
                self.assertIn('architecture', platform_info)
                self.assertIsInstance(platform_info['architecture'], list)

    def test_download_urls(self):
        """Test download URL formats."""
        for version_info in self.manifest['versions'].values():
            for platform_info in version_info['platforms'].values():
                self.assertTrue(self.validator.validate_url(platform_info['url']))

    def test_full_validation(self):
        """Run full manifest validation."""
        self.validator.validate()
        self.assertEqual(len(self.validator.errors), 0, f"Validation errors: {self.validator.errors}")

if __name__ == '__main__':
    unittest.main()
