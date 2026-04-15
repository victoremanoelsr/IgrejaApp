# IgrejaApp - Church Management System

## Overview
IgrejaApp is a church management system (Portuguese: "Gestão Eclesiástica") built with React, TypeScript, and Vite. It uses Supabase as the backend for authentication and data storage. The app is a PWA (Progressive Web App) with features for managing members, finances, events, campaigns, departments, and more.

## Project Architecture
- **Frontend**: React 19 + TypeScript, bundled with Vite
- **Styling**: Tailwind CSS (via CDN)
- **Backend**: Supabase (external BaaS)
- **PWA**: vite-plugin-pwa with workbox
- **PDF Generation**: jspdf + jspdf-autotable
- **Charts**: Recharts
- **AI**: Google GenAI (@google/genai)

## Project Structure
```
/
├── index.html          # Entry HTML
├── index.tsx           # React entry point
├── App.tsx             # Main app component with routing
├── context.tsx         # React context (app state)
├── types.ts            # TypeScript type definitions
├── vite.config.ts      # Vite configuration
├── components/
│   └── Layout.tsx      # Layout wrapper component
├── pages/              # Page components
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Members.tsx
│   ├── Finance.tsx
│   ├── Events.tsx
│   ├── Campaigns.tsx
│   ├── Reports.tsx
│   └── ...
├── services/
│   ├── supabaseClient.ts   # Supabase client setup
│   ├── churchQueries.ts    # Database query functions
│   └── dataMappers.ts      # Data mapping utilities
└── setup.sql           # Database schema SQL
```

## Configuration
- **Dev server**: Runs on 0.0.0.0:5000 with all hosts allowed (for Replit proxy)
- **Deployment**: Static site, built to `dist/` directory

## Internationalization (i18n)
- Implemented with `i18next`, `react-i18next`, and `i18next-browser-languagedetector`
- Translation files at `i18n/pt-BR.json`, `i18n/en-US.json`, `i18n/es-ES.json`
- Config and utilities at `i18n/index.ts` — exports `formatCurrency()`, `formatDate()`, `getMonthName()`
- Language preference stored in `localStorage` under key `i18n_language`
- Currency mapping: pt-BR → BRL (R$), en-US → USD ($), es-ES → EUR (€)
- Language selector (flag dropdown) in sidebar footer
- Translated pages: Dashboard, Members, Finance, Infrastructure, Departments, Layout/nav

## Offline-First Finance (PWA Resilience)
Added complete offline resilience for the Finance (Tithes & Offerings) module:

- **`utils/offlineDB.ts`**: IndexedDB utility — save, retrieve, count, delete pending transactions
- **`components/Toast.tsx`**: Toast notification system (offline/syncing/synced states) with auto-dismiss
- **`context.tsx`** additions:
  - `isOnline` — tracks `navigator.onLine` via window events
  - `pendingOfflineCount` — count of transactions stored in IndexedDB
  - `syncOfflineTransactions()` — syncs pending records to Supabase when back online; replaces temp IDs with real ones
  - Modified `addTransaction()` to detect offline state, save to IndexedDB with unique temp ID, and show a toast
  - `beforeunload` warning in Layout prevents accidental close/logout with unsynced data
- **`pages/Finance.tsx`**: Pending badge shows "[X] lançamentos aguardando sincronização" with "Sincronizar agora" button
- **`components/Layout.tsx`**:
  - Dynamic green/orange status dot in sidebar user profile (green = online, orange = offline/syncing)
  - `WifiOff` icon shown when offline
  - Logout confirmation dialog if pending transactions exist
  - `beforeunload` warning if there are unsynced records
- **`vite.config.ts`**: Updated Workbox config with:
  - `StaleWhileRevalidate` for app navigation and static assets
  - `NetworkFirst` for Supabase REST API (GET data loads)
  - `CacheFirst` for Supabase Storage files (images/documents)

## Member Portal (Portal do Membro)
A separate mobile-first portal for church members at routes `/portal/*`.

### Architecture
- **`contexts/MemberContext.tsx`**: Separate React context holding member session, contributions, events, carnets. Session stored in `sessionStorage`.
- **`services/memberService.ts`**: Supabase query functions for member data (login, contributions, events, carnets, password update). Includes real-time channel subscription via `subscribeToMemberTransactions`.
- **`components/member/MemberLayout.tsx`**: Dark theme layout with sticky header + fixed bottom navigation bar (Início, Financeiro, Carnês, Documentos, Perfil). Shows church-blocked screen if `churches.active === false`.

### Pages (all at `/portal/*`)
- `MemberLogin.tsx` — CPF + birth date (DDMMAAAA) login, dark theme
- `MemberDashboard.tsx` — Monthly tithes card with PIX copy button, recent contributions, upcoming events
- `MemberFinanceiro.tsx` — Full contributions history with filter by DIZIMO/OFERTA
- `MemberCarnets.tsx` — Carnet templates list with on-demand PDF generation (uses existing `renderElementsToPDF`)
- `MemberDocumentos.tsx` — Document requests info page
- `MemberPerfil.tsx` — Member profile, first-access password-change alert, logout

### Authentication Logic
- **Username**: CPF (digits only, 11 chars)
- **Initial Password**: birth date as `DDMMYYYY` (converted from `YYYY-MM-DD` stored in DB)
- **Custom Password**: stored in `members.member_password` column (optional; falls back to birth date)
- **Church block**: checks `churches.active` — if `false`, renders blocked screen
- **Real-time**: Supabase channel `postgres_changes` on `transactions` table updates tithes live

### Required SQL Migration (run in Supabase)
```sql
ALTER TABLE members ADD COLUMN IF NOT EXISTS member_password TEXT;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS pix_key TEXT;
```

### Entry Points
- Admin login: `/` — has "Acesso Portal do Membro" button linking to `/portal/login`
- Member login: `/#/portal/login`

## Recent Changes
- 2026-04-15: Member Portal (Portal do Membro) — full mobile-first member self-service
- 2026-04-10: Offline resilience system for Finance module (IndexedDB queue + auto-sync + UX indicators)
- 2026-04-10: Full i18n system added (pt-BR, en-US, es-ES)
  - All UI text in Dashboard, Members, Finance, Infrastructure, Departments translated
  - Locale-aware currency and date formatting throughout
  - Language selector in sidebar with localStorage persistence
- 2026-02-21: Initial import and Replit environment setup
  - Configured Vite to bind to 0.0.0.0:5000 with allowedHosts
  - Removed import map from index.html (Vite handles module resolution)
  - Installed missing `canvg` dependency for jspdf
