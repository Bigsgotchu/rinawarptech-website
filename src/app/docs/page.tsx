import React from 'react';

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold mb-8">Documentation</h1>
          
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-medium mb-3">Installation</h3>
              <p className="mb-4">Choose your platform and follow the installation instructions:</p>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white p-4 rounded shadow-sm">
                  <h4 className="font-medium mb-2">🍎 macOS</h4>
                  <code className="block bg-gray-100 p-2 rounded text-sm mb-2">
                    brew install rinawarp-terminal
                  </code>
                </div>
                <div className="bg-white p-4 rounded shadow-sm">
                  <h4 className="font-medium mb-2">🪟 Windows</h4>
                  <code className="block bg-gray-100 p-2 rounded text-sm mb-2">
                    winget install rinawarp-terminal
                  </code>
                </div>
                <div className="bg-white p-4 rounded shadow-sm">
                  <h4 className="font-medium mb-2">🐧 Linux</h4>
                  <code className="block bg-gray-100 p-2 rounded text-sm mb-2">
                    curl -fsSL https://get.rinawarp.com | sh
                  </code>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Basic Usage</h2>
            <p className="mb-4">
              RinaWarp Terminal enhances your terminal experience with AI-powered assistance.
              Here are some common commands to get you started:
            </p>
            <div className="bg-gray-50 p-6 rounded-lg">
              <ul className="space-y-4">
                <li>
                  <code className="bg-gray-100 px-2 py-1 rounded">rwt help</code>
                  <span className="ml-3">Show all available commands</span>
                </li>
                <li>
                  <code className="bg-gray-100 px-2 py-1 rounded">rwt ask &quot;your question&quot;</code>
                  <span className="ml-3">Get AI assistance for your query</span>
                </li>
                <li>
                  <code className="bg-gray-100 px-2 py-1 rounded">rwt explain</code>
                  <span className="ml-3">Explain the last command&#39;s output</span>
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Advanced Features</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-medium mb-3">AI Code Review</h3>
                <p>
                  Get instant code reviews by piping your code to RinaWarp:
                </p>
                <code className="block bg-gray-100 p-2 rounded text-sm mt-2">
                  git diff | rwt review
                </code>
              </div>
              <div>
                <h3 className="text-xl font-medium mb-3">Smart Command Suggestions</h3>
                <p>
                  RinaWarp learns from your command history to provide smart suggestions:
                </p>
                  <code className="block bg-gray-100 p-2 rounded text-sm mt-2">
                  rwt suggest &quot;what I want to do&quot;
                </code>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
