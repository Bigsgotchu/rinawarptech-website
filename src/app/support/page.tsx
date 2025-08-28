import React from 'react';

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">Support</h1>
          
          <div className="bg-gradient-to-br from-primary/10 via-lightBlue1/20 to-lightBlue2/10 p-8 rounded-xl mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-center">Contact Us</h2>
            <form className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  placeholder="you@example.com"
                />
              </div>
              
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <select
                  id="subject"
                  name="subject"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                >
                  <option>Technical Support</option>
                  <option>Billing Question</option>
                  <option>Feature Request</option>
                  <option>Bug Report</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  placeholder="How can we help?"
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Send Message
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-8">
            <h2 className="text-2xl font-semibold mb-6">Quick Support Resources</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium mb-3">📚 Documentation</h3>
                <p className="text-gray-600 mb-4">
                  Find answers in our comprehensive documentation, including guides and tutorials.
                </p>
                <a href="/docs" className="text-primary hover:text-primary-dark font-medium">
                  View Documentation →
                </a>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium mb-3">💬 Community</h3>
                <p className="text-gray-600 mb-4">
                  Join our Discord community to connect with other users and get help.
                </p>
                <a href="https://discord.gg/rinawarp" className="text-primary hover:text-primary-dark font-medium">
                  Join Discord →
                </a>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium mb-3">🐛 Bug Reports</h3>
                <p className="text-gray-600 mb-4">
                  Found a bug? Report it on our GitHub issues page to help us improve.
                </p>
                <a href="https://github.com/rinawarp/terminal/issues" className="text-primary hover:text-primary-dark font-medium">
                  Report Bug →
                </a>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium mb-3">💡 Feature Requests</h3>
                <p className="text-gray-600 mb-4">
                  Have an idea? Share your feature requests and suggestions with us.
                </p>
                <a href="https://github.com/rinawarp/terminal/discussions" className="text-primary hover:text-primary-dark font-medium">
                  Submit Idea →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
