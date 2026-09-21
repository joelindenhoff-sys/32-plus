import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdmin } from "../../../../lib/supabaseServer";
import { getStripe } from "../../../../lib/stripe";

function requestIdFromSession(session: Stripe.Checkout.Session) {
  return session.metadata?.rental_request_id || null;
}

async function recordSuccessfulPayment(session: Stripe.Checkout.Session) {
  const requestId = requestIdFromSession(session);
  if (!requestId || session.payment_status !== "paid") return;
  const admin = createSupabaseAdmin();
  const { data: booking, error } = await admin
    .from("rental_requests")
    .select("guest_total_amount,currency")
    .eq("id", requestId)
    .single();
  if (error) throw error;
  if (session.amount_total !== booking.guest_total_amount || session.currency?.toUpperCase() !== booking.currency)
    throw new Error(`Stripe amount mismatch for rental request ${requestId}`);

  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  let chargeId: string | null = null;
  let processingCost: number | null = null;
  if (paymentIntentId) {
    const intent = await getStripe().paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge.balance_transaction"] });
    const charge = typeof intent.latest_charge === "string" ? null : intent.latest_charge;
    chargeId = typeof intent.latest_charge === "string" ? intent.latest_charge : charge?.id || null;
    const balance = charge && typeof charge.balance_transaction !== "string" ? charge.balance_transaction : null;
    processingCost = balance?.fee ?? null;
  }
  const { error: updateError } = await admin.from("rental_requests").update({
    payment_status: "paid",
    status: "confirmed",
    paid_at: new Date().toISOString(),
    stripe_payment_intent_id: paymentIntentId || null,
    stripe_charge_id: chargeId,
    payment_processing_cost: processingCost,
    payout_status: "pending",
  }).eq("id", requestId);
  if (updateError) throw updateError;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch (error) {
    console.error("Invalid Stripe webhook signature", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded")
      await recordSuccessfulPayment(event.data.object as Stripe.Checkout.Session);
    if (event.type === "checkout.session.async_payment_failed") {
      const requestId = requestIdFromSession(event.data.object as Stripe.Checkout.Session);
      if (requestId) await createSupabaseAdmin().from("rental_requests").update({ payment_status: "failed", status: "tenant_signed" }).eq("id", requestId);
    }
    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account;
      await createSupabaseAdmin().from("profiles").update({
        stripe_onboarding_complete: account.details_submitted,
        stripe_charges_enabled: account.charges_enabled,
        stripe_payouts_enabled: account.payouts_enabled,
      }).eq("stripe_account_id", account.id);
    }
  } catch (error) {
    console.error(`Stripe webhook ${event.id} failed`, error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

