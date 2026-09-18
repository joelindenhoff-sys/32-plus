'use client';
import Link from 'next/link';
export function Header(){return <header className="nav"><Link href="/"><img className="logo" src="/logo.png" alt="32+"/></Link><nav className="nav-links"><Link href="/homes">Find a home</Link><Link href="/owners">For owners</Link><Link className="pill" href="/login">Sign in</Link></nav></header>}
export function Footer(){return <footer className="footer"><img src="/logo.png" alt="32+"/><span>SEASONAL RENTALS</span><span>Canary Islands</span><div className="right"><Link href="/owners">Owners</Link><Link href="/login">Sign in</Link></div></footer>}
