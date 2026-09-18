'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {supabase} from '../lib/supabase';
export function Header(){const[signedIn,setSignedIn]=useState(false);useEffect(()=>{supabase.auth.getSession().then(({data})=>setSignedIn(Boolean(data.session)));const{data}=supabase.auth.onAuthStateChange((_event,session)=>setSignedIn(Boolean(session)));return()=>data.subscription.unsubscribe()},[]);async function signOut(){await supabase.auth.signOut();window.location.href='/'}return <header className="nav"><Link href="/"><img className="logo" src="/logo.png" alt="32+"/></Link><nav><Link href="/homes">Find a home</Link><Link href="/owners">For owners</Link>{signedIn?<><Link href="/dashboard">Dashboard</Link><button className="nav-button" onClick={signOut}>Sign out</button></>:<Link className="pill" href="/login">Sign in</Link>}</nav></header>}
export function Footer(){return <footer className="footer"><img src="/logo.png" alt="32+"/><span>SEASONAL RENTALS</span><span>Canary Islands</span><div className="right"><Link href="/owners">Owners</Link><Link href="/login">Sign in</Link></div></footer>}
