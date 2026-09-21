import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "../../../../lib/supabaseServer";
import { getStripe } from "../../../../lib/stripe";

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const admin = createSupabaseAdmin();
  const { data: due, error } = await admin
    .from("rental_requests")
    .select("id,owner_id,owner_net_amount,currency,stripe_charge_id,stripe_transfer_group,owner:profiles!rental_requests_owner_id_fkey(stripe_account_id,stripe_payouts_enabled)")
    .eq("payment_status", "paid")
    .eq("payout_status", "pending")
    .lte("scheduled_payout_at", new Date().toISOString());
  if (error) throw error;

  const released: string[] = [];
  const failed: string[] = [];
  for (const booking of due || []) {
    try {
      const owner = Array.isArray(booking.owner) ? booking.owner[0] : booking.owner;
      if (!owner?.stripe_account_id || !owner.stripe_payouts_enabled || !booking.stripe_charge_id || !booking.owner_net_amount || !booking.currency)
        throw new Error("Booking is not ready for transfer.");
      const transfer = await getStripe().transfers.create(
        {
          amount: booking.owner_net_amount,
          currency: booking.currency.toLowerCase(),
          destination: owner.stripe_account_id,
          source_transaction: booking.stripe_charge_id,
          transfer_group: booking.stripe_transfer_group || undefined,
          metadata: { rental_request_id: booking.id },
        },
        { idempotencyKey: `32plus-payout-${booking.id}` },
      );
      const { error: updateError } = await admin.from("rental_requests").update({
        stripe_transfer_id: transfer.id,
        payout_status: "released",
        payout_released_at: new Date().toISOString(),
      }).eq("id", booking.id).eq("payout_status", "pending");
      if (updateError) throw updateError;
      released.push(booking.id);
    } catch (transferError) {
      console.error(`Payout release failed for ${booking.id}`, transferError);
      failed.push(booking.id);
    }
  }
  return NextResponse.json({ checked: due?.length || 0, released, failed });
}
