'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Header, Footer } from '../../components';
import { getHome, Home } from '../../../lib/data';

const purposes = ['Work / professional assignment', 'Remote work / temporary professional stay', 'Study / training', 'Medical / recovery', 'Temporary relocation', 'Home temporarily unavailable', 'Family / personal temporary circumstances', 'Other genuine temporary circumstance'];

function nights(moveIn: string, moveOut: string) {
  if (!moveIn || !moveOut) return 0;
  return Math.round((new Date(`${moveOut}T12:00:00`).getTime() - new Date(`${moveIn}T12:00:00`).getTime()) / 86400000);
}

export default function Property() {
  const { id } = useParams<{ id: string }>();
  const query = useSearchParams();
  const [home, setHome] = useState<Home | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [moveIn, setMoveIn] = useState(query.get('moveIn') || '');
  const [moveOut, setMoveOut] = useState(query.get('moveOut') || '');
  const [purpose, setPurpose] = useState('');
  const [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const listedHome = getHome(id);
    if (listedHome) return setHome(listedHome);
    const ownerListings = JSON.parse(localStorage.getItem('32plus_owner_listings') || '[]') as Home[];
    setHome(ownerListings.find((listing) => listing.id === id) || null);
  }, [id]);

  if (!home) return <><Header /><main className="simple"><h1>Home not found.</h1><Link className="pill" href="/homes">Back to homes</Link></main><Footer /></>;

  const currentHome = home;
  const stayNights = nights(moveIn, moveOut);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (stayNights < 32) return setError('Please select a stay of at least 32 nights.');
    if (!purpose) return setError('Please select the genuine reason for your temporary stay.');
    if (!confirmed) return setError('Please confirm your stated purpose is true and accurate.');
    const enquiries = JSON.parse(localStorage.getItem('32plus_enquiries') || '[]') as unknown[];
    enquiries.unshift({ id: crypto.randomUUID(), homeId: currentHome.id, home: currentHome.title, name, email, moveIn, moveOut, purpose, message, createdAt: new Date().toISOString() });
    localStorage.setItem('32plus_enquiries', JSON.stringify(enquiries));
    setError('');
    setSent(true);
  }

  return <><Header /><main className="property"><Link className="back" href="/homes">← All homes</Link><div className="property-hero" style={{ backgroundImage: `url(${currentHome.image})` }} /><div className="property-grid"><section><div className="location">{currentHome.location}</div><h1>{currentHome.title}</h1><div className="facts"><div><strong>{currentHome.bedrooms}</strong><span> bedrooms</span></div><div><strong>{currentHome.bathrooms}</strong><span> bathrooms</span></div><div><strong>€{currentHome.price.toLocaleString()}</strong><span> / month</span></div></div><p>{currentHome.description}</p><div className="features">{currentHome.features.map((feature) => <div key={feature}>✓ {feature}</div>)}</div></section><aside className="enquiry"><h2>Ask about this home</h2>{sent ? <div className="notice"><strong>Enquiry sent.</strong><br />The request is saved in your 32+ prototype.</div> : <form className="form" onSubmit={submit}><label>Name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Move-in<input required type="date" value={moveIn} onChange={(event) => setMoveIn(event.target.value)} /></label><label>Move-out<input required type="date" value={moveOut} onChange={(event) => setMoveOut(event.target.value)} /></label>{moveIn && moveOut && <div className="stay-length">Stay: <strong>{stayNights} nights</strong></div>}<label>Reason for temporary stay<select required value={purpose} onChange={(event) => setPurpose(event.target.value)}><option value="">Select a reason</option>{purposes.map((option) => <option key={option}>{option}</option>)}</select></label><label>Message<textarea value={message} onChange={(event) => setMessage(event.target.value)} /></label><label className="check"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>I confirm my stated temporary-stay purpose is true and accurate.</span></label>{error && <div className="error">{error}</div>}<button className="primary">Send enquiry →</button></form>}</aside></div></main><Footer /></>;
}
