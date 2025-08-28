import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Define our subscription plans and their Stripe price IDs
const PLANS = {
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    name: 'Pro Plan',
  },
  turbo: {
    monthly: process.env.STRIPE_TURBO_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_TURBO_YEARLY_PRICE_ID,
    name: 'Turbo Plan',
  },
  business: {
    monthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID,
    name: 'Business Plan',
  },
} as const;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { planId, interval = 'monthly', userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Validate the plan
    if (!planId || !PLANS[planId as keyof typeof PLANS]) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    // Get the price ID based on plan and interval
    const priceId = PLANS[planId as keyof typeof PLANS][interval as 'monthly' | 'yearly'];
    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid billing interval' },
        { status: 400 }
      );
    }

    // Create a Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      billing_address_collection: 'required',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          planId,
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/thank-you?type=subscription&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: {
        planId,
        interval,
        userId,
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
