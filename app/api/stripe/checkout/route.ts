import { NextResponse } from "next/server";
import { authenticateRequest, createSupabaseAdmin } from "../../../../lib/supabaseServer";
import { getStripe } from "../../../../lib/stripe";

export async function POST(request: Request) {
  try {
    const user = await authenticateRequest(request);
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { requestId } = (await request.json()) as { requestId?: string };
    if (!requestId) return NextResponse.json({ error: "Rental request is required." }, { status: 400 });

    const admin = createSupabaseAdmin();
    const { data: booking, error } = await admin
      .from("rental_requests")
      .select("id,tenant_id,owner_id,status,accommodation_amount,guest_fee_amount,guest_total_amount,currency,stripe_checkout_session_id,properties(title)")
      .eq("id", requestId)
      .single();
    if (error) throw error;
    if (booking.tenant_id !== user.id) return NextResponse.json({ error: "This booking does not belong to you." }, { status: 403 });
    if (!['tenant_signed', 'payment_pending'].includes(booking.status)) return NextResponse.json({ error: "The signed agreement is not ready for payment." }, { status: 409 });
    if (!booking.guest_total_amount || booking.accommodation_amount === null || booking.guest_fee_amount === null || !booking.currency)
      return NextResponse.json({ error: "The booking price is incomplete." }, { status: 409 });

    if (booking.stripe_checkout_session_id) {
      const existing = await getStripe().checkout.sessions.retrieve(booking.stripe_checkout_session_id);
      if (existing.status === "open" && existing.url) return NextResponse.json({ url: existing.url });
    }

    const property = Array.isArray(booking.properties) ? booking.properties[0] : booking.properties;
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const transferGroup = `rental_${booking.id}`;
    const session = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        customer_email: user.email,
        line_items: [
          { price_data: { currency: booking.currency.toLowerCase(), unit_amount: booking.accommodation_amount, product_data: { name: property?.title || "32+ stay" } }, quantity: 1 },
          { price_data: { currency: booking.currency.toLowerCase(), unit_amount: booking.guest_fee_amount, product_data: { name: "32+ guest service fee" } }, quantity: 1 },
        ],
        payment_intent_data: { transfer_group: transferGroup, metadata: { rental_request_id: booking.id } },
        metadata: { rental_request_id: booking.id },
        success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/dashboard?payment=cancelled`,
      },
      { idempotencyKey: `32plus-checkout-${booking.id}` },
    );
    const { error: updateError } = await admin.from("rental_requests").update({
      stripe_checkout_session_id: session.id,
      stripe_transfer_group: transferGroup,
      payment_status: "pending",
      status: "payment_pending",
    }).eq("id", booking.id);
    if (updateError) throw updateError;
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Checkout error", error);
    if (
      error instanceof Error &&
      error.message.includes("SUPABASE_") &&
      error.message.includes("not configured")
    )
      return NextResponse.json(
        { error: "Secure payment is being configured. Please try again shortly." },
        { status: 503 },
      );
    return NextResponse.json({ error: "Payment could not be started." }, { status: 500 });
  }
}
