# Safed / gastos-app

Safed is a personal finance app for tracking income and expenses across web and Android. It combines manual transaction entry, spreadsheet imports, AI receipt scanning, Android bank notification parsing, and offline synchronization.

The repository name is `gastos-app`, while the product name shown in the UI is `Safed`.

## Features

- Transaction management: create, edit, and delete income or expense records with category, icon, date, notes, payment method, card last four digits, recurrence, and budget flags.
- Monthly control: define a monthly goal and track recurring payments from the dashboard.
- Multi-currency: supports `ILS`, `USD`, `ARS`, and `EUR`, with conversions stored through `Exchangerate-API` and `DolarAPI`.
- Dashboard and stats: current balance, income, expenses, recent activity, category charts, monthly trends, and fixed-versus-variable analysis.
- Import/export: import from `xlsx`, `xls`, and `csv`, map columns manually, review by month before saving, and export back to Excel.
- Categories and personalization: custom categories, hidden categories, icon selection, language toggle (`es` / `en`), and UI color customization.
- Account and security: Supabase auth, session persistence with automatic refresh, email change, password change, and account deletion.
- AI receipt scanning: optional `GROQ_API_KEY` support for extracting structured data from receipts and invoices, with daily limits for non-admin users.
- Android notification parsing: Capacitor-based native listener with regex parsing for supported bank and wallet notifications, including pending review and auto-save flows.
- Offline support: IndexedDB cache, queued offline operations, manual resync, and online/offline status indicators.

## Functional status

- The core personal finance experience is operational on both web and Android.
- Android banking sync exists and is usable, but should still be considered beta.
- "Travel mode" may still appear in older parts of the UI history, but it is currently disabled in the profile view and should not be considered an active feature.

## Tech stack

- Frontend: `Next.js 16`, `React 19`, `TypeScript`, modular/vanilla CSS
- Backend: Next.js Route Handlers under `src/app/api`
- Database: `PostgreSQL` with `Prisma`
- Authentication and server-side integrations: `Supabase`
- Mobile runtime: `Capacitor 8` for Android
- Import/export: `xlsx`
- AI integration: `Groq` for receipt scanning

## Environment variables

Create a `.env` file at the project root:

```env
DATABASE_URL="postgresql://user:password@host:port/dbname"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# Optional
DIRECT_URL="postgresql://user:password@host:port/dbname"
GROQ_API_KEY="your-groq-api-key"
```

### Required

- `DATABASE_URL`: primary Prisma connection string
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: server-side key for protected backend flows

### Optional

- `DIRECT_URL`: useful for some Prisma workflows and deployments
- `GROQ_API_KEY`: enables receipt scanning

## Local development

### Prerequisites

- Node.js and npm
- PostgreSQL
- A Supabase project configured for auth

### 1. Install dependencies

```bash
npm install
```

### 2. Sync the database schema

```bash
npx prisma db push
```

### 3. Start the development server

```bash
npm run dev
```

### 4. Run linting

```bash
npm run lint
```

## Useful scripts

### Web

```bash
npm run dev
npm run build
npm run start
npm run lint
```

### Android / Capacitor

```bash
npm run patch:android
npm run cap:dev
npm run cap:prod
npm run apk:dev
npm run apk:prod
npm run aab:prod
npm run aab:verify
```

## Deployment

### Web

- Intended for Vercel with PostgreSQL, commonly Railway.
- `postinstall` runs `prisma generate` automatically.

### Android

Prepare the native project:

```bash
npm run cap:prod
```

Build a release bundle:

```bash
npm run aab:prod
```

Verify the signing result:

```bash
npm run aab:verify
```

## Android signing

Configure release signing through `android/keystore.properties` or environment variables.

Supported variables:

- `SAFED_UPLOAD_STORE_FILE`
- `SAFED_UPLOAD_STORE_PASSWORD`
- `SAFED_UPLOAD_KEY_ALIAS`
- `SAFED_UPLOAD_KEY_PASSWORD`

Without a real upload key, the bundle will not be valid for Google Play release.

Step-by-step release notes:

- `reports/V1.0.1/PLAY_RELEASE_STEPS.md`

## Project structure

- `src/app`: App Router pages and routes
- `src/app/api`: auth, user, transactions, categories, notifications, and ticket scanning endpoints
- `src/app/components/dashboard`: dashboard UI
- `src/app/components/movements`: transaction list, filters, import/export, and review flows
- `src/app/components/stats`: analytics and breakdowns
- `src/app/components/profile`: account, goal, category, sync, and notification settings
- `src/context`: global state, dialogs, language, and session state
- `src/hooks`: session, offline sync, bank notification flows, and mobile helpers
- `src/lib`: Prisma, Supabase, bank parser, color system, and IndexedDB helpers
- `prisma`: database schema
- `android`: Capacitor Android project

## Simplified data model

- `User`: profile, monthly goal, role, and relations to transactions, scan usage, and pending notifications.
- `Transaction`: description, amount, converted amounts, category, icon, type, date, notes, recurrence, budget flags, payment method, and card last four digits.
- `PendingNotification`: parsed bank notifications awaiting confirmation.
- `ScanUsage`: daily receipt scanning quota tracking.

## Notes

- The repository still contains some historical or partially reintroduced UI capabilities; this README focuses on what is clearly active or integrated today.
- The visible branding is `Safed`, even though the folder and repository name remain `gastos-app`.
