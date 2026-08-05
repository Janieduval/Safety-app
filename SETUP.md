# Daily Task Safety Awareness — setup guide

> **No local installs or admin rights on your machine?** See
> [`DEPLOY_NO_INSTALL.md`](./DEPLOY_NO_INSTALL.md) instead — it deploys this
> to a live URL using only GitHub and Vercel in a browser.

## Stack

Next.js 14 (App Router, TypeScript) · Tailwind CSS v4 · Prisma ORM (Postgres)
· react-signature-canvas · @react-pdf/renderer · Vitest.

## 1. Prerequisites

- Node.js 20+
- npm
- A Postgres database (local Postgres, or a free one from Neon/Supabase/Vercel — the schema defaults to Postgres so it works the same way locally and once deployed)

## 2. Install

```bash
npm install
```

## 3. Generate the Prisma client and set up the database

> **Note:** this project was scaffolded in a sandboxed environment whose network
> allowlist blocks `binaries.prisma.sh`, so the Prisma client could **not** be
> generated there. Run these commands on a machine with normal internet access.

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

This seeds:
- The **Blind Creek Solar Farm** project (851 Tarago Road, Lake George NSW 2581 — ACLE Services Pty Ltd)
- All teams, SWMS, PPE, and permit options listed in the spec
- 6 sample active workers and 2 sample supervisors (replace these via the admin dashboard once real names are available)

## 4. Create an administrator account

```bash
npx tsx prisma/create-admin.ts you@example.com "a-strong-password"
```

## 5. Environment variables

`.env.example` is included as a template — copy it to `.env` and fill in real values:

```
DATABASE_URL="postgresql://..."        # your Postgres connection string
ADMIN_SESSION_SECRET="change-me"        # MUST be a long random value in production
```

Generate a strong secret with `openssl rand -hex 32`.

## 6. Run locally

```bash
npm run dev
```

- Worker entry point (what the QR code should point to): `http://localhost:3000/blind-creek-solar-farm`
- Admin login: `http://localhost:3000/admin/login`
- Supervisor review link is generated per-assessment; from the admin dashboard, open an
  assessment awaiting review and use `/supervisor/review/[assessmentId]`.

## 7. Run tests

```bash
npm run test
```

Covers the safety-critical submission rules in `lib/validation.ts` — stop-work resolution,
hazard-card completeness, High/Extreme risk handling, permit confirmation, declarations, and
primary-signature requirements.

## 8. Generate a project QR code

Point any QR generator at `https://your-domain.com/<project-qrSlug>` — e.g.
`https://your-domain.com/blind-creek-solar-farm`. Each project's `qrSlug` is set in the
`Project` table (admin-manageable in a future stage; for now, edit via `prisma studio` or
add a new project through `prisma/seed.ts`-style scripting).

## 9. Deployment

The app is a standard Next.js app and deploys to Vercel, Netlify, Fly.io, Render, or any
Node host:

1. Provision a Postgres database (Neon, Supabase, Vercel Postgres, RDS, etc.) and set `DATABASE_URL`.
2. Run `npx prisma db push` (or set up proper migrations with `prisma migrate`) against production as part of your deploy step.
3. Set `ADMIN_SESSION_SECRET` to a strong, unique value in the hosting provider's secrets manager.
4. Set `NODE_ENV=production` (most platforms do this automatically) — this enables the
   `secure` flag on the admin session cookie.

If you don't want to do any of this from a terminal at all, see `DEPLOY_NO_INSTALL.md` —
it covers the same deployment browser-only, plus a one-time `/api/bootstrap` URL that
seeds the database and creates your first admin login without needing `prisma db seed`
or `prisma/create-admin.ts` run locally.

## What's built (v1 scaffold)

- Full data model (`prisma/schema.prisma`) with an append-only audit log
- Server-side validation of every safety-critical rule in the spec (`lib/validation.ts`),
  re-checked on submit — never trusted from client state alone
- QR-landing page → multi-step worker assessment wizard with autosave, stop-work logic,
  hazard cards, SWMS/PPE/permit selection, and signature capture
- Team sign-on flow (unlimited signatories, no double sign-on)
- Mandatory supervisor review with checklist, comments, approve/return-for-changes
- Linked reassessment flow ("Conditions have changed — reassess") that never overwrites
  the original approved record
- Printable PDF export of the full assessment record
- Basic admin dashboard (status counts, filters, flags for stop-work/high-risk/new-hazard/
  unverified-permit assessments) and a read-only full assessment record view
- HMAC-signed admin session cookie (not a bypassable presence check)
- Automated tests for the validation engine

## What's intentionally deferred to the next stage

- Full admin CRUD screens for projects, workers, supervisors, SWMS/PPE/permit option lists,
  and archiving (currently these are managed by editing seed data or via `prisma studio`)
- Supervisor PIN verification (the schema and UI are structured so this slots in without
  changing the data model, per the spec's "design so it can be added later")
- Photo/document upload for change entries, hazard cards, and permits (fields exist in the
  schema; the upload UI and storage backend — e.g. S3-compatible bucket — still need wiring)
- File-type/size restriction and sanitization for those uploads once implemented
- More granular per-worker or per-supervisor authentication beyond the current no-login model
- Search/filter refinements on the admin dashboard (currently status + project only)
- PDF hazard-card/signature page-break tuning under real content volume (react-pdf's `wrap`
  props are set on cards and signature blocks, but should be checked against a full day's
  worth of hazards before relying on it for print handouts)
