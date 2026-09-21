"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

const footerGroups = [
  { title: "32+", links: [["About 32+", "/info/about"], ["How It Works", "/info/how-it-works"], ["Contact", "/info/contact"]] },
  { title: "For Tenants", links: [["Find a Home", "/homes"], ["How It Works", "/info/how-it-works"], ["Tenant Fees", "/info/tenant-fees"], ["Rental Requirements", "/info/rental-requirements"]] },
  { title: "For Owners", links: [["List Your Property", "/login?mode=owner"], ["Owner Fees", "/owners#owner-fees"], ["How Payouts Work", "/info/payouts"]] },
  { title: "Legal & Support", links: [["Help Centre", "/info/help"], ["Terms & Conditions", "/info/terms"], ["Privacy Policy", "/info/privacy"], ["Cookie Policy", "/info/cookies"], ["Legal Notice", "/info/legal-notice"]] },
] as const;

export function Header() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);
  async function signOut() { await supabase.auth.signOut(); window.location.href = "/"; }
  return <header className="nav"><Link href="/" aria-label="32+ Night Rentals home"><picture><source media="(max-width: 560px)" srcSet="/logo-small.png"/><img className="logo" src="/logo.png" alt="32+ Plus — 32+ Night Rentals"/></picture></Link><nav aria-label="Main navigation"><Link href="/homes">Find a home</Link><Link href="/owners">For owners</Link>{signedIn ? <><Link href="/dashboard">Dashboard</Link><button className="nav-button" onClick={signOut}>Sign out</button></> : <Link className="pill" href="/login">Log in or sign up</Link>}</nav></header>;
}

export function Footer() {
  return <footer className="footer site-footer"><div className="footer-main"><div className="footer-brand"><Link href="/" aria-label="32+ Night Rentals home"><img src="/logo-small.png" alt="32+ Night Rentals"/></Link><p>Furnished temporary stays. 32 nights and longer.</p></div><nav className="footer-navigation" aria-label="Footer navigation">{footerGroups.map((group) => <section className="footer-column" key={group.title}><h2>{group.title}</h2><ul>{group.links.map(([label, href]) => <li key={`${group.title}-${label}`}><Link href={href}>{label}</Link></li>)}</ul></section>)}</nav></div><div className="footer-bottom"><div className="footer-company"><span>© 2026 32+ Night Rentals · All rights reserved.</span><span>Operated by Promacan Corp, S.L. · Spain</span></div><div className="footer-controls" aria-label="Site preferences and payments"><span className="secure-payment"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>Secure payments</span><button type="button" disabled title="Language selection coming soon">English (UK)</button><button type="button" disabled title="Currency selection coming soon">EUR</button></div></div></footer>;
}
