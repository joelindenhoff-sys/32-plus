'use client';
import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { supabase } from '../../../lib/supabase';
import { validateContact, type ContactInput } from '../../../lib/contact';

export default function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const pending = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    setError(''); setSuccess(false);
    const form = event.currentTarget;
    const values = new FormData(form);
    const input = Object.fromEntries(['name', 'email', 'user_type', 'subject', 'message'].map(key => [key, String(values.get(key) || '').trim()])) as ContactInput;
    const validation = validateContact(input);
    if (validation) { setError(validation); return; }
    pending.current = true; setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const { error: saveError } = await supabase.from('contact_messages').insert(input).abortSignal(controller.signal);
      if (saveError) {
        setError(saveError.code === 'P0001' ? 'Too many enquiries have been submitted recently. Please try again later.' : 'We could not confirm receipt of your enquiry. Please try again later. Your text is still here.');
        return;
      }
      form.reset(); setSuccess(true);
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
    {success && <p className="notice" role="status">Your enquiry has been received and saved for the support team. Thank you.</p>}
  </form></section>;
}
