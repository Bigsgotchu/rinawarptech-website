import React from 'react';

interface Feature {
  title: string;
  description: string;
  icon: string;
}

const features: Feature[] = [
  {
    title: 'Ultra-Fast AI',
    description: 'Get responses 10x faster than ChatGPT with Groq\'s cutting-edge infrastructure. No waiting, just instant help.',
    icon: '⚡'
  },
  {
    title: 'Smart Coding Assistant',
    description: 'Debug errors, write code, explain concepts. The AI understands your terminal context and coding needs.',
    icon: '🤖'
  },
  {
    title: 'Secure & Private',
    description: 'Your API keys and code stay on your machine. No data leaves your system unless you explicitly send it to the AI.',
    icon: '🔒'
  },
  {
    title: 'Beautiful Interface',
    description: 'Modern mermaid-themed UI that\'s both functional and delightful. Multiple themes and full customization.',
    icon: '✨'
  },
  {
    title: 'Cross-Platform',
    description: 'Works perfectly on macOS, Windows, and Linux. One app, everywhere you develop.',
    icon: '🌐'
  },
  {
    title: 'Unlimited Requests',
    description: 'With Pro and Team plans, get unlimited AI requests. No rate limits, no restrictions, just pure productivity.',
    icon: '♾️'
  }
];

export function Features() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">
          Why Developers Love RinaWarp
        </h2>
        <p className="text-xl text-center text-gray-600 mb-16">
          The most advanced AI terminal for modern developers
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-xl bg-gradient-to-br from-lightBlue1 to-lightBlue2 shadow-lg transform transition-all hover:-translate-y-2"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-700">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
