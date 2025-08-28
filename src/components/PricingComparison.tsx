'use client';

import React from 'react';

const competitors = [
  {
    name: 'GitHub Copilot',
    features: [
      { name: 'AI Assistance', value: 'Single Model' },
      { name: 'Response Speed', value: '2-5s' },
      { name: 'Monthly Price', value: '$10' },
      { name: 'Code Indexing', value: 'Limited' },
      { name: 'Zero Data Retention', value: '❌' },
    ]
  },
  {
    name: 'RinaWarp Terminal',
    isHighlighted: true,
    features: [
      { name: 'AI Assistance', value: 'Multiple Models' },
      { name: 'Response Speed', value: '0.5-1s' },
      { name: 'Monthly Price', value: 'Free-$12' },
      { name: 'Code Indexing', value: 'Advanced' },
      { name: 'Zero Data Retention', value: '✅' },
    ]
  },
  {
    name: 'AWS CodeWhisperer',
    features: [
      { name: 'AI Assistance', value: 'Single Model' },
      { name: 'Response Speed', value: '3-6s' },
      { name: 'Monthly Price', value: '$20' },
      { name: 'Code Indexing', value: 'Basic' },
      { name: 'Zero Data Retention', value: '❌' },
    ]
  }
];

export function PricingComparison() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">
            Why Choose RinaWarp?
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Compare our features and pricing with other solutions
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {competitors.map((competitor) => (
            <div
              key={competitor.name}
              className={`relative rounded-2xl shadow-lg bg-white overflow-hidden transform transition-all hover:-translate-y-1 ${
                competitor.isHighlighted ? 'ring-2 ring-primary' : ''
              }`}
            >
              {competitor.isHighlighted && (
                <div className="bg-primary text-white text-center text-sm py-1">
                  Best Value
                </div>
              )}
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  {competitor.name}
                </h3>
                <ul className="space-y-4">
                  {competitor.features.map((feature) => (
                    <li
                      key={feature.name}
                      className="flex items-center justify-between"
                    >
                      <span className="text-gray-600">{feature.name}</span>
                      <span className={`font-medium ${
                        competitor.isHighlighted ? 'text-primary' : 'text-gray-900'
                      }`}>
                        {feature.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
