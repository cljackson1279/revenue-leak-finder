---

name: ux-guardrails

description: Enforce a clean, non-sloppy UI using shadcn/ui + Tailwind. Use before building pages.

disable-model-invocation: true

---



\# UI Rules (Revenue Leak Finder)

Use shadcn/ui components wherever possible (Button, Card, Input, Label, Table, Badge, Alert, Dialog, Separator).

Design style: clean B2B SaaS, minimal, whitespace-heavy.



\## Layout

\- Main container: mx-auto max-w-5xl (max-w-6xl for tables), px-4 sm:px-6, py-8

\- Consistent spacing: gap-6, Card with p-6

\- 2-column grids on desktop where useful; single column on mobile



\## Typography

\- H1: text-3xl font-semibold tracking-tight

\- Subtitle: text-base text-muted-foreground

\- Section headers: text-lg font-medium



\## Interaction

\- Every form has loading + success + error states

\- Errors use <Alert> with a clear message

\- Buttons have clear primary/secondary hierarchy



\## No AI slop

\- No gradients/neon

\- No walls of text

\- No messy Tailwind div soup—use Cards and consistent sections

