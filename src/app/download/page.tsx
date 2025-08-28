'use client';

import React from 'react';
import { startDownload } from './downloadStarter';

interface DownloadOption {
  platform: string;
  icon: string;
  title: string;
  description: string;
  downloadUrl: string;
  installCommand: string;
  architectures: string[];
  version: string;
  releaseDate: string;
  size: string;
}

const downloads: DownloadOption[] = [
  {
    platform: 'macOS',
    icon: '🍎',
    title: 'RinaWarp for macOS',
    description: 'Native app for macOS 11.0 (Big Sur) or later',
    downloadUrl: '/api/download/macos',
    installCommand: 'brew install rinawarp-terminal',
    architectures: ['Apple Silicon', 'Intel'],
    version: '1.0.0',
    releaseDate: 'August 24, 2025',
    size: '24.5 MB'
  },
  {
    platform: 'Windows',
    icon: '🪟',
    title: 'RinaWarp for Windows',
    description: 'Native app for Windows 10/11',
    downloadUrl: '/api/download/windows',
    installCommand: 'winget install rinawarp-terminal',
    architectures: ['x64'],
    version: '1.0.0',
    releaseDate: 'August 24, 2025',
    size: '28.2 MB'
  },
  {
    platform: 'Linux',
    icon: '🐧',
    title: 'RinaWarp for Linux',
    description: 'Native app for major Linux distributions',
    downloadUrl: '/api/download/linux',
    installCommand: 'curl -fsSL https://get.rinawarp.com | sh',
    architectures: ['x64', 'ARM64'],
    version: '1.0.0',
    releaseDate: 'August 24, 2025',
    size: '22.8 MB'
  }
];

export default function DownloadPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Download RinaWarp Terminal</h1>
          <p className="text-xl text-gray-600">
            Choose your platform to get started with the world&#39;s fastest AI terminal
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 mb-16">
          {downloads.map((option) => (
            <div
              key={option.platform}
              className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 hover:border-primary/20 transition-all hover:shadow-xl"
            >
              <div className="p-6">
                <div className="text-4xl mb-4">{option.icon}</div>
                <h2 className="text-xl font-semibold mb-2">{option.title}</h2>
                <p className="text-gray-600 mb-4">{option.description}</p>
                
                <div className="space-y-2 text-sm text-gray-500 mb-6">
                  <p>Version: {option.version}</p>
                  <p>Released: {option.releaseDate}</p>
                  <p>Size: {option.size}</p>
                  <p>Architectures: {option.architectures.join(', ')}</p>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={() => {
                      startDownload(option.downloadUrl);
                      window.location.href = '/thank-you?type=download';
                    }}
                    className="block w-full py-2 px-4 bg-primary text-white text-center rounded-lg font-semibold hover:bg-primary-dark transition-colors"
                  >
                    Download Now
                  </button>
                  
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Or install via command line:</p>
                    <code className="block text-sm bg-white p-2 rounded border border-gray-200">
                      {option.installCommand}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-primary/10 via-lightBlue1/20 to-lightBlue2/10 rounded-xl p-8">
            <h2 className="text-2xl font-semibold mb-4">System Requirements</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-medium mb-2">macOS</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>macOS 11.0 or later</li>
                  <li>4GB RAM minimum</li>
                  <li>Apple Silicon or Intel</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">Windows</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>Windows 10/11</li>
                  <li>4GB RAM minimum</li>
                  <li>64-bit processor</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">Linux</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>Ubuntu 20.04+</li>
                  <li>4GB RAM minimum</li>
                  <li>x64 or ARM64</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
