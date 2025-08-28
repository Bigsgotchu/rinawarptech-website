'use client';

export function startDownload(url) {
  // Create hidden iframe for download
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);

  // Set src to trigger download
  iframe.src = url;

  // Remove iframe after download starts
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 5000);
}
