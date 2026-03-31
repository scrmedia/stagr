# AGENTS.md — Stagr

Read this file before making any changes. This is the persistent project context for the Stagr web application.

---

## What Stagr is

Stagr is a festival clashfinder and live day companion web app. Users import a festival lineup via AI parsing (text paste or screenshot upload), select the bands they want to see, and track their personal schedule in real time on the day of the festival.

The app has two distinct modes:

- **Planning mode** — pre-festival. Browse the full grid, flag bands, resolve clashes, build a personal lineup.
- **Live day mode** — at the festival. See what's playing now, what's next, countdown timers, all stages at a glance.

The AI parse flow is the core differentiator. It must work excellently.

---

## Repo

- **GitHub:** github.com/scrmedia/stagr
- **Main branch:** main
- **Working branch convention:** codex/[feature-name]

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript — strict mode, no `any` |
| Styling | Tailwind CSS — utility classes only, no custom CSS unless unavoidable |
| UI components | shadcn/ui — install components as needed |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| Auth | Supabase Auth — magic link email + Google OAuth |
| AI parse | Anthropic Claude API (claude-sonnet-4-20250514) |
| Image storage | Supabase Storage (lineup-images bucket) |
| Hosting | Vercel |
| Package manager | npm |

---

## Project structure

```
/app                        # Next.js App Router
  /layout.tsx               # Root layout — fonts, providers, metadata
  /page.tsx                 # Landing / marketing page
  /(auth)
    /login/page.tsx         # Magic link + Google sign in
    /callback/page.tsx      # Auth callback handler
  /(app)                    # Authenticated app shell
    /layout.tsx             # App layout — bottom nav, auth guard
    /home/page.tsx          # Live day home screen
    /grid/page.tsx          # Full festival grid
    /lineup/page.tsx        # My personal lineup
    /festival
      /new/page.tsx         # Create festival + AI parse flow
      /[id]/page.tsx        # Festival detail / settings
/components
  /ui                       # shadcn/ui primitives
  /festival                 # Festival-specific components
  /grid                     # Grid view components
  /lineup                   # Lineup view components
  /live                     # Live day components
  /parse                    # AI parse flow components
/lib
  /supabase
    /client.ts              # Browser Supabase client
    /server.ts              # Server Supabase client
    /middleware.ts          # Auth middleware
  /claude.ts                # Claude API wrapper
  /utils.ts                 # Shared utilities
/types
  /index.ts                 # All shared TypeScript types
/hooks                      # Custom React hooks
/styles
  /globals.css              # Tailwind base + minimal globals
```

---

## Database schema

### users
Managed by Supabase Auth. Extended via public.profiles.

### profiles
```sql
id          uuid references auth.users(id) primary key
email       text
created_at  timestamptz default now()
is_premium  boolean default false
```

### festivals
```sql
id          uuid primary key default gen_random_uuid()
user_id     uuid references auth.users(id)
name        text not null
location    text
start_date  date not null
end_date    date not null
is_archived boolean default false
created_at  timestamptz default now()
```

### stages
```sql
id          uuid primary key default gen_random_uuid()
festival_id uuid references festivals(id) on delete cascade
name        text not null
display_order int default 0
```

### slots
```sql
id          uuid primary key default gen_random_uuid()
stage_id    uuid references stages(id) on delete cascade
festival_id uuid references festivals(id) on delete cascade
band_name   text not null
day         date not null
start_time  time not null
end_time    time not null
is_flagged  boolean default false  -- user's personal flag (per user — see user_slots)
```

### user_slots
Junction table — one row per user per flagged slot.
```sql
id          uuid primary key default gen_random_uuid()
user_id     uuid references auth.users(id)
slot_id     uuid references slots(id) on delete cascade
festival_id uuid references festivals(id)
created_at  timestamptz default now()
unique(user_id, slot_id)
```

---

## Key TypeScript types

```typescript
// types/index.ts

export type Festival = {
  id: string
  user_id: string
  name: string
  location: string | null
  start_date: string
  end_date: string
  is_archived: boolean
  created_at: string
}

export type Stage = {
  id: string
  festival_id: string
  name: string
  display_order: number
}

export type Slot = {
  id: string
  stage_id: string
  festival_id: string
  band_name: string
  day: string        // ISO date string YYYY-MM-DD
  start_time: string // HH:MM
  end_time: string   // HH:MM
}

export type UserSlot = {
  id: string
  user_id: string
  slot_id: string
  festival_id: string
}

// Composed type used throughout the UI
export type SlotWithStage = Slot & {
  stage: Stage
  is_flagged: boolean
}

// Output from Claude parse
export type ParsedLineup = {
  stages: {
    name: string
    slots: {
      band_name: string
      day: string | null      // null if AI couldn't determine
      start_time: string
      end_time: string
      confidence: 'high' | 'low'  // low = needs user review
    }[]
  }[]
}
```

---

## AI parse — how it works

The parse flow is the most important feature. Handle it carefully.

### Text parse
1. User pastes raw text into the parse input
2. POST to `/api/parse/text` with `{ text: string, festival_id: string }`
3. Server sends text to Claude API with the structured parse prompt (see below)
4. Claude returns `ParsedLineup` JSON
5. Response is returned to client for the confirm screen

### Image parse (premium)
1. User selects image from device
2. Image is uploaded to Supabase Storage (`lineup-images` bucket) via signed URL
3. POST to `/api/parse/image` with `{ image_url: string, festival_id: string }`
4. Server fetches image, converts to base64, sends to Claude API with vision
5. Claude returns `ParsedLineup` JSON
6. Response is returned to client for the confirm screen

