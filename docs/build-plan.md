# Build plan

Superseded by the five-phase product plan in `CLAUDE.md` (Foundations →
Practice loop → Progress → Monetization → Audit mode and hardening), with
choices logged in `DECISIONS.md`.

History: the original Phase 0 (CMS PY2026 V28 data foundation) passed live
verification on 2026-09-21. Its parser and invariants carry forward in
`scripts/lib/reference-build.ts`; its tables were replaced by the versioned
schema in `supabase/migrations/0004`–`0008`.

## Phase 2 — Practice loop (done)
- [x] Encoder: split pane, PY-scoped typeahead, assigned-code tray with HCC,
      coefficient and running hierarchy-trimmed RAF, evidence highlighting,
      per-code rationale, keyboard-first, server-side drafts.
- [x] Scoring engine in `src/lib/scoring/` (pure, tested before the result screen).
- [x] Submit (server-scored, service-role write, one transaction) and the
      result screen with the arithmetic written out.

**Verified:** a chart completed end to end reproduces the hand-worked score
(72.91% for E11.22 + N18.31 on the diabetes chart), and a status code coded
where only history is documented fires its trap explanation.
