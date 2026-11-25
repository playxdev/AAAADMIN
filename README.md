# AAAADMIN — Axis Access Auto Admin Panel v2.0.0

Administrative dashboard for the AAA intelligent residential access management system.

v2 is a rewrite on the PlayDevX App Template Standard v1.1.0 default stack:
**React + shadcn/ui + TanStack (Router, Query, Table) + react-hook-form + zod**,
started from [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin)
(MIT, pinned at commit `a156d9b`, see `LICENSE-shadcn-admin`).

## Features

- **Admin login** against `POST /api/v1/auth/admin/login`, with a route guard on every page and a safe post-login redirect
- **Dashboard**: project, house, user and vehicle counts, plus access logs from the last 7 days
- **Six CRUD pages** (Projects, Houses, Users, Vehicles, Devices, Blacklist), all driven by one config: `src/features/resources/config.ts`
- **Access Logs**: plate and date-range filters run on the server; the `To` date includes the whole day
- **Data tables**: search, sorting, column visibility and pagination
- **Accessible dialogs, selects and menus** (Radix)
- **Light/Dark/System theme**: AAA Modern Minimal Blue tokens in `src/styles/theme.css`
- **Fonts**: Google Sans with a Noto Sans Thai fallback
- **System status** in the header, from `/api/v1/health`

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
│   ├── layout/              # Sidebar, AppHeader, nav (sidebar-data.ts)
│   └── ui/                  # shadcn/ui components
├── features/
│   ├── access-logs/         # Filters + columns (data.tsx) + page
│   ├── auth/sign-in/        # Admin login form
│   ├── dashboard/
│   ├── errors/
│   └── resources/           # config.ts (6 CRUD resources) + generic page/dialog
├── lib/                     # api.ts, types.ts, cookies.ts, utils.ts
├── routes/                  # TanStack file routes (_authenticated/* guarded)
├── stores/auth-store.ts     # Session (token + admin), JWT expiry check
└── styles/                  # Tailwind + theme tokens
```

To add a CRUD page, add an entry to `resources` in `src/features/resources/config.ts`. Then add a route file and a sidebar entry.

## Development

```bash
pnpm install
pnpm dev          # Vite on :5173, proxies /api to http://localhost:8089
pnpm build        # tsc -b && vite build -> dist/
pnpm lint && pnpm knip
pnpm test         # needs: pnpm exec playwright install chromium
```

## Deployment (Cloudflare Pages / Workers Static Assets)

- Build command: `pnpm build`. Output directory: `dist`.
- Pages serves `index.html` for unknown paths (SPA fallback).
- `/api/*` must reach the backend on the **same origin**. Use a route or a Pages Function proxy, so CORS is not needed.

## Security notes

- Every permission check must happen in the backend API. The route guard only hides UI.
- The session (Bearer JWT + admin profile) is stored in a `SameSite=Strict` cookie, with `Secure` on HTTPS. JavaScript can read this cookie, so it can be stolen through XSS. Move to an HttpOnly cookie issued by the API once the backend supports it (App Template Standard §2).

## Changelog

### v2.0.0
- Rewrite on shadcn/ui + TanStack (from shadcn-admin `a156d9b`); the demo pages and Clerk were removed
- Generic config-driven CRUD pages
- Access-log `To` date now includes the whole selected day (v1 excluded it)
- Session moved from `localStorage` to a `SameSite=Strict` cookie with JWT expiry checks
- Post-login redirect is limited to same-app paths
- Tests for the auth store, login form, payload/validation helpers and log filters

### v1.2.0 / v1.1.5
- Vanilla TypeScript + Tailwind v4 version (see git history)

## License

Proprietary. All rights reserved. Third-party code: see `LICENSE-shadcn-admin` (MIT).
