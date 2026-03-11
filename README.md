# MedicalRouter

A deterministic medical billing analysis tool that parses 835 ERA files and EOB PDFs to identify underpayments, appealable denials, and revenue recovery opportunities.

## Architecture

```
app/                          # Next.js 16 application (App Router)
├── app/
│   ├── api/
│   │   ├── analyze/          # POST /api/analyze — parse & compute findings
│   │   ├── appeal-packet/    # POST /api/appeal-packet — generate PDF
│   │   └── export-csv/       # GET  /api/export-csv — download CSV
│   ├── auth/callback/        # Supabase magic link callback
│   ├── login/                # Magic link login page
│   └── app/
│       ├── dashboard/        # Analytics dashboard
│       ├── upload/           # File upload + analyze trigger
│       ├── results/          # Findings table with filters
│       ├── results/[id]/     # Finding detail with math trace
│       └── admin/            # Account & system info
├── lib/
│   ├── parse835.ts           # Deterministic 835 parser + finding engine
│   ├── parsePdf.ts           # PDF EOB text extraction (OCR stub)
│   ├── supabase.ts           # Browser + server + service role clients
│   ├── database.ts           # DB helper functions
│   ├── auth.ts               # API route auth helper
│   ├── codeLookup.ts         # CARC/RARC code descriptions
│   ├── appealPacket.ts       # Appeal letter PDF generation
│   ├── rateLimit.ts          # In-memory rate limiter (swappable)
│   └── __tests__/
│       └── parse835.test.ts  # 30 golden tests
├── data/
│   ├── appeal_rules.json     # CARC → template mapping
│   ├── carc.json             # CARC code descriptions
│   └── rarc.json             # RARC code descriptions
├── templates/appeals/        # 10 Markdown appeal letter templates
├── fixtures/835/             # 3 test EDI files
└── vercel.json               # Vercel deployment config
supabase/
└── migrations/
    └── 20260309000000_create_findings.sql  # Idempotent schema
```

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Parser approach | Deterministic, no LLM | Reproducible, auditable, no hallucination risk |
| Finding types | UNDERPAID, DENIED_APPEALABLE, DENIED_NON_APPEALABLE, NEEDS_REVIEW, INCOMPLETE_DATA | Covers the full spectrum of 835 outcomes |
| Math trace | `allowed - patient_responsibility - paid = underpayment` | Industry-standard formula, stored in evidence JSON |
| Auth | Cookie/SSR via `@supabase/ssr` + Bearer token for API routes | Works reliably on Vercel serverless |
| Multi-tenancy | `account_id` on all tables + RLS policies | Row-level security enforced at DB level |
| Rate limiting | In-memory with swappable interface | MVP-ready; swap to Upstash Redis later |
| OCR | Stub with feature flag | Does not block launch; marks scanned PDFs as INCOMPLETE_DATA |
| PDF generation | jsPDF (server-side) | Lightweight, works within Vercel serverless limits |

## Setup

### Prerequisites

- Node.js 22+
- Supabase project with:
  - `uploads` storage bucket (private)
  - Magic link auth enabled

### Environment Variables

Create `app/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Database Setup

Run the migration against your Supabase project:

```bash
# Via Supabase CLI
supabase db push

# Or manually in SQL Editor
# Copy contents of supabase/migrations/20260309000000_create_findings.sql
```

Verify with:
```bash
# Run supabase/schema-sanity.sql in SQL Editor
```

### Install and Run

```bash
cd app
npm install
npm run dev
```

### Run Tests

```bash
cd app
npx jest --verbose
```

All 30 tests should pass, covering:
- 835 segment parsing (ISA, BPR, TRN, N1, CLP, SVC, DTM, CAS, AMT)
- Underpayment computation with math trace
- Denial classification (CARC 29, 45, 50, 97, etc.)
- Deterministic output verification

## API Endpoints

### POST /api/analyze

Analyze an uploaded file (835 ERA or EOB PDF).

```json
{
  "upload_id": "uuid"
}
```

Returns:
```json
{
  "ok": true,
  "findings_count": 5,
  "findings": [...]
}
```

### POST /api/appeal-packet

Generate a PDF appeal packet for findings.

```json
{
  "finding_ids": ["uuid1", "uuid2"],
  "upload_id": "uuid"
}
```

Returns: `application/pdf` binary

### GET /api/export-csv

Export findings as CSV.

Query params: `upload_id`, `finding_type`, `confidence`, `payer`, `status`

Returns: `text/csv` with headers

## Finding Types

| Type | Description | Confidence |
|---|---|---|
| `UNDERPAID` | Payer paid less than allowed minus patient responsibility | High |
| `DENIED_APPEALABLE` | Denial with CARC code that has appeal template | Medium |
| `DENIED_NON_APPEALABLE` | Denial with non-appealable CARC code | Medium |
| `NEEDS_REVIEW` | Adjustment that requires manual review | Low |
| `INCOMPLETE_DATA` | Missing fields prevent deterministic analysis | Low |

## Appeal Templates

10 templates covering common denial scenarios:
- Underpayment
- Contractual adjustment (CARC 45)
- Bundled/included (CARC 59, 97)
- Missing information (CARC 4, 5, 16)
- Deductible misapplied (CARC 1)
- Coinsurance misapplied (CARC 2, 3)
- Timely filing (CARC 29)
- Medical necessity (CARC 50, 55)
- Not covered (CARC 96, 167, 204)
- Generic reconsideration

## Deployment

### Vercel

```bash
cd app
vercel --prod
```

Required Vercel environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Vercel Limits

- `/api/analyze`: 30s max duration
- `/api/appeal-packet`: 15s max duration
- `/api/export-csv`: 10s max duration

## Security

- **No PHI in findings**: Patient names, member IDs, and other PHI are never stored in the findings table
- **RLS enforced**: All tables have row-level security policies scoped to `account_id`
- **Service role key**: Never exposed to the client; only used in server-side API routes
- **Rate limiting**: 10 requests per minute per IP on `/api/analyze`
- **Input validation**: File type, size, and format validation on upload and analysis

## Future Enhancements

- [ ] OCR integration (Tesseract or cloud OCR) for scanned PDFs
- [ ] Upstash Redis rate limiting
- [ ] Background job queue for large file processing
- [ ] Batch upload and analysis
- [ ] Fee schedule comparison engine
- [ ] Payer contract rate management
- [ ] Appeal tracking and follow-up workflow
- [ ] Dashboard charts and trend analysis
