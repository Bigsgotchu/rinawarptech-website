import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default function ThankYouPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  // If this is a download, get the download URL from cookie and clear it
  if (searchParams?.type === 'download') {
    const cookieStore = cookies();
    const downloadUrl = cookieStore.get('download_url');
    
    if (downloadUrl) {
      cookieStore.delete('download_url');
      redirect(downloadUrl.value);
    }
  }
  // Expect ?type=download or ?type=contact; anything else 404s
  const type = searchParams?.type;
  if (!type || (type !== 'download' && type !== 'contact' && type !== 'subscription')) {
    notFound();
  }

  const isDownload = type === 'download';
  const isSubscription = type === 'subscription';

  return (
    <main className="min-h-screen bg-white py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-primary/10 p-8 rounded-xl mb-8">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {isDownload ? 'Thank You for Downloading!' : isSubscription ? 'Thank You for Subscribing!' : 'Thanks for Your Interest!'}
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              {isDownload
                ? "You're about to experience the future of terminal development. Check your email for download instructions."
                : isSubscription
                ? 'Your subscription is active. A receipt has been sent to your email.'
                : 'Our team will reach out shortly to discuss your needs and next steps.'}
            </p>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Next Steps</h2>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              {isDownload ? (
                <ol className="space-y-4 text-left">
                  <li className="flex items-center">
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white font-semibold mr-3">1</span>
                    <span>Check your email for the download link</span>
                  </li>
                  <li className="flex items-center">
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white font-semibold mr-3">2</span>
                    <span>Install RinaWarp Terminal on your system</span>
                  </li>
                  <li className="flex items-center">
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white font-semibold mr-3">3</span>
                    <span>Start with our Getting Started guide</span>
                  </li>
                  <li className="flex items-center">
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white font-semibold mr-3">4</span>
                    <span>Join our community for support</span>
                  </li>
                </ol>
              ) : isSubscription ? (
                <ol className="space-y-4 text-left">
                  <li className="flex items-center">
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white font-semibold mr-3">1</span>
                    <span>Open RinaWarp Terminal and sign in with your email</span>
                  </li>
                  <li className="flex items-center">
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white font-semibold mr-3">2</span>
                    <span>Access Pro/Turbo/Business features immediately</span>
                  </li>
                  <li className="flex items-center">
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white font-semibold mr-3">3</span>
                    <span>Review your billing details anytime in your Stripe receipt</span>
                  </li>
                  <li className="flex items-center">
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white font-semibold mr-3">4</span>
                    <span>Visit our docs for advanced setup tips</span>
                  </li>
                </ol>
              ) : (
                <ol className="space-y-4 text-left">
                  <li className="flex items-center">
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white font-semibold mr-3">1</span>
                    <span>We will review your inquiry</span>
                  </li>
                  <li className="flex items-center">
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white font-semibold mr-3">2</span>
                    <span>Schedule a demo with our team</span>
                  </li>
                  <li className="flex items-center">
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white font-semibold mr-3">3</span>
                    <span>Receive a tailored proposal</span>
                  </li>
                  <li className="flex items-center">
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white font-semibold mr-3">4</span>
                    <span>Get started with onboarding</span>
                  </li>
                </ol>
              )}
            </div>
          </div>

          <div className="mt-12 space-x-4">
            <Link
              href={isDownload ? '/docs/getting-started' : '/docs'}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              {isDownload ? 'View Getting Started Guide' : 'Browse Documentation'}
            </Link>
            <Link
              href={isDownload ? '/community' : isSubscription ? '/download' : '/contact'}
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              {isDownload ? 'Join Our Community' : 'Contact Us'}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
