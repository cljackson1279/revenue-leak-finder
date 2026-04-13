# Skill: Revenue Leak Finder — Trust-First Design

## When to use
Invoke this skill when making any homepage, landing page, or marketing copy changes for the MedicalRouter / Revenue Leak Finder product.

## Product context
MedicalRouter is a revenue recovery tool for independent medical practices. It parses 835 ERA and EOB PDF files to identify underpaid and denied claims, calculates net recoverable amounts per claim, and generates ready-to-send appeal packets.

**Target audience:** Independent specialty practices, 1–10 providers, billing commercial payers (UHC, Cigna, Aetna, BCBS) and Medicare, processing 50+ claims/month.

**Pricing model:** $500 flat onboarding fee + 25% success fee on net recovered payer dollars only. No long-term contract.

## Design principles

### 1. Trust over hype
- Every claim must be verifiable or demonstrable.
- Show sample output (findings table with real-looking claim rows) rather than describing the output.
- Use specific numbers, formula notation, payer names, and CARC/RARC codes.
- Avoid: "AI-powered," "intelligent," "next-generation," "revolutionize," "transform."

### 2. Concrete over vague
Good: "Allowed Amount − Payer Paid − Patient Responsibility = Net Recoverable"
Bad: "Helps you understand what you may be owed"

Good: "Appealable denials flagged by CARC code (CO-50, CO-29, CO-97)"
Bad: "Identifies denial patterns"

Good: "$500 flat + 25% on recovered dollars only — not patient responsibility"
Bad: "Flexible, transparent pricing"

### 3. Low-risk framing
- Lead with the downside: "If we find nothing actionable, you're out $500."
- Then lead into the upside: "Most practices find 5–10x that in the first analysis batch."
- No long-term contract = lower perceived risk → higher conversion.
- 25% success fee aligns incentives — surface this explicitly.

### 4. Section hierarchy (homepage)
1. Nav — logo + primary CTA + sign in
2. Hero — sharp headline, one-sentence value prop, primary + secondary CTA
3. Sample output proof — findings table with mock data, labeled clearly as illustrative
4. Workflow — 4 concrete steps with specific actions, not abstract verbs
5. Trust / fit — who it's for + data handling (factual, not compliance-certified)
6. Pricing — $500 + success fee, with explicit risk framing
7. FAQ — 5–6 questions answering the real objections
8. Bottom CTA — repeat primary action
9. Footer — links + legal

### 5. Security / data copy rules
Say:
- "Uploaded files are stored in private, per-account storage."
- "Files are encrypted in transit."
- "You retain ownership of your uploaded data."
- "We do not use your data to train models or share it with third parties."

Do not say:
- "HIPAA compliant" (unless BAA is in place and reviewed)
- "Enterprise-grade security" (vague)
- "Bank-level encryption" (vague)
- "Your data is 100% safe" (overclaim)

## Checklist before publishing changes
- [ ] Hero headline is specific to underpaid/denied claims recovery — not generic billing software
- [ ] Sample output table uses plausible-looking data, labeled "illustrative"
- [ ] Pricing section shows $500 flat AND 25% success fee with the risk framing
- [ ] FAQ covers: what $500 covers, success fee mechanics, denials vs underpayments, no contract, ideal customer
- [ ] No "AI-powered" or similar generic copy in hero or feature sections
- [ ] Security/data section uses factual language only
- [ ] All CTAs link to /pilot (primary) or /login (secondary)
- [ ] Footer includes: Terms, Privacy, Service Agreement, FAQ, Contact
