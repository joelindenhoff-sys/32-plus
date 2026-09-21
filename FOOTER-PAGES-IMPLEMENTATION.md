# Footer pages implementation

## Scope

Replaced the existing `/info/[slug]` placeholders without adding duplicate routes:
`about`, `how-it-works`, `contact`, `tenant-fees`, `rental-requirements`, `payouts`,
`help`, `terms`, `privacy`, `cookies`, and `legal-notice`.

A shared InfoPage provides the existing header/footer, breadcrumbs, readable content
width, section navigation, semantic headings, responsive layout and support links.
Each page has a unique title and description. Help uses native keyboard-accessible
`details` / `summary` accordions. `/owners` now has metadata, a live fee example,
service scope, and a sticky-header-safe `owner-fees` anchor.

## Confirmed facts and assumptions

- Active app is the top-level `32-plus/app`; the nested `32-plus-v2` projects are excluded by its TypeScript configuration.
- Live `get_current_public_pricing()` returned tenant 5%, owner 5%, EUR on 21 September 2026. Both fee components load this RPC; neither hard-codes those rates. Owner-specific policies can override standard pricing and requests snapshot their quotes.
- Fees apply to accommodation only. Example: EUR 1,000 rent, EUR 50 tenant fee, EUR 1,050 tenant rent-plus-fee total; EUR 50 owner fee, EUR 950 owner net. Deposit and separately disclosed charges are excluded.
- The existing unified account supports both renting and listing; `/login?mode=owner` is preserved.
- Supabase Auth, database and property-image storage are in use. No contact backend existed.
- Stripe is installed and database columns anticipate payments, but there is no checkout, webhook, payout execution or verification onboarding in the active app; Supabase has no Edge Functions. Approval records a provisional payout date one day after move-in. It does not transfer funds.
- Direct messaging, automated cancellation/refund calculations and deposit processing are not implemented.
- Google Fonts, Google Maps embeds and Unsplash images are present. Supabase session and anonymous saved-home data use local storage. No analytics SDK was found.

## Contact inbox

The form and admin inbox are implemented. The prepared migration is
`supabase/migrations/20260921100736_contact_inbox.sql`.

**Not applied:** automatic approval review blocked the production schema change
pending explicit approval of this personal-data collection backend. Until applied,
contact submission fails visibly; it never reports that an enquiry was saved.

The migration grants public insert access to only the five contact fields, validates
lengths/email/user type in the database, limits each email to three enquiries per
hour and the inbox to 100 per hour, and permits only protected admin profiles to
read messages. The rate-limit trigger is private and is not an API RPC. No public
read-back, updates or deletes are granted. The admin page has 25-message pagination.
This is an inbox, not email delivery; staff must check `/admin`. Email ownership
is not verified. Additional anti-abuse controls may be needed for production traffic.
No live test enquiry was sent.

## Business/legal confirmation needed

Source TODOs are in `app/info/content.ts` and the migration. Confirm:

- Corporate register details. The user selected support@32-plus.com for support and privacy enquiries and will configure the mailbox manually.
- Final marketplace and rental terms, contract formation and verification scope.
- Fee tax treatment and detailed cancellation, refund, deposit and dispute rules.
- Payment provider, owner onboarding, handling of funds and final payout conditions.
- Hosting provider, locations, processor agreements and international-transfer safeguards.
- Purpose-specific legal bases, data retention/deletion procedures and support-inbox access/response procedures.
- Deployment cookie inventory and Google Maps consent requirements/controls. The current app has no consent panel; the copy does not claim that embedded tracking is blocked.

Legal copy uses neutral wording for unknown operational details. It is not represented
as final legal approval. Rights references were checked against the AEPD:
https://www.aepd.es/en/rights-and-duties/know-your-rights
Operator-disclosure reference: https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758

## Verification

- `npm run typecheck`: passed.
- `npm test`: 5 tests passed (existing pricing and new contact validation).
- `npm run build`: passed; all 11 info paths prerendered.
- `git diff --check`: passed.
- No lint script or ESLint configuration is available in this project.
- Browser fetch checked all 15 unique footer destinations including the logo home link; all returned HTTP 200. Unknown info slug returned 404. The footer itself has 15 navigation links, with How It Works repeated.
- Owner anchor verified at approximately 110px below viewport top against a 78px sticky header.
- Live browser pricing displayed tenant 5%, EUR 50 fee, EUR 1,050 total.
- Desktop About and 390px mobile fee layouts visually inspected; no horizontal overflow in checked mobile pages.
- Help Centre keyboard interaction passed: Enter expanded an FAQ and exposed its answer.
- Contact browser validation passed: invalid email and whitespace-only name are rejected. Successful submission, transport-error and loading-state browser checks could not be completed because the agent-browser session stalled; these states are implemented but not claimed as verified.
- Database migration, RLS and real contact persistence remain unverified pending approval to apply the backend.
