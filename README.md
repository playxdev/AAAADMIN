# AAAADMIN — Axis Access Auto Admin Panel v1.2.0

Administrative dashboard for the AAA intelligent residential access management system. Built with **TypeScript**, **Vite**, and **Tailwind CSS v4**.

## Features

- **Admin Login** — bcrypt-authenticated login against `tb_admin`
- **Dark/Light Mode** — CSS variables + `data-theme` + View Transitions API circular ripple reveal
- **Collapsible Sidebar** — hamburger toggle with icon-rail navigation, `localStorage` persistence
- **8 Management Pages** — Projects, Houses, Users, Vehicles, Devices, Access Logs, Blacklist
- **Dashboard** — stats cards + recent access logs table
- **DataTable Pagination** — client-side pagination with summary footer on all tables (15/page)
- **Modal Dialogs** — styled confirm/alert modals replacing browser popups
- **SVG Progress Spinner** — rotating ring indicator on form submits and loading states
- **System Status** — footer health check via `/api/v1/health`
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
│   ├── footer.ts        # Bottom bar (copyright, version, health)
│   ├── modal.ts         # Confirm/alert modal dialogs
│   └── table-footer.ts  # Pagination + data summary footer
├── pages/               # Page-specific content only
│   ├── login.ts         # Admin login form
│   ├── dashboard.ts     # Stats grid + recent access logs
│   ├── projects.ts      # Project CRUD
│   ├── houses.ts        # House CRUD
│   ├── users.ts         # User CRUD
│   ├── vehicles.ts      # Vehicle CRUD
│   ├── devices.ts       # Device CRUD
│   ├── access-logs.ts   # Read-only with filters
│   └── blacklist.ts     # Blacklist CRUD
├── router.ts            # Route registry, navigation, orchestration
├── theme.ts             # Dark/light toggle + View Transitions API
├── auth.ts              # JWT + admin login functions
├── api.ts               # HTTP client with Bearer auth
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
| `footer`        | Copyright, health status   | —                 | Health fetch       |
| `layout`        | All above + `<main>`       | —                 | Theme, sidebar, footer |
| `modal`         | Confirm/alert dialogs      | Promise resolve   | OK/Cancel/overlay  |
| `table-footer`  | Pagination + record count  | —                 | Page navigation    |

## Development

```bash
cd AAAADMIN
npm install          # Install dependencies
npm run dev          # Start Vite dev server on :5173
npm run build        # TypeScript check + production build → dist/
```

The dev server proxies `/api` to `http://localhost:8089` (configure in `vite.config.ts`).

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
