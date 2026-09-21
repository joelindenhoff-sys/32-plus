'use client';
import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { validateContact, type ContactInput } from '../../../lib/contact';

export default function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const pending = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    setError(''); setSuccess('');
    const form = event.currentTarget;
    const values = new FormData(form);
    const input = Object.fromEntries(['name', 'email', 'user_type', 'subject', 'message'].map(key => [key, String(values.get(key) || '').trim()])) as ContactInput;
    const validation = validateContact(input);
    if (validation) { setError(validation); return; }
    pending.current = true; setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: controller.signal });
      const result = await response.json().catch(() => ({}));
      if (!response.ok && response.status !== 202) {
        setError(result.error || 'We could not confirm receipt of your enquiry. Please try again later. Your text is still here.');
        return;
      }
      form.reset();
      setSuccess(result.emailed ? 'Your enquiry has been received and emailed to the support team. Thank you.' : 'Your enquiry has been saved securely. The email notification could not be sent, but the support team can still view it in the 32+ inbox.');
    } catch { setError('We could not confirm receipt. Check your connection and try again. Your text is still here.'); }
    finally { clearTimeout(timeout); pending.current = false; setLoading(false); }
  }
  return <section aria-labelledby="contact-form-heading"><h2 id="contact-form-heading">Send an enquiry</h2><form className="form info-contact" onSubmit={submit} aria-busy={loading}>
    <fieldset disabled={loading}><legend className="contact-legend">All fields are required.</legend>
      <label>Name<input name="name" required maxLength={100} autoComplete="name" /></label>
      <label>Email<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
      <label>User type<select name="user_type" required defaultValue=""><option value="" disabled>Select an option</option><option>Tenant</option><option>Owner</option><option>Other</option></select></label>
      <label>Subject<input name="subject" required maxLength={160} /></label>
      <label>Message<textarea name="message" required minLength={10} maxLength={5000} aria-describedby="contact-privacy" /></label>
      <small id="contact-privacy">Promacan Corp, S.L. uses these details to handle your enquiry. It is stored privately for authorised support administrators. Read our <Link href="/info/privacy">Privacy Policy</Link>.</small>
      <button className="primary" type="submit" disabled={loading}>{loading ? 'Sending…' : 'Submit enquiry'}</button>
    </fieldset>
    {error && <p className="error" role="alert">{error}</p>}
    {success && <p className="notice" role="status">{success}</p>}
  </form></section>;
}
