import React from 'react';

interface Stat {
  title: string;
  value: string;
  icon: string;
}

const stats: Stat[] = [
  {
    title: 'Faster than ChatGPT',
    value: '10x',
    icon: '🚀'
  },
  {
    title: 'AI Integration',
    value: 'FREE',
    icon: '🧠'
  },
  {
    title: 'Requests/minute',
    value: '6K',
    icon: '⚡'
  }
];

export function Hero() {
  return (
    <section className="pt-24 pb-16 bg-gradient-to-br from-primary/10 via-lightBlue1/20 to-lightBlue2/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="relative">
          <div className="inline-block">
            <span className="absolute -top-6 -right-6 bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-medium">
              🏆 Featured on Product Hunt
            </span>
          </div>
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold mb-8 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
          RinaWarp Terminal
        </h1>
        <p className="text-xl sm:text-2xl text-gray-700 mb-12 max-w-3xl mx-auto">
          The World&apos;s First Terminal with FREE Ultra-Fast AI.
          Get instant coding help with Groq Llama models.
          10x faster than ChatGPT, completely free.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg transform transition-all hover:-translate-y-2"
            >
              <div className="text-4xl mb-2">{stat.icon}</div>
              <div className="text-4xl font-bold text-primary mb-2">
                {stat.value}
              </div>
              <div className="text-gray-600">
                {stat.title}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/download"
            className="bg-primary text-white px-8 py-4 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
          >
            Get RinaWarp Terminal
          </a>
          <a
            href="#features"
            className="bg-gray-800 text-white px-8 py-4 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
          >
            See Features
          </a>
        </div>
      </div>
    </section>
  );
}
