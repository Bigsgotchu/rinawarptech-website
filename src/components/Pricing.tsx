'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { stripePromise } from '../lib/stripe-client';

type BillingInterval = 'monthly' | 'yearly';

interface PricingPlan {
  id: string;
  name: string;
  // Pricing displays
  priceMonthly?: number; // in USD per user/month
  priceYearlyPerMonth?: number; // discounted monthly equivalent when billed yearly
  yearlyTotal?: number; // total billed annually in USD
  description: string;
  features: string[];
  ctaText: string;
  ctaLink: string;
  isPopular?: boolean;
  // For free/custom tiers
  customPriceLabel?: string;
  periodLabel?: string;
}

// Pricing tiers competitive with market leaders while highlighting our unique value
const pricingPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    customPriceLabel: '$0',
    periodLabel: 'forever',
    description: 'For developers getting started with AI-powered workflows',
    features: [
      '150 AI requests/month',
      'Access to GPT-5, Claude 4.1, & Gemini 2.5',
      '3 indexed codebases (5,000 files each)',
      'Basic terminal features',
      'Up to 3 custom themes',
      'Community support',
      'Zero data retention option'
    ],
    ctaText: 'Download Free',
    ctaLink: '/download'
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 12,
    priceYearlyPerMonth: 10,
    yearlyTotal: 120,
    description: 'For developers using AI to code, debug, and troubleshoot',
    features: [
      'Everything in Free, plus:',
      '2,500 AI requests/month',
      '40 indexed codebases (10,000 files each)',
      'Pay-as-you-go AI overages',
      'All premium AI models + Groq integration',
      'Unlimited themes & customization',
      'Private email support',
      'Advanced zero data retention'
    ],
    ctaText: 'Subscribe',
    ctaLink: '/checkout?plan=pro'
  },
  {
    id: 'turbo',
    name: 'Turbo',
    priceMonthly: 35,
    priceYearlyPerMonth: 28,
    yearlyTotal: 336,
    description: 'For developers using AI as a daily productivity driver',
    features: [
      'Everything in Pro, plus:',
      '10,000 AI requests/month',
      '40 indexed codebases (20,000 files each)',
      'Ultra-fast Groq response speed',
      'Unlimited fallback model usage',
      'Priority support & training',
      'Custom API integrations'
    ],
    isPopular: true,
    ctaText: 'Start Free Trial',
    ctaLink: '/checkout?plan=turbo'
  },
  {
    id: 'business',
    name: 'Business',
    priceMonthly: 49,
    priceYearlyPerMonth: 39,
    yearlyTotal: 468,
    description: 'For teams scaling AI-powered development',
    features: [
      'Everything in Turbo, plus:',
      '10,000 AI requests/month per user',
      'Team-wide zero data retention',
      'SAML-based SSO',
      'Bring your own LLM option',
      'Dedicated Slack support',
      'Custom security controls'
    ],
    ctaText: 'Start Free Trial',
    ctaLink: '/checkout?plan=business'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    customPriceLabel: 'Custom',
    periodLabel: '',
    description: 'For organizations with security and compliance requirements',
    features: [
      'Everything in Business, plus:',
      'Custom AI & indexing limits',
      'Enterprise SLA guarantee',
      'Advanced compliance features',
      'Custom LLM deployment options',
      'Dedicated success manager',
      'Priority feature development'
    ],
    ctaText: 'Contact Sales',
    ctaLink: '/contact'
  }
];

export function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);
  const [interval, setInterval] = useState<BillingInterval>('monthly');

  const handleCheckout = async (planId: string) => {
    try {
      setLoading(planId);
      
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId, interval }),
      });

      const { sessionId, error } = await response.json();
      if (error) throw new Error(error);

      const stripe = await stripePromise;
      if (!stripe) throw new Error('Failed to load Stripe');

      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });
      if (stripeError) throw stripeError;
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to process checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <section id="pricing" className="py-32 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Choose Your Plan
          </h2>
          <p className="text-2xl text-gray-600 mb-8 leading-relaxed">
            Start free, upgrade when you need more power
          </p>
          <div className="inline-flex items-center bg-gray-100 rounded-lg p-1.5 mb-16">
            <button
              onClick={() => setInterval('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                interval === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval('yearly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                interval === 'yearly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly (Save 20%)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricingPlans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl shadow-lg bg-white overflow-hidden transform transition-all hover:-translate-y-2 ${
                plan.isPopular ? 'ring-2 ring-primary' : ''
              }`}
            >
              {plan.isPopular && (
                <div className="bg-primary text-white text-center text-sm py-1">
                  Most Popular
                </div>
              )}
              <div className="p-8">
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                  {plan.name}
                </h3>
                <div className="flex items-baseline mb-3">
                  {plan.customPriceLabel ? (
                    <>
                      <span className="text-5xl font-bold text-gray-900">{plan.customPriceLabel}</span>
                      {plan.periodLabel && (
                        <span className="ml-2 text-lg text-gray-600">/{plan.periodLabel}</span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-5xl font-bold text-gray-900">
                        {interval === 'monthly' ? `$${plan.priceMonthly}` : `$${plan.priceYearlyPerMonth}`}
                      </span>
                      <span className="ml-2 text-lg text-gray-600">/user/mo</span>
                    </>
                  )}
                </div>
                {!plan.customPriceLabel && interval === 'yearly' && plan.yearlyTotal && (
                  <div className="mb-6 text-sm text-gray-500">Billed ${plan.yearlyTotal}/year</div>
                )}
                <p className="text-gray-600 mb-8 text-lg">{plan.description}</p>

                <ul className="space-y-4 mb-10">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start py-1">
                      <svg
                        className="h-5 w-5 text-primary mt-1 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="ml-3 text-gray-600 leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.id === 'free' || plan.id === 'enterprise' ? (
                  <Link
                    href={plan.ctaLink}
                    className={`block w-full text-center px-6 py-3 rounded-lg text-white font-semibold transition-colors ${
                      plan.isPopular
                        ? 'bg-primary hover:bg-primary-dark'
                        : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                  >
                    {plan.ctaText}
                  </Link>
                ) : (
                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={loading === plan.id}
                    className={`block w-full text-center px-6 py-3 rounded-lg text-white font-semibold transition-colors ${
                      plan.isPopular
                        ? 'bg-primary hover:bg-primary-dark'
                        : 'bg-gray-800 hover:bg-gray-700'
                    } ${loading === plan.id ? 'opacity-75 cursor-not-allowed' : ''}`}
                  >
                    {loading === plan.id ? 'Processing...' : plan.ctaText}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
