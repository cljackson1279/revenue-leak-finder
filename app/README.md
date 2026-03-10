# Revenue Recovery Engine — App

This is the Next.js application for the Revenue Recovery Engine. See the [root README](../README.md) for full architecture documentation and the [Production Checklist](../PRODUCTION_CHECKLIST.md) for deployment instructions.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create environment file (never commit this)
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 3. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run Jest golden tests |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server only) | Supabase service role key — never expose to browser |

## Test Fixtures

| File | Type | Description |
|---|---|---|
| `fixtures/835/sample1.edi` | 835 ERA | BCBS underpayment scenario (3 claims, CO-45) |
| `fixtures/835/sample2.edi` | 835 ERA | Aetna PR adjustments |
| `fixtures/835/sample3_denials.edi` | 835 ERA | UHC denial scenarios (CARC 50, 29, 97) |
| `fixtures/pdf/sample_eob1.pdf` | EOB PDF | BCBS text-extractable EOB with underpayment |
| `fixtures/pdf/sample_eob2.pdf` | EOB PDF | Aetna EOB with denial codes (CO-50, CO-97) |

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/analyze` | POST | Parse uploaded file and compute findings |
| `/api/appeal-packet` | POST | Generate PDF appeal letter |
| `/api/export-csv` | GET | Export findings as CSV |

All API endpoints require a Bearer token (`Authorization: Bearer <access_token>`).

## Key Libraries

- **Next.js 16** (App Router, Turbopack)
- **@supabase/ssr** — cookie-based auth for SSR
- **pdf-parse** — PDF text extraction
- **jspdf** — server-side PDF generation for appeal letters
- **shadcn/ui** — component library
- **Jest + ts-jest** — testing
