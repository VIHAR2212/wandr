import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe environment variables not configured' },
      { status: 500 }
    );
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('[Stripe Webhook] Invalid signature:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;
        if (userId && plan) {
          const planMap: Record<string, 'FREE' | 'PRO' | 'ENTERPRISE'> = {
            explorer: 'PRO',
            nomad: 'ENTERPRISE',
          };
          await prisma.user.update({
            where: { id: userId },
            data: { plan: planMap[plan] ?? 'PRO' },
          });
          await prisma.subscription.upsert({
            where: { id: userId },
            create: {
              userId,
              stripeCustomerId: session.customer as string,
              stripeSubId: session.subscription as string,
              status: 'ACTIVE',
              plan: planMap[plan] ?? 'PRO',
            },
            update: {
              stripeCustomerId: session.customer as string,
              stripeSubId: session.subscription as string,
              status: 'ACTIVE',
              plan: planMap[plan] ?? 'PRO',
            },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeSubId: sub.id },
          data: { status: 'CANCELLED' },
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await prisma.subscription.updateMany({
            where: { stripeSubId: invoice.subscription as string },
            data: { status: 'PAST_DUE' },
          });
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('[Stripe Webhook] Handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