### Claude parse prompt

```
You are parsing a music festival lineup. Extract all band/artist names, their stage, and their set times.

Return ONLY valid JSON matching this exact structure — no preamble, no explanation:
{
  "stages": [
    {
      "name": "Stage name",
      "slots": [
        {
          "band_name": "Artist name",
          "day": "YYYY-MM-DD or null if unknown",
          "start_time": "HH:MM (24hr)",
          "end_time": "HH:MM (24hr)",
          "confidence": "high or low"
        }
      ]
    }
  ]
}

Rules:
- Use 24hr time format
- If you cannot determine a time with confidence, mark confidence as "low"
- If day cannot be determined, set day to null
- If end time is not given, estimate based on typical set length (45min unless headliner, then 90min)
- Include every act you can identify
- Stage names should match exactly as written in the source
```

### Error handling
- If Claude returns invalid JSON → return `{ error: 'parse_failed', message: '...' }`
- If no stages found → return `{ error: 'no_content', message: '...' }`
- Client shows friendly error and offers to switch input method

---

## Component conventions

- All components are functional, TypeScript, no class components
- Props interfaces defined above the component, named `[ComponentName]Props`
- No default exports from component files except page.tsx files
- Use `'use client'` only when necessary — prefer server components
- Fetching: use server components for initial data, SWR or React Query for client-side updates
- Forms: React Hook Form + Zod for validation
- No `any` types — use `unknown` and narrow, or define proper types

---

## Styling conventions

- Tailwind utility classes only
- No inline styles
- Dark theme is the default — festival poster aesthetic, high contrast
- Accent colour: a single vibrant colour TBD (placeholder: use `indigo-500`)
- Text must be readable in bright sunlight — high contrast always
- Mobile-first — design for 390px width upward
- Touch targets minimum 44x44px
- Spacing scale: use Tailwind's default scale, multiples of 4

---

## Supabase conventions

- Always use the server client for server components and API routes
- Always use the browser client for client components
- All DB operations wrapped in try/catch — never let Supabase errors bubble unhandled
- RLS enabled on all tables from the start — no UNRESTRICTED tables
- All user_id foreign keys reference auth.users(id) not public.profiles(id)
- Use `.from('table').select('*, related_table(*)')` for joined queries

---

## RLS policies (apply from day one)

```sql
-- festivals: users can only see their own
create policy "Users see own festivals"
on festivals for all
using (auth.uid() = user_id);

-- stages: users can see stages for their festivals
create policy "Users see own stages"
on stages for all
using (
  exists (
    select 1 from festivals
    where festivals.id = stages.festival_id
    and festivals.user_id = auth.uid()
  )
);

-- slots: same as stages
create policy "Users see own slots"
on slots for all
using (
  exists (
    select 1 from festivals
    where festivals.id = slots.festival_id
    and festivals.user_id = auth.uid()
  )
);

-- user_slots: users see only their own flags
create policy "Users see own flags"
on user_slots for all
using (auth.uid() = user_id);
```

---

## API routes

```
POST /api/parse/text        # Parse lineup from pasted text
POST /api/parse/image       # Parse lineup from image URL (premium)
POST /api/festivals         # Create festival
PATCH /api/festivals/[id]   # Update festival
DELETE /api/festivals/[id]  # Archive festival
POST /api/slots/flag        # Flag/unflag a slot for the current user
GET /api/live/[festival_id] # Get live day data (now/next/all stages)
```

---

## Features — V1 scope

### In scope
- Auth (magic link + Google)
- Festival creation
- AI parse — text paste (all users)
- AI parse — image upload (premium users only)
- Full festival grid (vertical scroll, stages as columns)
- Single-tap to flag bands
- Double-tap for band detail sheet
- Clash detection and warning badges
- My Lineup — personal chronological view
- Gap indicators between sets
- Live home screen — NOW / NEXT UP / all stages strip
- Countdown timers (client-side, real-time)
- Push notifications for upcoming sets (web push, Android-first)
- Multi-day festival support
- Freemium gate — image parse + unlimited festivals behind premium

### Out of scope for V1
- Friends / group lineups
- Band biographies or music previews
- Spotify integration
- Native iOS app (phase 2)
- Live Activity / Dynamic Island (phase 2, native only)
- Sharing lineup as image
- Re-parse / diff on lineup changes
- Festival discovery / database

---

## Freemium rules

- Free tier: 1 active festival, text parse only
- Premium tier: unlimited festivals, image parse, future features
- Premium check: `profiles.is_premium === true`
- Gate premium features server-side in API routes — never trust client-side only
- Stripe integration: post-V1

---

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server-side only, never expose to client
ANTHROPIC_API_KEY=              # server-side only, never expose to client
```

---

## Critical rules — always follow

1. **Read this file before every session**
2. **App must build successfully after every change** — run `npm run build` to verify
3. **Never expose ANTHROPIC_API_KEY or SUPABASE_SERVICE_ROLE_KEY to the client** — API calls to Claude and privileged Supabase operations happen server-side only
4. **RLS on every table from day one** — never create an unrestricted table
5. **Mobile-first always** — test at 390px width, touch targets minimum 44px
6. **TypeScript strict** — no `any`, no `@ts-ignore` without a comment explaining why
7. **Never modify the parse prompt without explicit instruction** — it is carefully tuned
8. **All Supabase operations non-blocking on the client** — wrap in try/catch, never let errors crash the UI
9. **Offline resilience** — gracefully handle no network. Cache aggressively with service worker
10. **The confirm screen is sacred** — never auto-save parsed lineup without user confirmation
