# AAAADMIN — Axis Access Auto Admin Panel v1.3.0

Administrative dashboard for the AAA intelligent residential access management system. Built with **TypeScript**, **Vite**, and **Tailwind CSS v4**.

## Features

- **Admin Login** — `POST /api/v1/admin/login` (PBKDF2 on the API side) → admin JWT, 1 hour
- **Dark/Light Mode** — CSS variables + `data-theme` + View Transitions API circular ripple reveal
- **Collapsible Sidebar** — hamburger toggle with icon-rail navigation, `localStorage` persistence
- **Houses** — house number, `house_code`, `payment_status`, enable / disable
- **Residents** — resident CRUD + Access modal: plates (ANPR), RFID / QR / PIN, LINE link code
- **Visitors** — issue visitor / Guest Code (shown once) for a house or common area, revoke
- **Dashboard** — active houses, residents, overdue houses, valid visitors
- **DataTable Pagination** — client-side pagination with summary footer on all tables (15/page)
- **Modal Dialogs** — styled confirm/alert modals replacing browser popups
- **SVG Progress Spinner** — rotating ring indicator on form submits and loading states
- **Toast Notifications** — centered top slide-down alerts
- **Google Sans Font** — Thai + Latin character support

## Tech Stack

| Component      | Technology                        |
|--------------- |---------------------------------- |
| Language       | TypeScript                        |
| Bundler        | Vite v8                           |
| Styling        | Tailwind CSS v4 + CSS variables   |
| Theme System   | `data-theme` + View Transitions API |
| Font           | Google Sans (Thai + Latin)        |
| Routing        | Hash-based client-side router     |

## Architecture

```
src/
├── components/           # Reusable shared UI components
│   ├── layout.ts        # Main layout composition + init wiring
│   ├── sidebar.ts       # Left navigation (collapsible)
│   ├── header.ts        # Top bar (title, hamburger, theme toggle)
│   ├── footer.ts        # Bottom bar (copyright, version)
│   ├── modal.ts         # Confirm/alert modal dialogs
│   └── table-footer.ts  # Pagination + data summary footer
├── pages/               # Page-specific content only
│   ├── login.ts         # Admin login form
│   ├── dashboard.ts     # Stats grid
│   ├── houses.ts        # Houses: house_code, payment_status, enable/disable
│   ├── users.ts         # Residents + vehicles / credentials / LINE link code (route /users)
│   └── visitors.ts      # Visitors + Guest Code
├── router.ts            # Route registry, navigation, orchestration
├── theme.ts             # Dark/light toggle + View Transitions API
├── auth.ts              # JWT + admin login functions
├── api.ts               # HTTP client for /api/v1/admin/* with Bearer auth
├── types.ts             # TypeScript interfaces
├── toast.ts             # Toast notification helpers
├── utils.ts             # Shared utilities (escapeHtml, getPageTitle)
├── style.css            # Tailwind imports + CSS variables + theme
└── main.ts              # Entry point, route registration, theme init
```

### Component Responsibility

| Component       | Renders                    | State Owned       | Events Handled     |
|---------------- |--------------------------- |------------------ |------------------- |
| `sidebar`       | Nav links, user info       | Collapse state    | (layout wires)     |
| `header`        | Page title, buttons        | —                 | (layout wires)     |
| `footer`        | Copyright, version         | —                 | —                  |
| `layout`        | All above + `<main>`       | —                 | Theme, sidebar     |
| `modal`         | Confirm/alert dialogs      | Promise resolve   | OK/Cancel/overlay  |
| `table-footer`  | Pagination + record count  | —                 | Page navigation    |

## Development

```bash
cd AAAADMIN
npm install          # Install dependencies
npm run dev          # Start Vite dev server on :5173
npm run build        # TypeScript check + production build → dist/
```

The dev server proxies `/api` to `http://localhost:8787` — run `npm run dev` in `../AAAAPI` (`wrangler dev`) first.

## Deploy (Cloudflare Pages)

Production: `https://aaa-admin.pages.dev` (Pages project `aaa-admin`, account Cookievirus)

```bash
npm run build        # uses .env.production: VITE_API_BASE=https://aaa-api.cookievirus.workers.dev
CLOUDFLARE_ACCOUNT_ID=30ec5dca725dd7acef6a6ef89342e403 \
  ../AAAAPI/node_modules/.bin/wrangler pages deploy dist --project-name=aaa-admin --branch=main
```

- The Pages origin must be listed in `ALLOWED_ORIGINS` of AAAAPI (exact match, so preview URLs `<hash>.aaa-admin.pages.dev` cannot call the API)
- Newer wrangler versions try to convert Pages to Workers and edit `package.json`; the project already exists on Pages, so plain `pages deploy` works

## Design Principles

- **DRY** — Shared layout in `components/`, pages contain only content
- **Single Source of Truth** — Modify sidebar/header/footer once, affects all pages
- **Separation of Concerns** — Components render HTML; `layout.ts` handles wiring
- **No Circular Dependencies** — `utils.ts` is a leaf module

## Theme System

- CSS variables on `:root` (light) and `[data-theme="dark"]` (dark)
- `localStorage` persistence + `prefers-color-scheme` fallback
- View Transitions API: circular ripple from click position (500–700ms)
- Graceful fallback when View Transitions API is unavailable
- `prefers-reduced-motion` disables all animations

## Changelog

### v1.3.0
- Wired to AAAAPI `/api/v1/admin/*`: login, houses, residents, vehicles, credentials, LINE link code, visitors
- New Visitors page with one-time Guest Code display
- Removed Projects / Vehicles / Devices / Access Logs / Blacklist pages and footer health check (no API yet)
- Dev proxy to `wrangler dev` (`:8787`), production API origin via `VITE_API_BASE`
- Deployed to Cloudflare Pages: `https://aaa-admin.pages.dev`

### v1.2.0
- DataTable pagination with summary footer on all pages
- Modal confirm/alert dialogs replacing browser popups
- SVG circular progress spinner on all form submits
- CSS specificity fix for modal overlay blocking clicks
- Nil-slice-to-empty-slice fix in backend List handlers (JSON null → [])
- SQL placeholder counter fix for optional query filters
- Login page: theme toggle + copyright footer + admin-only mode

### v1.1.5
- Initial release with 8 management pages, JWT auth, edge sync

## License

Proprietary. All rights reserved.
