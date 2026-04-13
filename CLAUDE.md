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

---

## Product design rules (homepage / marketing)

### Product positioning
- Position as a **revenue recovery copilot for underpaid and denied claims** — not a generic AI billing tool.
- The core value: surface missed revenue from ERA/EOB files, show the math, generate the appeal.
- Describe the output concretely: underpayment shortfalls in dollars, CARC/RARC codes, net recoverable per claim, ready-to-send appeal packets.
- Do not use phrases like "AI-powered," "next-generation," "intelligent platform," or other generic AI copy.
- Do not overstate HIPAA, security, or compliance claims. Describe actual practices (encrypted transit, private storage, role-based access) without certifying compliance.

### Copy and tone
- Use concrete, specific language: "Allowed − Paid − Patient Responsibility = Net Recoverable."
- Name the payers (UHC, Cigna, Aetna, BCBS, Medicare) to signal real-world fit.
- Describe the audience precisely: independent specialty practices, 1–10 providers, 50+ claims/month, billing commercial payers and Medicare.
- Avoid vague qualifiers: "some," "may," "potentially," "helps you." Say what the product actually does.
- Keep legal hedge language in FAQ and disclaimers — not in the hero or feature copy.

### Design and visual
- Restrained, credible design: zinc/white palette, blue accent (#2563eb), no gradients, no illustrations.
- Prioritize scanability: short paragraphs, clear section headers, bullet points with specific facts.
- CTA hierarchy: primary (pilot signup, blue filled) → secondary (contact/demo, outline) → tertiary (sign in, ghost).
- Proof beats claims: show a sample findings table rather than describing what the table "might" show.
- No generic hero illustrations, stock photos, or icon grids that don't carry information.

### Conversion and trust
- Low-risk framing for pricing: $500 flat + 25% success fee on recovered dollars only. No long-term contract.
- Surface the specific risk: "If we find nothing actionable, you're out $500."
- FAQ must address: what $500 covers, when success fee applies, what "net recovered" means, no long-term contract.
- Trust signals: explicit data handling (private per-account storage, you own your data), not marketing certifications.
- Do not add testimonials, logos, or social proof that does not exist yet.
