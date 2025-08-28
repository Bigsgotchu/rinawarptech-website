import React from 'react';

interface DownloadOption {
  os: string;
  icon: string;
  primaryText: string;
  secondaryText: string;
  downloadUrl: string;
}

const downloads: DownloadOption[] = [
  {
    os: 'macOS',
    icon: '🍎',
    primaryText: 'Download for macOS',
    secondaryText: 'Apple Silicon & Intel',
    downloadUrl: '/api/download/macos'
  },
  {
    os: 'Windows',
    icon: '🪟',
    primaryText: 'Download for Windows',
    secondaryText: '64-bit installer',
    downloadUrl: '/api/download/windows'
  },
  {
    os: 'Linux',
    icon: '🐧',
    primaryText: 'Download for Linux',
    secondaryText: '.deb, .rpm, or AppImage',
    downloadUrl: '/api/download/linux'
  }
];

export function Download() {
  return (
    <section id="download" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Download RinaWarp Terminal
          </h2>
          <p className="text-xl text-gray-600">
            Available for all major platforms. Start for free today.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {downloads.map((option) => (
            <div
              key={option.os}
              className="bg-gradient-to-br from-lightBlue1 to-lightBlue2 p-8 rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="text-4xl mb-4">{option.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {option.primaryText}
              </h3>
              <p className="text-gray-600 mb-6">
                {option.secondaryText}
              </p>
              <a
                href={option.downloadUrl}
                className="block w-full text-center px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
              >
                Download Now
              </a>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-600">
            By downloading, you agree to our{' '}
            <a href="/terms" className="text-primary hover:text-primary-dark">
              Terms of Service
            </a>
            {' '}and{' '}
            <a href="/privacy" className="text-primary hover:text-primary-dark">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
