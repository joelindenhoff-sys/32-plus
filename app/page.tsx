'use client';

import {FormEvent,useEffect,useState} from 'react';
import Link from 'next/link';
import {Header,Footer} from './components';
import {homes,islands,Home,PropertyRow,propertyToHome} from '../lib/data';
import {supabase} from '../lib/supabase';
import {getStayDurationError} from '../lib/rentalRules';
import './homepage.css';

const faqs=[
  ['What is a seasonal rental?','A furnished home rented for a genuine temporary purpose, such as work, study, relocation or another time-limited circumstance. It is not a tourist stay or permanent residence.'],
  ['Can I book instantly?','No. Every stay is request-only. You submit your dates and purpose of stay, and the owner reviews the request before any agreement is made.'],
  ['How long can I stay?','Flexible rentals from 32 nights to 11 months. This is a 32+ platform booking range; the temporary purpose of the stay remains essential.'],
  ['When do I pay?','Payment is only requested after owner approval and acceptance of the rental agreement. Online payment is not yet active during this early release.'],
];

export default function HomePage(){
  const[where,setWhere]=useState('Canary Islands');const[moveIn,setMoveIn]=useState('');const[moveOut,setMoveOut]=useState('');const[guests,setGuests]=useState('1');const[featured,setFeatured]=useState<Home[]>(homes);const[openFaq,setOpenFaq]=useState<number|null>(null);
  useEffect(()=>{supabase.from('properties').select('*').eq('is_published',true).order('created_at',{ascending:false}).then(({data})=>{if(data?.length)setFeatured((data as PropertyRow[]).map(propertyToHome))})},[]);
  function submit(event:FormEvent){event.preventDefault();if(moveIn||moveOut){const durationError=getStayDurationError(moveIn,moveOut);if(durationError){window.alert(durationError);return}}const params=new URLSearchParams({where,guests});if(moveIn)params.set('moveIn',moveIn);if(moveOut)params.set('moveOut',moveOut);window.location.href='/homes?'+params}

  return <><Header/><main className="market-home">
    <section className="market-hero"><div className="market-hero-photo" role="img" aria-label="A bright coastal home in the Canary Islands"/><div className="market-search-card"><p className="eyebrow">FURNISHED HOMES · 32+ NIGHTS</p><h1>Find your place<br/><i>in the Canary Islands.</i></h1><p className="market-intro">Beautiful homes for work, study, relocation and life between chapters.</p><form className="market-search" onSubmit={submit}><label><span>Location</span><select value={where} onChange={event=>setWhere(event.target.value)}>{islands.map(island=><option key={island}>{island}</option>)}</select></label><div className="market-dates"><label><span>Move in</span><input type="date" value={moveIn} onChange={event=>setMoveIn(event.target.value)}/></label><label><span>Move out</span><input type="date" value={moveOut} onChange={event=>setMoveOut(event.target.value)}/></label></div><label><span>Guests</span><select value={guests} onChange={event=>setGuests(event.target.value)}>{[1,2,3,4,5,6].map(number=><option key={number} value={number}>{number} {number===1?'guest':'guests'}</option>)}</select></label><button>Search homes <b>→</b></button></form></div></section>

    <section className="market-benefits"><article><div className="benefit-icon">32+</div><div><h2>Stay longer, settle in</h2><p>Flexible rentals from 32 nights to 11 months.</p></div></article><article><div className="benefit-icon">✓</div><div><h2>Requests reviewed by owners</h2><p>Tell the owner why you need a temporary home before anything is confirmed.</p></div></article><article><div className="benefit-icon">⌂</div><div><h2>Homes made for real life</h2><p>Wi-Fi, kitchens and practical comforts for living—not just visiting.</p></div></article></section>

    <HomeCollection title="Homes to make your own" description="Furnished seasonal homes across the islands, available by request." homes={featured.slice(0,4)}/>
    <section className="market-banner"><div><p className="eyebrow">A DIFFERENT WAY TO RENT</p><h2>Not a holiday rental.<br/><i>A home for your next chapter.</i></h2><p>32+ connects owners with people who need a genuine temporary home. Choose your dates, explain your purpose of stay and send a rental request directly to the owner.</p><Link href="/homes">Explore all homes →</Link></div><div className="market-banner-photo" role="img" aria-label="Living room of a furnished seasonal home"/></section>
    <HomeCollection title="Space to live and work" description="Comfortable homes with room for everyday routines." homes={featured.slice(2,6)}/>

    <section className="market-faq"><h2>Your questions, answered</h2><div>{faqs.map(([question,answer],index)=><article key={question}><button aria-expanded={openFaq===index} onClick={()=>setOpenFaq(openFaq===index?null:index)}><span>{question}</span><b>{openFaq===index?'−':'+'}</b></button>{openFaq===index&&<p>{answer}</p>}</article>)}</div></section>
    <section className="market-owner"><div><p className="eyebrow">FOR PROPERTY OWNERS</p><h2>A better fit for your furnished home.</h2><p>Publish your property, review genuine temporary-stay requests and stay in control of every approval.</p></div><Link href="/login?mode=owner">List your home →</Link></section>
  </main><Footer/></>;
}

function HomeCollection({title,description,homes:collection}:{title:string;description:string;homes:Home[]}){return <section className="market-collection"><div className="collection-title"><div><h2>{title}</h2><p>{description}</p></div><Link href="/homes">View all homes →</Link></div><div className="market-cards">{collection.map(home=><Link href={`/home/${home.id}`} className="market-card" key={home.id}><div className="market-card-image" style={{backgroundImage:`url(${home.image})`}}><span>Request only</span></div><div className="market-card-copy"><div><h3>{home.title}</h3><p>{home.location}</p></div><strong>€{home.price.toLocaleString()} <small>/ month</small></strong></div></Link>)}</div></section>}
