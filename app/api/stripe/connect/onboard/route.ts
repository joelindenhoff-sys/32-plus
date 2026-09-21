import { NextResponse } from "next/server";
import { authenticateRequest, createSupabaseAdmin } from "../../../../../lib/supabaseServer";
import { getStripe } from "../../../../../lib/stripe";

export async function POST(request: Request) {
  try {
    const user = await authenticateRequest(request);
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const stripe = getStripe();
    const admin = createSupabaseAdmin();
    const { data: profile, error } = await admin
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", user.id)
      .single();
    if (error) throw error;

    let accountId = profile.stripe_account_id as string | null;
    if (!accountId) {
      const account = await stripe.accounts.create(
        {
          type: "express",
          country: "ES",
          email: user.email,
          capabilities: { transfers: { requested: true } },
          business_profile: { url: "https://32-plus.com" },
          metadata: { profile_id: user.id },
        },
        { idempotencyKey: `32plus-connect-${user.id}` },
      );
      accountId = account.id;
      const { error: updateError } = await admin
        .from("profiles")
        .update({ stripe_account_id: accountId })
        .eq("id", user.id);
      if (updateError) throw updateError;
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const link = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${origin}/dashboard?stripe=refresh`,
      return_url: `${origin}/dashboard?stripe=return`,
    });
    return NextResponse.json({ url: link.url });
  } catch (error) {
    console.error("Stripe onboarding error", error);
    return NextResponse.json({ error: "Stripe onboarding could not be started." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const user = await authenticateRequest(request);
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const admin = createSupabaseAdmin();
    const { data: profile, error } = await admin
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", user.id)
      .single();
    if (error) throw error;
    if (!profile.stripe_account_id) return NextResponse.json({ connected: false });

    const account = await getStripe().accounts.retrieve(profile.stripe_account_id);
    const state = {
      stripe_onboarding_complete: account.details_submitted,
      stripe_charges_enabled: account.charges_enabled,
      stripe_payouts_enabled: account.payouts_enabled,
    };
    const { error: updateError } = await admin.from("profiles").update(state).eq("id", user.id);
    if (updateError) throw updateError;
    return NextResponse.json({ connected: true, ...state });
  } catch (error) {
    console.error("Stripe account status error", error);
    return NextResponse.json({ error: "Stripe account status is unavailable." }, { status: 500 });
  }
}

