# AAAADMIN — Axis Access Auto Admin Panel v2.1.0

Administrative dashboard for the AAA intelligent residential access management system,
talking to **AAAAPI** `/api/v1/admin/*` (Cloudflare Worker).

v2 is built on the PlayDevX App Template Standard default stack:
**React + shadcn/ui + TanStack (Router, Query, Table) + react-hook-form + zod**,
started from [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin)
(MIT, pinned at commit `a156d9b`, see `LICENSE-shadcn-admin`).

## Features

- **Admin login**: `POST /api/v1/admin/login` returns an admin JWT valid for 1 hour. A route guard protects every page, and the post-login redirect only goes to same-app paths.
- **Dashboard** shows active houses, active residents, overdue houses and valid visitors.
- **Houses**:
  - house number and `house_code`, the Guest Code prefix (1–6 digits, validated like the API)
  - `payment_status`, editable on update only
  - enable / disable
- **Residents**:
  - create, edit, disable and re-activate
  - **Access** dialog: vehicles (ANPR; plates are normalized by the API), RFID / QR / PIN credentials (a PIN must be 4–8 digits, with optional valid-until), and a LINE link code shown once
- **Visitors**:
  - issue a visitor pass for a house that has a `house_code`, or for the common area
  - set a duration and optionally issue a Guest Code, which is **shown once** and must be closed with Done
  - revoke a pass, and filter the list to valid passes only
- **Data tables** support search, sorting, column visibility and pagination. Dialogs, selects and menus are accessible (Radix).
- **Light/Dark/System theme** uses the AAA Modern Minimal Blue tokens. Fonts are Google Sans with a Noto Sans Thai fallback.

## Tech Stack

| Component | Technology |
|---|---|
| Language | TypeScript |
| UI | React 19, shadcn/ui (Radix), Tailwind CSS v4 |
| Routing | TanStack Router (file-based, `src/routes`) |
| Data | TanStack Query + axios (`src/lib/api.ts`) |
| Tables | TanStack Table (`src/components/data-table`) |
| Forms | react-hook-form + zod |
| Bundler | Vite 8 |
| Tests | Vitest browser mode (Playwright Chromium) |

## Structure

```
src/
├── components/
│   ├── data-table/          # Generic DataTable + toolbar/pagination
│   ├── layout/              # Sidebar, Page shell, nav (sidebar-data.ts)
│   ├── form-fields.tsx      # TextField / SelectField (react-hook-form)
│   └── ui/                  # shadcn/ui components
├── features/
│   ├── auth/sign-in/        # Admin login form
│   ├── dashboard/
│   ├── errors/
│   ├── houses/              # data.ts (query, schema, payload) + page
│   ├── residents/           # data.ts + page + resident / access dialogs
│   └── visitors/            # data.ts + page + Guest Code dialog
├── lib/                     # api.ts, types.ts, cookies.ts, utils.ts
├── routes/                  # TanStack file routes (_authenticated/* guarded)
├── stores/auth-store.ts     # Session (token + admin), JWT expiry check
└── styles/                  # Tailwind + theme tokens
```

Each feature keeps API calls, zod schemas and payload mapping in `data.ts` (unit-tested in `src/features/payloads.test.ts`) and UI in `index.tsx`.

## Development

```bash
pnpm install
pnpm dev          # Vite on :5173, proxies /api to http://localhost:8787 (run `pnpm dev` in ../AAAAPI first)
pnpm build        # tsc -b && vite build -> dist/
pnpm lint && pnpm knip
pnpm test         # needs: pnpm exec playwright install chromium
```

## Deployment (Cloudflare Pages)

- Build command: `pnpm build`. Output directory: `dist`. Pages serves `index.html` for unknown paths (SPA fallback).
- `.env.production` sets `VITE_API_BASE` to the AAA API origin (`https://aaa-api.cookievirus.workers.dev`).
- The API must allow the Pages origin in `ALLOWED_ORIGINS` (currently `https://aaa-admin.pages.dev`). Preview URLs are not allowed.

## Security notes

- Every permission check must happen in the backend API. The route guard only hides UI.
- The session (Bearer JWT + admin profile) is stored in a `SameSite=Strict` cookie, with `Secure` on HTTPS. JavaScript can read this cookie, so it can be stolen through XSS. Move to an HttpOnly cookie issued by the API once the backend supports it (App Template Standard §2).

## Changelog

### v2.1.0
- Port v2 (shadcn/ui + TanStack) to the AAAAPI admin API from v1.3.0 (`/api/v1/admin/*`, `{ error, field }` errors, `access_token` login)
- Pages: Dashboard, Houses, Residents (with an Access dialog), Visitors (with a Guest Code dialog)
- Remove the Projects, Vehicles, Devices, Blacklist and Access Logs pages (they are not in the admin API)
- Dialog forms reset each time they open (fixes stale values on a second create)

### v2.0.0
- Rewrite on shadcn/ui + TanStack against the pre-1.3.0 API (superseded by v2.1.0)

### v1.3.0
- Vanilla TypeScript version wired to `/api/v1/admin/*` (see git history)

## License

Proprietary. All rights reserved. Third-party code: see `LICENSE-shadcn-admin` (MIT).
