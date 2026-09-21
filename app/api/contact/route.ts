import { createClient } from '@supabase/supabase-js';
import { validateContact, type ContactInput } from '../../../lib/contact';
import { sendContactEmail } from '../../../lib/smtp';

export const runtime = 'nodejs';
export const maxDuration = 15;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 20_000) return Response.json({ error: 'Request is too large.' }, { status: 413 });

  let input: ContactInput;
  try {
    const body = await request.json();
    input = Object.fromEntries(['name', 'email', 'user_type', 'subject', 'message'].map((key) => [key, String(body?.[key] || '').trim()])) as ContactInput;
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const validation = validateContact(input);
  if (validation) return Response.json({ error: validation }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return Response.json({ error: 'Contact service is unavailable.' }, { status: 503 });
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: saveError } = await supabase.from('contact_messages').insert(input);
  if (saveError) {
    const status = saveError.code === 'P0001' ? 429 : 503;
    return Response.json({ error: status === 429 ? 'Too many enquiries have been submitted recently. Please try again later.' : 'We could not save your enquiry.' }, { status });
  }

  try {
    await sendContactEmail(input);
    return Response.json({ saved: true, emailed: true });
  } catch (error) {
    console.error('Contact email notification failed', error instanceof Error ? error.message : 'Unknown SMTP error');
    return Response.json({ saved: true, emailed: false }, { status: 202 });
  }
}
