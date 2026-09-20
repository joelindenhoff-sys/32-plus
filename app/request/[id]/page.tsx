"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Header, Footer } from "../../components";
import { getHome, Home, propertyToHome, PropertyRow } from "../../../lib/data";
import { formatFeeRate, formatMinorUnits } from "../../../lib/pricing";
import { supabase } from "../../../lib/supabase";
import "./request.css";

const purposes = [
  "Work / professional assignment",
  "Remote work / temporary professional stay",
  "Study / training",
  "Medical / recovery",
  "Temporary relocation",
  "Home temporarily unavailable",
  "Family / personal temporary circumstances",
  "Other genuine temporary circumstance",
];

type PricingQuote = {
  pricing_policy_id: string;
  accommodation_amount: number;
  guest_fee_rate: number;
  guest_fee_amount: number;
  owner_fee_rate: number;
  owner_fee_amount: number;
  guest_total_amount: number;
  owner_net_amount: number;
  platform_gross_revenue: number;
  currency: string;
};

function nights(start: string, end: string) {
  return start && end
    ? Math.round(
        (new Date(`${end}T12:00:00`).getTime() -
          new Date(`${start}T12:00:00`).getTime()) /
          86_400_000,
      )
    : 0;
}

function date(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function RequestReview() {
  const { id } = useParams<{ id: string }>();
  const query = useSearchParams();
  const moveIn = query.get("moveIn") || "";
  const moveOut = query.get("moveOut") || "";
  const guests = Math.max(1, Number(query.get("guests") || 1));
  const stayNights = nights(moveIn, moveOut);

  const [home, setHome] = useState<Home | null>(null);
  const [ownerId, setOwnerId] = useState("");
  const [quote, setQuote] = useState<PricingQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [purpose, setPurpose] = useState("");
  const [details, setDetails] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        return;
      }
      const { data } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .eq("is_published", true)
        .maybeSingle();
      if (data) {
        setHome(propertyToHome(data as PropertyRow));
        setOwnerId(data.owner_id);
      } else {
        setHome(getHome(id) || null);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  useEffect(() => {
    if (!ownerId || stayNights < 32) {
      setQuote(null);
      return;
    }
    let active = true;
    async function loadQuote() {
      const { data, error: quoteError } = await supabase.rpc(
        "quote_rental_request",
        { p_property_id: id, p_move_in: moveIn, p_move_out: moveOut },
      );
      if (!active) return;
      if (quoteError) {
        setQuote(null);
        setError(
          quoteError.message.includes("no longer available")
            ? "These dates are already reserved. Please choose different dates."
            : "Pricing is temporarily unavailable. Please try again.",
        );
        return;
      }
      setError("");
      setQuote((data?.[0] as PricingQuote | undefined) || null);
    }
    loadQuote();
    return () => {
      active = false;
    };
  }, [id, moveIn, moveOut, ownerId, stayNights]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!home || !ownerId)
      return setError("This property is not accepting rental requests yet.");
    if (stayNights < 32)
      return setError("A rental request must be for at least 32 nights.");
    if (!quote)
      return setError("Please wait for the verified price before continuing.");
    if (!purpose) return setError("Please select your temporary reason.");
    if (purpose === "Other genuine temporary circumstance" && !details.trim())
      return setError("Please explain your other temporary reason.");
    if (!confirmed) return setError("Please confirm the declaration.");

    setSubmitting(true);
    const { error: insertError } = await supabase.rpc("create_rental_request", {
      p_property_id: home.id,
      p_move_in: moveIn,
      p_move_out: moveOut,
      p_occupants: guests,
      p_purpose_category: purpose,
      p_purpose_details:
        purpose === "Other genuine temporary circumstance"
          ? details.trim()
          : "Not required for selected category",
      p_tenant_declaration: true,
    });
    setSubmitting(false);
    if (insertError) return setError(insertError.message);
    setSent(true);
  }

  if (loading)
    return <main className="loading">Preparing your request…</main>;
  if (!home)
    return (
      <main className="simple">
        <h1>Home not found.</h1>
        <Link className="pill" href="/homes">
          Back to homes
        </Link>
      </main>
    );
  if (sent)
    return (
      <main className="request-success">
        <div>
          <span>✓</span>
          <p className="eyebrow">REQUEST SENT</p>
          <h1>The owner will review your stay.</h1>
          <p>
            You have not been charged. Follow the request and any next steps in
            your dashboard.
          </p>
          <Link className="request-submit" href="/dashboard">
            View your requests
          </Link>
        </div>
      </main>
    );

  return (
    <main className="booking-page">
      <div className="booking-title">
        <Link
          href={`/home/${home.id}?moveIn=${moveIn}&moveOut=${moveOut}&guests=${guests}`}
        >
          ←
        </Link>
        <h1>Review your rental request</h1>
      </div>
      <div className="booking-layout">
        <form className="booking-form" onSubmit={submit}>
          <section>
            <h2>Your stay</h2>
            <div className="booking-detail">
              <div>
                <strong>Dates</strong>
                <span>
                  {date(moveIn)} – {date(moveOut)} · {stayNights} nights
                </span>
              </div>
              <Link
                href={`/home/${home.id}?moveIn=${moveIn}&moveOut=${moveOut}&guests=${guests}`}
              >
                Edit
              </Link>
            </div>
            <div className="booking-detail">
              <div>
                <strong>Guests</strong>
                <span>
                  {guests} guest{guests === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </section>
          <section>
            <h2>Purpose of stay</h2>
            <p className="booking-help">
              Seasonal rentals require a genuine temporary purpose. The owner
              reviews this before approving your request.
            </p>
            <label>
              Temporary reason
              <select
                required
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
              >
                <option value="">Select a reason</option>
                {purposes.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            {purpose === "Other genuine temporary circumstance" && (
              <label>
                Other temporary reason — please explain
                <textarea
                  required
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  placeholder="Briefly explain why you need temporary accommodation"
                />
              </label>
            )}
          </section>
          <section>
            <h2>Review your request</h2>
            <label className="booking-check">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              <span>
                I confirm that the information is true and this accommodation
                is required for a genuine temporary purpose.
              </span>
            </label>
            {error && <div className="error">{error}</div>}
            <button
              className="request-submit"
              disabled={submitting || !quote}
            >
              {submitting ? "Sending request…" : "Send rental request"}
            </button>
            <p className="no-charge">
              You will not be charged now. The owner must approve your request
              before an agreement or payment.
            </p>
          </section>
        </form>
        <aside className="booking-summary">
          <div className="booking-property">
            <img src={home.image} alt="" />
            <div>
              <strong>{home.title}</strong>
              <span>{home.location}</span>
              <small>Verified 32+ seasonal home</small>
            </div>
          </div>
          {quote ? (
            <>
              <div className="summary-line">
                <span>Accommodation</span>
                <strong>
                  {formatMinorUnits(
                    quote.accommodation_amount,
                    quote.currency,
                  )}
                </strong>
              </div>
              <div className="summary-line">
                <span>
                  32+ service fee ({formatFeeRate(quote.guest_fee_rate)})
                </span>
                <strong>
                  {formatMinorUnits(quote.guest_fee_amount, quote.currency)}
                </strong>
              </div>
              <div className="summary-total">
                <span>Total</span>
                <strong>
                  {formatMinorUnits(quote.guest_total_amount, quote.currency)}
                </strong>
              </div>
            </>
          ) : (
            <p>Verifying your accommodation price…</p>
          )}
          {home.securityDeposit > 0 && (
            <p>
              A refundable security deposit of €
              {home.securityDeposit.toLocaleString()} is separate and is not
              included when calculating the 32+ service fee.
            </p>
          )}
          <p>
            Final terms are confirmed only after owner approval and review of
            the seasonal rental agreement.
          </p>
        </aside>
      </div>
    </main>
  );
}

export default function RequestPage() {
  return (
    <>
      <Header />
      <Suspense
        fallback={<main className="loading">Preparing your request…</main>}
      >
        <RequestReview />
      </Suspense>
      <Footer />
    </>
  );
}
