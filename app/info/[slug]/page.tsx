import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import InfoPage from '../_components/InfoPage';
import ContactForm from '../_components/ContactForm';
import FeeExample from '../_components/FeeExample';
import { infoPages, operator } from '../content';

type Props = { params: Promise<{ slug: string }> };
function getPage(slug: string) {
  if (!Object.hasOwn(infoPages, slug)) notFound();
  return infoPages[slug];
}
export function generateStaticParams() { return Object.keys(infoPages).map(slug => ({ slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = getPage((await params).slug);
  return { title: `${page.title} | 32+ Night Rentals`, description: page.description };
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  const page = getPage(slug);
  return <InfoPage page={page}>{slug === 'contact' && <><section aria-labelledby="contact-email-heading"><h2 id="contact-email-heading">Email support</h2><p>For tenant, owner and privacy enquiries, email <a href={`mailto:${operator.email}`}>{operator.email}</a>.</p></section><ContactForm /></>}{slug === 'tenant-fees' && <FeeExample audience="tenant" />}{slug === 'privacy' && <p>Learn more about your rights from the <a href="https://www.aepd.es/en/rights-and-duties/know-your-rights">Spanish Data Protection Agency</a>.</p>}</InfoPage>;
}
