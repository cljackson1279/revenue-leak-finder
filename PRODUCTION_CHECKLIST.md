# Production Launch Checklist

This document covers every step required to take the Revenue Recovery Engine from a fresh clone to a live, production-ready deployment on Vercel + Supabase.

---

## 1. Supabase Setup

### 1.1 Database Migration

Run the idempotent migration in the Supabase SQL Editor (or via the CLI):

```sql
-- Copy the full contents of:
supabase/migrations/20260309000000_create_findings.sql
```

Verify the schema with:

```sql
-- Copy the full contents of:
supabase/schema-sanity.sql
```

Expected output: 4 tables (`accounts`, `account_users`, `uploads`, `findings`), all RLS policies enabled.

### 1.2 Storage Bucket

Confirm the `uploads` bucket exists and is **private**:

- Supabase Dashboard → Storage → Buckets
- Bucket name: `uploads`
- Public: **No**

If it does not exist, create it:

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', false);
```

### 1.3 Auth Configuration

- Enable **Email (Magic Link)** provider: Authentication → Providers → Email
- Set **Site URL** to your Vercel production URL (e.g. `https://your-app.vercel.app`)
- Add the following to **Redirect URLs**:
  - `https://your-app.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback` (for local dev)

### 1.4 RLS Verification

Run the following in the SQL Editor to confirm RLS is active:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

All four tables should show `rowsecurity = true`.

---

## 2. Environment Variables

### 2.1 Local Development

Create `app/.env.local` (never commit this file):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2.2 Vercel

In the Vercel dashboard → Project → Settings → Environment Variables, add:

| Variable | Value | Environments |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-anon-key` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `your-service-role-key` | Production, Preview, Development |

**Important:** `SUPABASE_SERVICE_ROLE_KEY` is a secret. It is only used server-side and is never exposed to the browser. Do not prefix it with `NEXT_PUBLIC_`.

---

## 3. Vercel Deployment

### 3.1 Initial Deploy

```bash
# From the repo root
cd app
vercel --prod
```

Or connect the GitHub repo to Vercel for automatic deployments on push.

### 3.2 Build Settings

| Setting | Value |
|---|---|
| Framework Preset | Next.js |
| Root Directory | `app` |
| Build Command | `npm run build` |
| Output Directory | `.next` |
| Install Command | `npm install` |

### 3.3 Function Limits

`vercel.json` is pre-configured with:

```json
{
  "functions": {
    "app/api/analyze/route.ts": { "maxDuration": 30 },
    "app/api/appeal-packet/route.ts": { "maxDuration": 30 },
    "app/api/export-csv/route.ts": { "maxDuration": 10 }
  }
}
```

The `/api/analyze` route processes files synchronously within the 30s limit using fixture-sized files. For production-scale files (100+ claims), implement the background job pattern (Supabase queue + polling) documented in the README.

---

## 4. Security Checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is **not** in any committed file
- [ ] `app/.env.local` is in `.gitignore` (already configured)
- [ ] RLS is enabled on all 4 tables (verified in step 1.4)
- [ ] Storage bucket `uploads` is **private** (verified in step 1.2)
- [ ] Auth redirect URLs are restricted to your domain only
- [ ] Rate limiting is active on `/api/analyze` (in-memory, 10 req/min per IP)
- [ ] No PHI is stored in the `findings` table — only segment indices, claim IDs, and trace numbers
- [ ] Appeal letter templates contain no PHI placeholders that could be accidentally populated

---

## 5. Logging & Monitoring

### 5.1 Vercel Logs

- Vercel Dashboard → Project → Deployments → Functions tab
- All API routes use `console.error` for errors with structured context objects
- Key log prefixes: `[analyze]`, `[appeal-packet]`, `[export-csv]`, `[auth/callback]`

### 5.2 Error Patterns to Watch

| Log Pattern | Meaning | Action |
|---|---|---|
| `[analyze] storage download error` | File not found in `uploads` bucket | Check storage path in DB vs bucket |
| `[analyze] rate limit exceeded` | Too many requests from one IP | Normal for testing; upgrade to Upstash for production |
| `[auth/callback] create account error` | First-login onboarding failed | Check RLS on `accounts` table |
| `[analyze] parse error` | Malformed 835 or unreadable PDF | Check fixture against X12 spec |

### 5.3 Recommended Monitoring (post-launch)

- **Vercel Analytics**: Enable in project settings for performance monitoring
- **Supabase Dashboard**: Monitor DB connections, query performance, storage usage
- **Sentry** (optional): Add `@sentry/nextjs` for error tracking in production

---

## 6. Rate Limiting

The current implementation uses in-memory rate limiting (10 requests/minute per IP). This resets on cold starts and does not persist across serverless function instances.

**To upgrade to persistent rate limiting with Upstash Redis:**

1. Create an Upstash Redis database at [upstash.com](https://upstash.com)
2. Add env vars: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
3. Install: `npm install @upstash/ratelimit @upstash/redis`
4. Implement the `RateLimiter` interface in `app/lib/rateLimit.ts`:

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export class UpstashRateLimiter implements RateLimiter {
  private limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, '1 m'),
  })

  async check(key: string): Promise<{ allowed: boolean; remaining: number }> {
    const { success, remaining } = await this.limiter.limit(key)
    return { allowed: success, remaining }
  }
}
```

5. Swap the export in `rateLimit.ts` to use `UpstashRateLimiter`

---

## 7. OCR Feature Flag

Scanned PDFs (image-only, no text layer) are currently marked as `INCOMPLETE_DATA` with the message:

> "PDF appears to be scanned/image-only. OCR processing is not enabled in this deployment."

**To enable OCR (future sprint):**

1. Set environment variable: `ENABLE_OCR=true`
2. Install a Node.js OCR library (e.g. `tesseract.js`)
3. Implement the `ocrExtract` function in `app/lib/parsePdf.ts` (stub is already in place)
4. The feature flag check is at line ~60 of `parsePdf.ts`

---

## 8. Backup & Data Retention

- Supabase provides automatic daily backups on Pro plan and above
- The `uploads` storage bucket contains the original source files — do not delete
- The `findings` table is the derived output and can be regenerated by re-running analysis
- Recommended: enable Point-in-Time Recovery (PITR) in Supabase for production

---

## 9. Testing Before Launch

Run the full test suite:

```bash
cd app
npm test
```

Expected: 30 tests passing, 0 failing.

Test the full upload flow manually:

1. Sign in with magic link
2. Upload `app/fixtures/835/sample1.edi` → should produce 3 UNDERPAID findings
3. Upload `app/fixtures/835/sample3_denials.edi` → should produce DENIED_APPEALABLE findings
4. Upload `app/fixtures/pdf/sample_eob1.pdf` → should produce INCOMPLETE_DATA or parsed findings
5. Generate an appeal letter from a UNDERPAID finding
6. Export CSV from the results page
7. Verify Admin page shows correct stats and allows saving practice settings

---

## 10. Post-Launch Checklist

- [ ] Magic link email is delivered (check spam filters)
- [ ] Auth callback redirects correctly to `/app/dashboard`
- [ ] First-login creates account automatically (check `accounts` table in Supabase)
- [ ] File upload to storage bucket succeeds
- [ ] Analysis completes within 30s for fixture files
- [ ] Findings appear in results table
- [ ] Appeal letter PDF downloads correctly
- [ ] CSV export downloads correctly
- [ ] Admin settings save and persist
- [ ] RLS prevents cross-account data access (test with two accounts)
- [ ] Vercel function logs show no unexpected errors
