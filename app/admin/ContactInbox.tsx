'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { ContactInput } from '../../lib/contact';
type Message = ContactInput & { id: string; created_at: string };
export default function ContactInbox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState('Loading enquiries…');
  const [page, setPage] = useState(0);
  useEffect(() => {
    let active = true;
    setStatus('Loading enquiries…');
    async function load() {
      try {
        const { data, error } = await supabase.from('contact_messages').select('id,name,email,user_type,subject,message,created_at').order('created_at', { ascending: false }).range(page * 25, page * 25 + 24);
        if (!active) return;
        if (error) { setMessages([]); setStatus('Unable to load enquiries. Please refresh and try again.'); return; }
        setMessages(data || []); setStatus(data?.length ? '' : 'No enquiries on this page.');
      } catch { if (active) setStatus('Unable to load enquiries. Please refresh and try again.'); }
    }
    void load(); return () => { active = false; };
  }, [page]);
  return <section aria-labelledby="inbox-title" style={{ marginTop: 48 }}><h2 id="inbox-title">Contact enquiries</h2><p>Private support inbox. Email addresses are supplied by visitors and are not verified.</p><p role="status">{status}</p>{!status && messages.map(message => <article className="admin-booking-card" key={message.id}><h3>{message.subject}</h3><p>{message.name} · {message.user_type} · {message.email}</p><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString('en-GB')}</time><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{message.message}</p></article>)}<nav aria-label="Enquiry pages"><button className="pill" disabled={page === 0 || status === 'Loading enquiries…'} onClick={() => setPage(value => value - 1)}>Previous</button> <span>Page {page + 1}</span> <button className="pill" disabled={messages.length < 25 || Boolean(status)} onClick={() => setPage(value => value + 1)}>Next</button></nav></section>;
}
