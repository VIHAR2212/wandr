import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/lib/auth';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key, { apiVersion: '2024-04-10' });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan } = await req.json();

    const PLANS: Record<string, string | undefined> = {
      explorer: process.env.STRIPE_EXPLORER_PRICE_ID,
      nomad: process.env.STRIPE_NOMAD_PRICE_ID,
    };

    const priceId = PLANS[plan];
    if (!priceId) {
      return NextResponse.json(
        { error: `Invalid plan or missing STRIPE_${plan.toUpperCase()}_PRICE_ID env variable` },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL is not set' }, { status: 500 });
    }

    const stripe = getStripe();
    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: session.user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?upgraded=true`,
      cancel_url: `${appUrl}/#pricing`,
      metadata: { userId: session.user.id ?? '', plan },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error('[Stripe Checkout]', err);
    const message = err instanceof Error ? err.message : 'Checkout failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
