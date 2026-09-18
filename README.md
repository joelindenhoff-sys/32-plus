# 32+ — functional V4 prototype

A compact Airbnb-style seasonal rental marketplace prototype for 32+.

## Working flows
- Homepage search: destination + move-in + move-out → `/homes`
- Destination filters
- Property cards → individual property pages
- Property enquiry form with temporary-stay purpose and truth confirmation
- Enquiries stored in browser localStorage
- Tenant/owner sign-in demo
- Owner dashboard demo
- Owner can add a local listing and see enquiries submitted in the same browser
- Responsive mobile layout

## Important
This version is a functional prototype using browser localStorage. It is **not yet a production multi-user system**. For production, replace localStorage with Supabase/Postgres, real authentication, server-side enquiry storage, email notifications and payment/contract services.

## Run
`npm install`
`npm run dev`

## Project root

Deploy this repository from its root directory. The `app/` and `lib/` folders are the active prototype. The nested `32-plus-v2/` folders are legacy snapshots and are excluded from the root TypeScript build; do not select them as the Vercel root directory.

## Deploy
Deploy the repository root with Vercel. Verify the Vercel project's **Root Directory** is `.` before redeploying.
