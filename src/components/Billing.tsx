import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface BillingProps {
  currentPlan?: string;
  subscriptionStatus?: string;
  subscriptionPeriodEnd?: string;
}

export default function Billing({
  currentPlan,
  subscriptionStatus,
  subscriptionPeriodEnd,
}: BillingProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (planId: string, interval: 'monthly' | 'yearly') => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          interval,
          userId: user?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      const { error } = await stripe!.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Subscription error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-6">Subscription Management</h2>

      {/* Current Plan Info */}
      {currentPlan && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Current Plan</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Plan:</p>
              <p className="font-medium">{currentPlan}</p>
            </div>
            <div>
              <p className="text-gray-600">Status:</p>
              <p className="font-medium">{subscriptionStatus}</p>
            </div>
            {subscriptionPeriodEnd && (
              <div className="col-span-2">
                <p className="text-gray-600">Renewal Date:</p>
                <p className="font-medium">
                  {formatDate(subscriptionPeriodEnd)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Available Plans</h3>
        
        {/* Pro Plan */}
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-medium">Pro Plan</h4>
            <div className="space-x-2">
              <button
                onClick={() => handleSubscribe('pro', 'monthly')}
                disabled={isLoading || currentPlan === 'pro'}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Monthly
              </button>
              <button
                onClick={() => handleSubscribe('pro', 'yearly')}
                disabled={isLoading || currentPlan === 'pro'}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Yearly (Save 20%)
              </button>
            </div>
          </div>
          <ul className="list-disc list-inside text-sm text-gray-600">
            <li>Unlimited AI requests</li>
            <li>Priority support</li>
            <li>Advanced terminal features</li>
          </ul>
        </div>

        {/* Turbo Plan */}
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-medium">Turbo Plan</h4>
            <div className="space-x-2">
              <button
                onClick={() => handleSubscribe('turbo', 'monthly')}
                disabled={isLoading || currentPlan === 'turbo'}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Monthly
              </button>
              <button
                onClick={() => handleSubscribe('turbo', 'yearly')}
                disabled={isLoading || currentPlan === 'turbo'}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Yearly (Save 20%)
              </button>
            </div>
          </div>
          <ul className="list-disc list-inside text-sm text-gray-600">
            <li>Everything in Pro</li>
            <li>Ultra-fast AI responses</li>
            <li>Custom terminal themes</li>
            <li>Team collaboration features</li>
          </ul>
        </div>

        {/* Business Plan */}
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-medium">Business Plan</h4>
            <div className="space-x-2">
              <button
                onClick={() => handleSubscribe('business', 'monthly')}
                disabled={isLoading || currentPlan === 'business'}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Monthly
              </button>
              <button
                onClick={() => handleSubscribe('business', 'yearly')}
                disabled={isLoading || currentPlan === 'business'}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Yearly (Save 20%)
              </button>
            </div>
          </div>
          <ul className="list-disc list-inside text-sm text-gray-600">
            <li>Everything in Turbo</li>
            <li>Enterprise support</li>
            <li>Custom AI model training</li>
            <li>Advanced analytics</li>
            <li>SSO integration</li>
          </ul>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
