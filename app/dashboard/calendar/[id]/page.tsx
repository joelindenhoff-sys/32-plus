'use client';

import {FormEvent,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {useParams} from 'next/navigation';
import {Header,Footer} from '../../../components';
import {PropertyRow} from '../../../../lib/data';
import {supabase} from '../../../../lib/supabase';
import '../../owner-tools.css';
import './calendar.css';
import '../../property/[id]/cancellation-note.css';

type Month={key:string;label:string;year:number;month:number};
const weekdays=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function monthKeys(length:number):Month[]{const now=new Date();return Array.from({length},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()+i,1);return{key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,label:new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric'}).format(d),year:d.getFullYear(),month:d.getMonth()}})}
function monthDays(month:Month){const first=(new Date(month.year,month.month,1).getDay()+6)%7;const count=new Date(month.year,month.month+1,0).getDate();return[...Array(first).fill(null),...Array.from({length:count},(_,i)=>i+1)] as Array<number|null>}

export default function CalendarSettings(){
  const{id}=useParams<{id:string}>();
  const[property,setProperty]=useState<PropertyRow|null>(null);
  const[error,setError]=useState('');
  const[saved,setSaved]=useState('');
  const horizon=property?.availability_horizon_months||12;
  const months=useMemo(()=>monthKeys(horizon),[horizon]);
  useEffect(()=>{supabase.from('properties').select('*').eq('id',id).single().then(({data,error})=>{if(error)setError(error.message);else setProperty(data as PropertyRow)})},[id]);

  async function save(e:FormEvent){e.preventDefault();if(!property)return;setError('');setSaved('');const url=property.external_calendar_url?.trim()||null;if(url&&!url.toLowerCase().includes('.ics'))return setError('The imported calendar URL must be an iCalendar link ending in .ics.');const{error:updateError}=await supabase.from('properties').update({monthly_rent:Number(property.monthly_rent),monthly_prices:property.monthly_prices||{},availability_horizon_months:Number(property.availability_horizon_months)||12,cleaning_fee:Number(property.cleaning_fee),cancellation_policy:property.cancellation_policy,minimum_nights:Math.max(32,Number(property.minimum_nights)),external_calendar_url:url,external_calendar_name:property.external_calendar_name||null}).eq('id',id);if(updateError)setError(updateError.message);else setSaved('Calendar and pricing settings saved.')}
  function set(key:keyof PropertyRow,value:unknown){if(property)setProperty({...property,[key]:value})}
  function setMonth(key:string,value:string){if(!property)return;const prices={...(property.monthly_prices||{})};if(value==='')delete prices[key];else prices[key]=Number(value);setProperty({...property,monthly_prices:prices})}
  function useBasePrice(key:string){if(!property)return;const prices={...(property.monthly_prices||{})};delete prices[key];setProperty({...property,monthly_prices:prices})}

  if(!property)return <><Header/><main className="owner-tool-page"><p>{error||'Loading calendar…'}</p></main></>;
  const exportUrl=`${window.location.origin}/api/calendar/${id}.ics`;
  return <><Header/><main className="owner-tool-page calendar-page"><div className="owner-tool-header"><div><Link href="/dashboard">← Back to dashboard</Link><p className="eyebrow">CALENDAR & PRICING</p><h1>{property.title}</h1></div><Link className="outline-action" href={`/dashboard/property/${id}`}>Edit property</Link></div><form onSubmit={save}>
    <section className="calendar-settings-card"><h2>Availability and fees</h2><div className="settings-grid"><label>Availability horizon<select value={horizon} onChange={e=>set('availability_horizon_months',Number(e.target.value))}>{[6,8,12,24].map(value=><option key={value} value={value}>{value} months</option>)}</select><span>The calendar always begins with the current month and rolls forward automatically.</span></label><label>Cleaning fee (€)<input type="number" min="0" value={property.cleaning_fee} onChange={e=>set('cleaning_fee',e.target.value)}/></label><label>Minimum stay<input type="number" min="32" value={property.minimum_nights} onChange={e=>set('minimum_nights',e.target.value)}/><span>Cannot be lower than 32 nights.</span></label><label>Cancellation policy<select value={property.cancellation_policy} onChange={e=>set('cancellation_policy',e.target.value)}><option value="flexible">Flexible</option><option value="moderate">Moderate</option><option value="firm">Firm</option><option value="non_refundable">Non-refundable</option></select></label></div></section>

    <section className="calendar-settings-card"><div className="pricing-heading"><div><h2>Monthly pricing calendar</h2><p>Every month automatically uses the base price. Change an individual month only when you need a seasonal price.</p></div><label>Monthly base price (€)<input type="number" min="1" value={property.monthly_rent} onChange={e=>set('monthly_rent',e.target.value)}/><span>Updates every month that has no custom price.</span></label></div><div className="calendar-months">{months.map(month=><MonthCalendar key={month.key} month={month} basePrice={Number(property.monthly_rent)} customPrice={property.monthly_prices?.[month.key]} onPrice={value=>setMonth(month.key,value)} onUseBase={()=>useBasePrice(month.key)}/>)}</div></section>

    <section className="calendar-settings-card calendar-connect"><h2>Connect to another website</h2><p>Use iCalendar links to exchange blocked and booked dates with another platform. Calendar refresh timing depends on each connected service.</p><div className="sync-step"><b>Step 1</b><div><strong>Add this link to the other website</strong><span>32+ calendar link</span><div className="copy-row"><input readOnly value={exportUrl}/><button type="button" onClick={()=>navigator.clipboard.writeText(exportUrl)}>Copy</button></div></div></div><div className="sync-step"><b>Step 2</b><div><strong>Add the other website&apos;s calendar</strong><span>Get a link ending in .ics from the other website and add it below.</span><label>Calendar name<input value={property.external_calendar_name||''} onChange={e=>set('external_calendar_name',e.target.value)} placeholder="e.g. External booking calendar"/></label><label>Calendar address (.ics)<input type="url" value={property.external_calendar_url||''} onChange={e=>set('external_calendar_url',e.target.value)} placeholder="https://example.com/calendar.ics"/></label></div></div><div className="sync-guidance"><strong>How calendar connection works</strong><ol><li>Copy your 32+ link into the other booking website.</li><li>Copy that website&apos;s .ics export link into 32+.</li><li>Save these settings. Imported events will block the corresponding dates once automatic importing is enabled.</li></ol></div><p className="sync-status"><strong>Important:</strong> Saving the external link configures the connection. Automatic background importing must be enabled separately before 32+ can claim full two-way synchronization.</p></section>
    {error&&<div className="error">{error}</div>}{saved&&<div className="notice">{saved}</div>}<button className="save-owner-tool">Save calendar settings</button>
  </form></main><Footer/></>;
}

function MonthCalendar({month,basePrice,customPrice,onPrice,onUseBase}:{month:Month;basePrice:number;customPrice:number|undefined;onPrice:(value:string)=>void;onUseBase:()=>void}){const custom=customPrice!==undefined&&customPrice!==null&&customPrice>0;return <article className="month-calendar"><header><strong>{month.label}</strong><label>€ <input aria-label={`${month.label} monthly price`} type="number" min="1" value={custom?customPrice:basePrice} onChange={e=>onPrice(e.target.value)}/></label></header><div className="month-price-mode"><span>{custom?'Custom monthly price':'Using base price'}</span>{custom&&<button type="button" onClick={onUseBase}>Use base</button>}</div><div className="weekday-row">{weekdays.map(day=><b key={day}>{day}</b>)}</div><div className="day-grid">{monthDays(month).map((day,index)=><span className={day?'':'empty'} key={`${month.key}-${index}`}>{day||''}</span>)}</div></article>}
