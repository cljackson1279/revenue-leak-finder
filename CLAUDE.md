# Revenue Leak Finder — Claude Code Rules (GSD-lite)

## Goal (48 hours)
Ship a demoable MVP web app in the next 48 hours that:
- lets a practice log in via magic link and upload EOB PDFs / 835 ERAs to private storage,
- shows upload readiness + processing status (stubbed),
- shows a results table (sample data OK for demo),
- includes a basic admin view (stubbed).

## Build constraints
- Prefer deterministic logic over LLM guessing.
- Keep scope tight: ship in small increments.
- Always keep code runnable; avoid breaking main dev flow.

## Workflow (GSD-lite)
For each change:
1) Restate the task in 1–3 bullets.
2) Make a short plan (max 8 steps).
3) Implement the smallest working slice.
4) Run checks (typecheck/build/tests) and fix obvious issues.
5) Summarize what changed + how to verify.

## Token discipline
- Do not reread the whole repo.
- Only open files you need.
- Prefer editing existing files over creating many new ones.
- Keep generated code minimal and clear.

## Non-negotiables
- Tenant data keyed by account_id everywhere we store it.
- No PHI in logs.
- Uploads go to private storage.