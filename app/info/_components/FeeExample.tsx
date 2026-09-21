'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { formatFeeRate, formatMinorUnits } from '../../../lib/pricing';

export default function FeeExample({ audience }: { audience: 'tenant' | 'owner' }) {
  const [pricing, setPricing] = useState<{ rate: number; currency: string } | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let active = true;
    async function load() {
      setStatus('loading');
      try {
        const { data, error } = await supabase.rpc('get_current_public_pricing').abortSignal(controller.signal);
        const row = data?.[0];
        const raw = row?.[audience === 'owner' ? 'owner_fee_rate' : 'guest_fee_rate'];
        const rate = Number(raw);
        if (error || raw == null || !Number.isFinite(rate) || rate < 0 || rate > 1 || !/^[A-Z]{3}$/.test(row.currency)) throw new Error('Pricing unavailable');
        if (active) { setPricing({ rate, currency: row.currency }); setStatus('ready'); }
      } catch { if (active) setStatus('error'); }
      finally { clearTimeout(timeout); }
    }
    void load();
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [audience, attempt]);
  const rent = 100000;
  // Match the database numeric rate (up to 6 decimals) and half-up rounding.
  const fee = pricing ? Number((BigInt(rent) * BigInt(Math.round(pricing.rate * 1000000)) + BigInt(500000)) / BigInt(1000000)) : 0;
  return <div className="fee-example" aria-live="polite" aria-busy={status === 'loading'}><h2>Current standard {audience} fee</h2>
    {status === 'loading' && <p>Loading the current fee…</p>}
    {status === 'error' && <><p>The current rate could not be loaded. Review the fee in your booking quote before proceeding.</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Try again</button></>}
    {status === 'ready' && pricing && <><strong className="fee-rate">{formatFeeRate(pricing.rate)}</strong><p>Of accommodation rent only. Example for a stay with {formatMinorUnits(rent, pricing.currency)} in accommodation rent:</p><dl><div><dt>Accommodation rent</dt><dd>{formatMinorUnits(rent, pricing.currency)}</dd></div><div><dt>{audience === 'owner' ? 'Owner' : 'Tenant'} service fee</dt><dd>{formatMinorUnits(fee, pricing.currency)}</dd></div><div><dt>{audience === 'owner' ? 'Owner net amount' : 'Rent + service fee'}</dt><dd>{formatMinorUnits(audience === 'owner' ? rent - fee : rent + fee, pricing.currency)}</dd></div></dl><p>Illustrative rent for the whole stay, not a monthly quote. Deposit and other separately disclosed charges are excluded. The fee recorded for your specific request may differ from the standard rate.</p></>}
  </div>;
}
