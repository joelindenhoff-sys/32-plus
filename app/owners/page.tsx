"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Header, Footer } from "../components";
import { formatFeeRate } from "../../lib/pricing";
import { supabase } from "../../lib/supabase";

export default function Owners() {
  const [ownerFeeRate, setOwnerFeeRate] = useState<number | null>(null);

  useEffect(() => {
    supabase.rpc("get_current_public_pricing").then(({ data }) => {
      setOwnerFeeRate(
        data?.[0]?.owner_fee_rate == null
          ? null
          : Number(data[0].owner_fee_rate),
      );
    });
  }, []);

  return (
    <>
      <Header />
      <main className="simple">
        <p className="eyebrow">FOR OWNERS</p>
        <h1>
          Your property.
          <br />
          <i>The right tenant.</i>
        </h1>
        <p className="lead">
          List a furnished home for people looking for a genuine temporary
          stay. Add your property, price and availability and receive enquiries
          online.
        </p>
        <section className="owner-fee-card">
          <span>32+ service fee</span>
          <strong>
            {ownerFeeRate === null
              ? "Current rate shown at booking"
              : formatFeeRate(ownerFeeRate)}
          </strong>
          <p>Free to list. You only pay when you receive a successful booking.</p>
        </section>
        <div className="owner-grid">
          <div className="owner-box">
            <b>01</b>
            <h3>List your home</h3>
            <p className="muted">Add the property and monthly price.</p>
          </div>
          <div className="owner-box">
            <b>02</b>
            <h3>Receive enquiries</h3>
            <p className="muted">
              See dates and the tenant&apos;s stated purpose.
            </p>
          </div>
          <div className="owner-box">
            <b>03</b>
            <h3>Arrange the rental</h3>
            <p className="muted">
              Agree the seasonal terms with the tenant.
            </p>
          </div>
        </div>
        <Link className="pill" href="/login?mode=owner">
          Owner sign in →
        </Link>
      </main>
      <Footer />
    </>
  );
}
