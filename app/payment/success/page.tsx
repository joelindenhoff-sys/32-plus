import Link from "next/link";
import { Footer, Header } from "../../components";

export default function PaymentSuccessPage() {
  return <><Header/><main className="simple"><p className="eyebrow">PAYMENT RECEIVED</p><h1>Your payment is being confirmed.</h1><p className="lead">Stripe will notify 32+ securely. Your dashboard updates as soon as payment confirmation is recorded.</p><Link className="pill" href="/dashboard">View your rental</Link></main><Footer/></>;
}

