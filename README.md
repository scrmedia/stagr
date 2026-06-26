# Stagr

Festival clashfinder and live-day companion. Import a lineup with AI, flag the acts
you want, resolve clashes, and track your day live with countdowns.

Built with Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase
(Auth + Postgres + Storage) · Anthropic Claude for AI lineup parsing.

See [`AGENTS.md`](./AGENTS.md) for the full product and engineering spec.

## Features

- **AI lineup import** — paste text (all users) or upload a screenshot (premium); Claude
  extracts stages, acts, and set times into a structured lineup you confirm before saving.
- **Auth** — Supabase magic-link email + Google OAuth.
- **Grid** — full festival grid, stages as columns, single-tap to flag, double-tap for
  details, clash badges, multi-day support.
- **My Lineup** — your flagged acts in chronological order with gap indicators and clash warnings.
- **Live day** — NOW / NEXT UP / all-stages strip with real-time countdowns, plus a preview
  scrubber so you can demo the live experience any day, and opt-in set reminders.
- **PWA** — installable, offline-capable app shell via service worker.
- **Freemium** — free tier is one active festival + text parse; image parse and unlimited
  festivals are gated server-side behind `profiles.is_premium`.

## Getting started

### 1. Install

```bash
npm install
```

### 2. Environment

Create `.env.local` (already gitignored):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-or-publishable-key>
ANTHROPIC_API_KEY=<server-side-only-claude-key>
```

`ANTHROPIC_API_KEY` is used only in server-side API routes and is never exposed to the client.

### 3. Database

The Supabase project already has the schema, RLS policies, the `lineup-images` storage
bucket, and the `handle_new_user` trigger (auto-creates a profile on signup). The schema and
policies are documented in `AGENTS.md`.

### 4. Run

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
npm run lint
```

## Auth provider setup

- **Magic link** works out of the box with Supabase's default email.
- **Google OAuth** requires enabling the Google provider in the Supabase dashboard
  (Authentication → Providers) with a Google client ID/secret. The redirect URL is
  `<site>/auth/callback`.

## Deploying

Deploy to Vercel and set the three environment variables above in the project settings.

> **Note on sandboxed/remote dev environments:** if you run this app inside a network-restricted
> environment (e.g. Claude Code on the web), outbound requests to `*.supabase.co` must be added
> to the environment's egress allowlist, otherwise auth and data calls return
> `Host not in allowlist`. Vercel and normal local machines are unaffected.

## Project layout

```
app/                  Next.js App Router (routes, API routes, auth callback)
components/           UI by domain: app shell, auth, grid, lineup, live, parse, festival, shared
lib/                  Supabase clients, Claude wrapper, time/clash/live helpers, data layer
hooks/                Client hooks (live clock, reminders)
types/                Shared TypeScript types
public/               Icon + service worker
```
