import Link from 'next/link';
import { Header, Footer } from '../../components';
import { operator, type InfoContent } from '../content';
import '../info.css';

export default function InfoPage({ page, children }: { page: InfoContent; children?: React.ReactNode }) {
  return <><Header /><main className="simple info-page" id="main-content">
    <nav className="info-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true"> / </span><span aria-current="page">{page.title}</span></nav>
    <header className="info-heading"><p className="eyebrow">32+ NIGHT RENTALS</p><h1>{page.title}</h1><p className="lead">{page.description}</p></header>
    {page.sections.length > 1 && <nav className="info-contents" aria-label="On this page"><h2>On this page</h2><ul>{page.sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ul></nav>}
    <article className="info-copy">{page.sections.map(section => <section id={section.id} key={section.id} aria-labelledby={`${section.id}-heading`}><h2 id={`${section.id}-heading`}>{section.title}</h2>{section.paragraphs?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{section.items && (section.ordered ? <ol>{section.items.map(item => <li key={item}>{item}</li>)}</ol> : <ul>{section.items.map(item => <li key={item}>{item}</li>)}</ul>)}{section.faq?.map(faq => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</section>)}{children}</article>
    {page.legal && <aside className="info-operator"><h2>Operator details</h2><address><strong>{operator.name}</strong><br />CIF: {operator.taxId}<br />{operator.address}<br /><a href={`mailto:${operator.email}`}>{operator.email}</a></address><Link href="/info/contact">Contact the operator</Link><nav aria-label="Related policies"><Link href="/info/terms">Terms</Link><Link href="/info/privacy">Privacy</Link><Link href="/info/cookies">Cookies</Link><Link href="/info/legal-notice">Legal notice</Link></nav></aside>}
    <aside className="info-support"><h2>Need a little more help?</h2><p>Find answers in the Help Centre or tell us about your enquiry.</p><div><Link className="pill" href="/info/help">Help Centre</Link><Link className="pill" href="/info/contact">Contact support →</Link></div></aside>
  </main><Footer /></>;
}
