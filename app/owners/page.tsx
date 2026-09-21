import Link from "next/link";
import { Header, Footer } from "../components";
import type { Metadata } from "next";
import FeeExample from "../info/_components/FeeExample";
import "../info/info.css";

export const metadata: Metadata = { title: "For Owners | 32+ Night Rentals", description: "List a furnished home for stays of 32 nights or longer. Understand owner fees and the rental request process." };

export default function Owners() {
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
        <section id="owner-fees" aria-label="Owner fees">
          <FeeExample audience="owner" />
          <p className="lead">Free to list. The owner service fee is calculated on accommodation rent only and recorded in the booking quote. It is intended to be deducted from rent when a successful booking is paid, rather than charged for publishing a listing.</p>
          <p className="lead">The platform provides listing tools, availability and pricing management, booking-request review and digital agreement records. Live payment collection and payouts are not yet available; no owner fee is collected by the current request workflow.</p>
          <p className="lead"><Link href="/info/payouts">Read how payouts work →</Link></p>
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
