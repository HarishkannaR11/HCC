# Build plan

Superseded by the five-phase product plan in `CLAUDE.md` (Foundations →
Practice loop → Progress → Monetization → Audit mode and hardening), with
choices logged in `DECISIONS.md`.

History: the original Phase 0 (CMS PY2026 V28 data foundation) passed live
verification on 2026-09-21. Its parser and invariants carry forward in
`scripts/lib/reference-build.ts`; its tables were replaced by the versioned
schema in `supabase/migrations/0004`–`0008`.
