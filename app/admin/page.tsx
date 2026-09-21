"use client";

import { useEffect, useState } from "react";
import { Header, Footer } from "../components";
import { formatFeeRate, formatMinorUnits } from "../../lib/pricing";
import { supabase } from "../../lib/supabase";
import "./admin.css";
import ContactInbox from "./ContactInbox";

type AdminBooking = {
  id: string;
  status: string;
  accommodation_amount: number | null;
  guest_fee_rate: number | null;
  guest_fee_amount: number | null;
  owner_fee_rate: number | null;
  owner_fee_amount: number | null;
  guest_total_amount: number | null;
  owner_net_amount: number | null;
  platform_gross_revenue: number | null;
  payment_processing_cost: number | null;
  payment_status: string;
  payout_status: string;
  scheduled_payout_at: string | null;
  currency: string | null;
  properties?: { title: string } | { title: string }[] | null;
};

export default function AdminPage() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setDenied(true);
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role !== "admin") {
        setDenied(true);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("rental_requests")
        .select(
          "id,status,accommodation_amount,guest_fee_rate,guest_fee_amount,owner_fee_rate,owner_fee_amount,guest_total_amount,owner_net_amount,platform_gross_revenue,payment_processing_cost,payment_status,payout_status,scheduled_payout_at,currency,properties(title)",
        )
        .order("created_at", { ascending: false });
      setBookings((data || []) as AdminBooking[]);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <>
      <Header />
      <main className="admin-page">
        <p className="eyebrow">32+ ADMIN</p>
        <h1>Booking finances</h1>
        {loading && <p>Loading finance records…</p>}
        {denied && <div className="error">Administrator access required.</div>}
        {!loading && !denied && (
          <div className="admin-bookings">
            {bookings.map((booking) => (
              <AdminBookingCard key={booking.id} booking={booking} />
            ))}
            {!bookings.length && <p>No rental requests yet.</p>}
          </div>
        )}
        {!loading && !denied && <ContactInbox />}
      </main>
      <Footer />
    </>
  );
}

function AdminBookingCard({ booking }: { booking: AdminBooking }) {
  const propertyTitle = Array.isArray(booking.properties)
    ? booking.properties[0]?.title
    : booking.properties?.title;
  if (!booking.currency || booking.accommodation_amount === null)
    return (
      <article className="admin-booking-card">
        <h2>{propertyTitle || "Seasonal home"}</h2>
        <p>This legacy request has no pricing snapshot.</p>
      </article>
    );

  const money = (amount: number | null) =>
    amount === null ? "Not recorded" : formatMinorUnits(amount, booking.currency!);
  return (
    <article className="admin-booking-card">
      <header>
        <div>
          <h2>{propertyTitle || "Seasonal home"}</h2>
          <span>{booking.status.replaceAll("_", " ")}</span>
        </div>
        <small>{booking.id}</small>
      </header>
      <dl>
        <div><dt>Accommodation</dt><dd>{money(booking.accommodation_amount)}</dd></div>
        <div><dt>Guest fee ({formatFeeRate(Number(booking.guest_fee_rate))})</dt><dd>{money(booking.guest_fee_amount)}</dd></div>
        <div><dt>Owner fee ({formatFeeRate(Number(booking.owner_fee_rate))})</dt><dd>{money(booking.owner_fee_amount)}</dd></div>
        <div><dt>32+ gross revenue</dt><dd>{money(booking.platform_gross_revenue)}</dd></div>
        <div><dt>Processing cost</dt><dd>{money(booking.payment_processing_cost)}</dd></div>
        <div><dt>Owner proceeds</dt><dd>{money(booking.owner_net_amount)}</dd></div>
        <div><dt>Payment status</dt><dd>{booking.payment_status.replaceAll("_", " ")}</dd></div>
        <div><dt>Payout status</dt><dd>{booking.payout_status.replaceAll("_", " ")}</dd></div>
      </dl>
    </article>
  );
}
