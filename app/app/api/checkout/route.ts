/**
 * POST /api/checkout
 *
 * Creates a Stripe Checkout Session for the $500 pilot onboarding fee.
 * Returns { url } — the client redirects to this URL.
 *
 * Security:
 *  - Secret key is read from STRIPE_SECRET_KEY env var only (never hardcoded)
 *  - Price ID is read from STRIPE_PILOT_PRICE_ID env var only
 *  - No customer data is stored here — that happens in the webhook handler
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY environment variable is not set')
  return new Stripe(key, { apiVersion: '2026-02-25.clover' })
}

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe()

    const priceId = process.env.STRIPE_PILOT_PRICE_ID
    if (!priceId) {
      return NextResponse.json(
        { error: 'Checkout is not configured. Please contact support.' },
        { status: 503 }
      )
    }

    // Determine base URL for success/cancel redirects
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      (req.headers.get('origin') ?? 'https://revenue-leak-finder-rosy.vercel.app')

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/pilot/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pilot/canceled`,
      // Collect billing address for receipts
      billing_address_collection: 'required',
      // Allow customers to enter a custom email (no auth required for pilot purchase)
      customer_creation: 'always',
      // Metadata for webhook logging
      metadata: {
        product: 'pilot_onboarding',
        price_id: priceId,
      },
      // Payment intent metadata for Supabase logging via webhook
      payment_intent_data: {
        metadata: {
          product: 'pilot_onboarding',
          price_id: priceId,
        },
      },
    })

    if (!session.url) {
      return NextResponse.json(
        { error: 'Failed to create checkout session.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    console.error('[checkout] Error creating Stripe session:', err)
    const message =
      err instanceof Stripe.errors.StripeError
        ? err.message
        : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
