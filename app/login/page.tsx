'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '../components';
import { supabase } from '../../lib/supabase';

function LoginBox() {
  const query = useSearchParams();
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    setLoading(true);

    if (isCreatingAccount) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role: 'tenant' } },
      });
      setLoading(false);
      if (signUpError) return setError(signUpError.message);
      if (!data.session) return setNotice('Check your email to confirm your account, then sign in.');
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (signInError) return setError(signInError.message);
    }

    const next = query.get('next');
    window.location.href = next && next.startsWith('/') ? next : '/dashboard';
  }

  return <div className="login-wrap"><div className="login-card login-card-unified"><div className="login-heading"><img src="/logo-secondary.png" alt="32+ Night Rentals"/><div><p className="eyebrow">ONE 32+ ACCOUNT</p><h1>{isCreatingAccount ? 'Create your account' : 'Log in or sign up'}</h1></div></div><p className="login-intro">Use the same account to find a home or list and manage your property.</p><form className="form" onSubmit={submit}>{isCreatingAccount && <label>Full name<input required autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>}<label>Email<input required type="email" autoComplete="email" placeholder="Email address" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input required type="password" minLength={8} autoComplete={isCreatingAccount ? 'new-password' : 'current-password'} placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <div className="error">{error}</div>}{notice && <div className="notice">{notice}</div>}<button className="primary login-primary" disabled={loading}>{loading ? 'Please wait…' : isCreatingAccount ? 'Create account' : 'Continue'}</button></form><div className="login-divider"><span>or</span></div><button type="button" className="account-switch" onClick={() => { setIsCreatingAccount(!isCreatingAccount); setError(''); setNotice(''); }}>{isCreatingAccount ? 'Already have an account? Log in' : 'New to 32+? Create an account'}</button><p className="login-footnote">After logging in, switch between <strong>Rent a home</strong> and <strong>List your property</strong> at any time.</p></div></div>;
}

export default function Login() {
  return <><Header /><Suspense fallback={<div className="login-wrap">Loading…</div>}><LoginBox /></Suspense></>;
}
