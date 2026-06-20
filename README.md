# LIMS Issue Log

Private issue tracker for CSV/LIMS implementation work across Vadodara, Vapi, and issues common to both business units.

## Stack

- Next.js App Router
- Turso/libSQL
- Single-password private access
- Screenshot records stored in Turso

## Environment

Create `.env.local` for local use and add the same values in Vercel.

```bash
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
APP_PASSWORD=
AUTH_SECRET=
```

## Commands

```bash
npm install
npm run db:migrate
npm run dev
```

The app also creates missing tables on first authenticated request, so `db:migrate` is useful but not mandatory.
