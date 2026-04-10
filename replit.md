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

## Recent Changes
- 2026-04-10: Full i18n system added (pt-BR, en-US, es-ES)
  - All UI text in Dashboard, Members, Finance, Infrastructure, Departments translated
  - Locale-aware currency and date formatting throughout
  - Language selector in sidebar with localStorage persistence
- 2026-02-21: Initial import and Replit environment setup
  - Configured Vite to bind to 0.0.0.0:5000 with allowedHosts
  - Removed import map from index.html (Vite handles module resolution)
  - Installed missing `canvg` dependency for jspdf
