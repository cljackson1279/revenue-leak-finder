/**
 * POST /api/stripe-webhook
 *
 * Handles Stripe webhook events for the pilot onboarding checkout.
 *
 * Events handled:
 *  - checkout.session.completed  → logs purchase to Supabase pilot_purchases table
 *  - payment_intent.payment_failed → logs failure for ops visibility
 *
 * Security:
 *  - Verifies Stripe-Signature header using STRIPE_WEBHOOK_SECRET
 *  - Rejects any request that fails signature verification
 *  - Uses service-role Supabase client (bypasses RLS) for logging
 *
 * Setup:
 *  1. In Stripe Dashboard → Webhooks → Add endpoint:
 *     URL: https://revenue-leak-finder-rosy.vercel.app/api/stripe-webhook
 *     Events: checkout.session.completed, payment_intent.payment_failed
 *  2. Copy the signing secret and set STRIPE_WEBHOOK_SECRET in Vercel env vars
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  return new Stripe(key, { apiVersion: '2026-02-25.clover' })
}

// Stripe requires the raw body for signature verification.
// Next.js App Router provides it via req.text() before any parsing.
export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set — rejecting request')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  if (!sig) {
    return NextResponse.json({ error: 'Missing Stripe-Signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  const rawBody = await req.text()

  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Signature verification failed'
    console.error('[stripe-webhook] Signature verification failed:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // ── Handle events ──────────────────────────────────────────────────────────

  try {
    if (event.type === 'checkout.session.completed') {
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
    } else if (event.type === 'payment_intent.payment_failed') {
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
    }
    // All other events are acknowledged but not acted on
  } catch (err: unknown) {
    console.error(`[stripe-webhook] Error handling event ${event.type}:`, err)
    // Return 200 to prevent Stripe from retrying — log the error for ops review
    // (Stripe retries on non-2xx, which can cause duplicate processing)
  }

  return NextResponse.json({ received: true })
}

// ─── Event handlers ────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const supabase = createServiceClient()

  const record = {
    stripe_session_id: session.id,
    stripe_payment_intent_id:
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null,
    stripe_customer_id:
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id ?? null,
    customer_email: session.customer_details?.email ?? null,
    customer_name: session.customer_details?.name ?? null,
    amount_total: session.amount_total ?? null,       // in cents
    currency: session.currency ?? 'usd',
    payment_status: session.payment_status,
    product: session.metadata?.product ?? 'pilot_onboarding',
    price_id: session.metadata?.price_id ?? null,
    created_at: new Date().toISOString(),
  }

  console.log('[stripe-webhook] checkout.session.completed — logging purchase:', {
    session_id: record.stripe_session_id,
    email: record.customer_email,
    amount: record.amount_total,
  })

  const { error } = await supabase.from('pilot_purchases').insert(record)

  if (error) {
    // Log but don't throw — we already acknowledged the webhook
    console.error('[stripe-webhook] Failed to insert pilot_purchase record:', error)
  } else {
    console.log('[stripe-webhook] Purchase logged successfully:', record.stripe_session_id)
  }
}

async function handlePaymentFailed(intent: Stripe.PaymentIntent) {
  console.warn('[stripe-webhook] payment_intent.payment_failed:', {
    id: intent.id,
    amount: intent.amount,
    last_error: intent.last_payment_error?.message,
  })
  // Logged for ops visibility — no action required
}
