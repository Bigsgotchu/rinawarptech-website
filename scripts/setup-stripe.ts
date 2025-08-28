import Stripe from 'stripe';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
apiVersion: '2023-10-16',
});

async function createProducts() {
  try {
    // Create Pro Plan
    const proPlan = await stripe.products.create({
      name: 'Pro Plan',
      description: 'For developers using AI to code, debug, and troubleshoot',
      metadata: {
        features: JSON.stringify([
          'Everything in Free, plus:',
          '2,500 AI requests/month',
          '40 indexed codebases (10,000 files each)',
          'Pay-as-you-go AI overages',
          'All premium AI models + Groq integration',
          'Unlimited themes & customization',
          'Private email support',
          'Advanced zero data retention'
        ])
      }
    });

    // Create Pro Plan Prices
    const proMonthly = await stripe.prices.create({
      product: proPlan.id,
      currency: 'usd',
      unit_amount: 1200, // $12.00
      recurring: {
        interval: 'month'
      },
      metadata: {
        type: 'monthly'
      }
    });

    const proYearly = await stripe.prices.create({
      product: proPlan.id,
      currency: 'usd',
      unit_amount: 12000, // $120.00 ($10/mo with 20% discount)
      recurring: {
        interval: 'year'
      },
      metadata: {
        type: 'yearly'
      }
    });

    // Create Turbo Plan
    const turboPlan = await stripe.products.create({
      name: 'Turbo Plan',
      description: 'For developers using AI as a daily productivity driver',
      metadata: {
        features: JSON.stringify([
          'Everything in Pro, plus:',
          '10,000 AI requests/month',
          '40 indexed codebases (20,000 files each)',
          'Ultra-fast Groq response speed',
          'Unlimited fallback model usage',
          'Priority support & training',
          'Custom API integrations'
        ])
      }
    });

    // Create Turbo Plan Prices
    const turboMonthly = await stripe.prices.create({
      product: turboPlan.id,
      currency: 'usd',
      unit_amount: 3500, // $35.00
      recurring: {
        interval: 'month'
      },
      metadata: {
        type: 'monthly'
      }
    });

    const turboYearly = await stripe.prices.create({
      product: turboPlan.id,
      currency: 'usd',
      unit_amount: 33600, // $336.00 ($28/mo with 20% discount)
      recurring: {
        interval: 'year'
      },
      metadata: {
        type: 'yearly'
      }
    });

    // Create Business Plan
    const businessPlan = await stripe.products.create({
      name: 'Business Plan',
      description: 'For teams scaling AI-powered development',
      metadata: {
        features: JSON.stringify([
          'Everything in Turbo, plus:',
          '10,000 AI requests/month per user',
          'Team-wide zero data retention',
          'SAML-based SSO',
          'Bring your own LLM option',
          'Dedicated Slack support',
          'Custom security controls'
        ])
      }
    });

    // Create Business Plan Prices
    const businessMonthly = await stripe.prices.create({
      product: businessPlan.id,
      currency: 'usd',
      unit_amount: 4900, // $49.00
      recurring: {
        interval: 'month'
      },
      metadata: {
        type: 'monthly'
      }
    });

    const businessYearly = await stripe.prices.create({
      product: businessPlan.id,
      currency: 'usd',
      unit_amount: 46800, // $468.00 ($39/mo with 20% discount)
      recurring: {
        interval: 'year'
      },
      metadata: {
        type: 'yearly'
      }
    });

    // Create .env.local template with price IDs
    const envTemplate = `# Stripe Configuration
STRIPE_SECRET_KEY=${process.env.STRIPE_SECRET_KEY}
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}

# Pro Plan Prices
STRIPE_PRO_MONTHLY_PRICE_ID=${proMonthly.id}
STRIPE_PRO_YEARLY_PRICE_ID=${proYearly.id}

# Turbo Plan Prices
STRIPE_TURBO_MONTHLY_PRICE_ID=${turboMonthly.id}
STRIPE_TURBO_YEARLY_PRICE_ID=${turboYearly.id}

# Business Plan Prices
STRIPE_BUSINESS_MONTHLY_PRICE_ID=${businessMonthly.id}
STRIPE_BUSINESS_YEARLY_PRICE_ID=${businessYearly.id}

# Product IDs
STRIPE_PRO_PRODUCT_ID=${proPlan.id}
STRIPE_TURBO_PRODUCT_ID=${turboPlan.id}
STRIPE_BUSINESS_PRODUCT_ID=${businessPlan.id}
`;

    console.log('Successfully created all products and prices!');
    console.log('\nUpdate your .env.local with the following values:');
    console.log(envTemplate);

  } catch (error) {
    console.error('Error creating products:', error);
  }
}

createProducts();
