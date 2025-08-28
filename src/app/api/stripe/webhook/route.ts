import { NextResponse } from "next/server";
import Stripe from "stripe";
import { headers } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get("stripe-signature")!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Get database instance
    const { db } = await import("@/lib/db");

    // Handle the event
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by Stripe customer ID
        const user = await db.user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (!user) {
          console.error("No user found for customer:", customerId);
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Get subscription details
        const plan = subscription.items.data[0].price.metadata.plan || "free";
        const status = subscription.status;
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

        // Update subscription
        await db.subscription.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0].price.id,
            stripeCustomerId: customerId,
            status: status,
            planId: plan,
            interval: subscription.items.data[0].plan.interval,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: currentPeriodEnd,
          },
          update: {
            status: status,
            stripePriceId: subscription.items.data[0].price.id,
            planId: plan,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: currentPeriodEnd,
          },
        });

        // Track the event
        await db.subscriptionEvent.create({
          data: {
            type: event.type,
            customerId,
            subscriptionId: subscription.id,
            status,
            planId: subscription.metadata.planId,
            amount: subscription.items.data[0].plan.amount,
            interval: subscription.items.data[0].plan.interval,
            currency: subscription.currency,
            timestamp: new Date(event.created * 1000),
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by Stripe customer ID
        const user = await db.user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (!user) {
          console.error("No user found for customer:", customerId);
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Update subscription
        await db.subscription.update({
          where: { userId: user.id },
          data: {
            status: "cancelled",
            cancelAtPeriodEnd: true,
          },
        });

        // Track the event
        await db.subscriptionEvent.create({
          data: {
            type: event.type,
            customerId,
            subscriptionId: subscription.id,
            status: subscription.status,
            planId: subscription.metadata.planId,
            amount: subscription.items.data[0].plan.amount,
            interval: subscription.items.data[0].plan.interval,
            currency: subscription.currency,
            timestamp: new Date(event.created * 1000),
          },
        });
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Handle first-time subscription
        if (session.mode === "subscription") {
          const subscriptionId = session.subscription as string;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = session.metadata?.userId;

          if (!userId) {
            console.error("No userId found in session metadata");
            return NextResponse.json({ error: "No userId found" }, { status: 400 });
          }

          const plan = subscription.items.data[0].price.metadata.plan || "free";
          const status = subscription.status;
          const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

          // Update user and create subscription
          await db.user.update({
            where: { id: userId },
            data: {
              stripeCustomerId: session.customer as string,
              subscription: {
                create: {
                  stripeSubscriptionId: subscription.id,
                  stripePriceId: subscription.items.data[0].price.id,
                  stripeCustomerId: session.customer as string,
                  status: status,
                  planId: plan,
                  interval: subscription.items.data[0].plan.interval,
                  currentPeriodStart: new Date(subscription.current_period_start * 1000),
                  currentPeriodEnd: currentPeriodEnd,
                },
              },
            },
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription;
        const customerId = invoice.customer;

        // Track revenue
        await db.revenue.create({
          data: {
            customerId: customerId as string,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            invoiceId: invoice.id,
            subscriptionId: subscriptionId as string,
            timestamp: new Date(event.created * 1000),
          },
        });

        if (typeof subscriptionId === "string") {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          
          // Find user by Stripe customer ID
          const user = await db.user.findFirst({
            where: { stripeCustomerId: customerId as string },
          });

          if (!user) {
            console.error("No user found for customer:", customerId);
            return NextResponse.json({ error: "User not found" }, { status: 404 });
          }

          // Update subscription
          await db.subscription.update({
            where: { userId: user.id },
            data: {
              status: subscription.status,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer;

        // Find user by Stripe customer ID
        const user = await db.user.findFirst({
          where: { stripeCustomerId: customerId as string },
        });

        if (!user) {
          console.error("No user found for customer:", customerId);
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Update subscription status
        await db.subscription.update({
          where: { userId: user.id },
          data: {
            status: "past_due",
          },
        });
        break;
      }

      case "charge.succeeded": {
        const charge = event.data.object as Stripe.Charge;
        await db.charge.create({
          data: {
            customerId: charge.customer as string,
            amount: charge.amount,
            currency: charge.currency,
            chargeId: charge.id,
            timestamp: new Date(event.created * 1000),
          },
        });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
