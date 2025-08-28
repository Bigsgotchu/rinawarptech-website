import { NextRequest, NextResponse } from 'next/server';

interface DownloadInfo {
  url: string;
  filename: string;
  version: string;
}

const DOWNLOADS: Record<string, DownloadInfo> = {
  macos: {
    url: process.env.MACOS_DOWNLOAD_URL || 'https://downloads.rinawarptech.com/RinaWarp-1.0.0.dmg',
    filename: 'RinaWarp-1.0.0.dmg',
    version: '1.0.0'
  },
  windows: {
    url: process.env.WINDOWS_DOWNLOAD_URL || 'https://downloads.rinawarptech.com/RinaWarp-1.0.0.exe',
    filename: 'RinaWarp-1.0.0.exe',
    version: '1.0.0'
  },
  linux: {
    url: process.env.LINUX_DOWNLOAD_URL || 'https://downloads.rinawarptech.com/RinaWarp-1.0.0.AppImage',
    filename: 'RinaWarp-1.0.0.AppImage',
    version: '1.0.0'
  }
};

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  const { platform } = params;
  
  if (!platform) {
    return new NextResponse('Platform parameter is required', { status: 400 });
  }
  
  const key = platform.toLowerCase();
  const download = DOWNLOADS[key];

  if (!download) {
    return new NextResponse('Platform not supported', { status: 400 });
  }

  // Verify the download URL exists
  if (!download.url) {
    console.error(`Download URL not configured for platform: ${key}`);
    return new NextResponse('Download URL not configured', { status: 500 });
  }

  // Track the download if analytics is configured
  if (process.env.ANALYTICS_API_URL && process.env.ANALYTICS_API_KEY) {
    try {
      const analyticsResponse = await fetch(process.env.ANALYTICS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ANALYTICS_API_KEY}`
        },
        body: JSON.stringify({
          event: 'download',
          platform: key,
          version: download.version,
          userAgent: request.headers.get('user-agent'),
          timestamp: new Date().toISOString(),
          referer: request.headers.get('referer')
        })
      });

      if (!analyticsResponse.ok) {
        console.error('Analytics API error:', await analyticsResponse.text());
      }
    } catch (error) {
      // Log error but don't block the download
      console.error('Failed to track download:', error);
    }
  }

  // Start the download immediately
  return NextResponse.redirect(download.url, { status: 302 });
}
