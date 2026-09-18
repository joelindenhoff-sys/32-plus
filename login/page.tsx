'use client';
import {FormEvent,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {Suspense} from 'react';
import {Header} from '../components';
function LoginBox(){const q=useSearchParams();const [role,setRole]=useState(q.get('mode')==='owner'?'owner':'tenant');const [email,setEmail]=useState('');const [done,setDone]=useState(false);function submit(e:FormEvent){e.preventDefault();localStorage.setItem('32plus_user',JSON.stringify({email,role}));setDone(true);if(role==='owner')location.href='/dashboard'}return <div className="login-wrap"><div className="login-card"><p className="eyebrow">32+</p><h1>Sign in</h1><div className="tabs"><button className={role==='tenant'?'active':''} onClick={()=>setRole('tenant')}>Tenant</button><button className={role==='owner'?'active':''} onClick={()=>setRole('owner')}>Owner</button></div>{done?<div className="notice">Signed in. Redirecting…</div>:<form className="form" onSubmit={submit}><label>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input required type="password" placeholder="••••••••"/></label><button className="primary">Continue →</button></form>}</div></div>}
export default function Login(){return <><Header/><Suspense fallback={<div className="login-wrap">Loading…</div>}><LoginBox/></Suspense></>}
