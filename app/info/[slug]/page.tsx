import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer, Header } from "../../components";

const pages = {
  about: ["About 32+", "Learn more about the 32+ seasonal-rental marketplace."],
  "how-it-works": ["How 32+ Works", "A clear guide for tenants and property owners is being prepared."],
  contact: ["Contact 32+", "Our contact options will be available here shortly."],
  "tenant-fees": ["Tenant Fees", "All applicable tenant fees are shown clearly before a rental request is confirmed."],
  "rental-requirements": ["Rental Requirements", "Detailed requirements for genuine temporary and seasonal stays are being prepared."],
  payouts: ["How Payouts Work", "Owner payout information will be published here before payment processing goes live."],
  help: ["Help Centre", "Helpful guides for tenants and owners are being prepared."],
  terms: ["Terms & Conditions", "The complete platform terms will be published here before live transactions begin."],
  privacy: ["Privacy Policy", "The complete privacy policy will be published here before live transactions begin."],
  cookies: ["Cookie Policy", "The complete cookie policy will be published here before live transactions begin."],
  "legal-notice": ["Legal Notice", "The complete legal notice will be published here before live transactions begin."],
} as const;

export function generateStaticParams() { return Object.keys(pages).map((slug) => ({ slug })); }

export default async function InfoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pages[slug as keyof typeof pages];
  if (!page) notFound();
  return <><Header/><main className="simple info-page"><p className="eyebrow">32+ NIGHT RENTALS</p><h1>{page[0]}</h1><p className="lead">{page[1]}</p><Link className="pill" href="/">Return home</Link></main><Footer/></>;
}
