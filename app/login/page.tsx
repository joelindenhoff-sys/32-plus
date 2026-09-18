'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '../components';
import { supabase } from '../../lib/supabase';

function LoginBox() {
  const query = useSearchParams();
  const [role, setRole] = useState<'tenant' | 'owner'>(query.get('mode') === 'owner' ? 'owner' : 'tenant');
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
        options: { data: { full_name: fullName, role } },
      });
      setLoading(false);
      if (signUpError) return setError(signUpError.message);
      if (!data.session) return setNotice('Check your email to confirm your account, then sign in.');
    } else {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (signInError) return setError(signInError.message);
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', signInData.user.id).single();
      const next = query.get('next');
      window.location.href = next && next.startsWith('/') ? next : profile?.role === 'owner' || profile?.role === 'admin' ? '/dashboard' : '/homes';
      return;
    }

    window.location.href = role === 'owner' ? '/dashboard' : '/homes';
  }

  return <div className="login-wrap"><div className="login-card"><p className="eyebrow">32+ ACCOUNT</p><h1>{isCreatingAccount ? 'Create account' : 'Sign in'}</h1><div className="tabs"><button type="button" className={role === 'tenant' ? 'active' : ''} onClick={() => setRole('tenant')}>Tenant</button><button type="button" className={role === 'owner' ? 'active' : ''} onClick={() => setRole('owner')}>Owner</button></div><form className="form" onSubmit={submit}>{isCreatingAccount && <label>Full name<input required value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>}<label>Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input required type="password" minLength={8} autoComplete={isCreatingAccount ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <div className="error">{error}</div>}{notice && <div className="notice">{notice}</div>}<button className="primary" disabled={loading}>{loading ? 'Please wait…' : isCreatingAccount ? 'Create account →' : 'Sign in →'}</button></form><button type="button" className="account-switch" onClick={() => { setIsCreatingAccount(!isCreatingAccount); setError(''); setNotice(''); }}>{isCreatingAccount ? 'Already have an account? Sign in' : 'New to 32+? Create an account'}</button></div></div>;
}

export default function Login() {
  return <><Header /><Suspense fallback={<div className="login-wrap">Loading…</div>}><LoginBox /></Suspense></>;
}
