# PromptFlow — Final Judge Break/Heal Audit & Fix
Date: 2026-09-03

## Finding

The latest Judge Mode run was operationally successful (11/11 stages, real execution PASS, QA 100), but the judge-facing recovery metric still showed `BEFORE 100 / AFTER 100 / GAIN +0 / survivability 78 → 78`.

This was not caused by the `waiting` state anymore. The remaining issue was metric aggregation in `src/lib/finalWow.ts`.

## Root cause

Judge Mode intentionally runs two scenarios:

1. a 10M-user `load-spike`
2. a `compute-failure`

The old `survivability()` helper returned the minimum survivability across *all* scenarios. The load-spike could remain the limiting scenario after compute hardening, so the UI could show no recovery even when the compute-failure scenario improved.

Separately, the `Before`/`After` cards represented architecture audit score, not the injected-failure recovery score. Therefore `100 → 100` was not evidence of failed healing, but it was visually ambiguous for a judge.

## Fix

`runFinalWowDemo()` now extracts survivability specifically from the `compute-failure` scenario for the BREAK → HEAL → RE-TEST scorecard.

The scorecard now contains:
- architecture `before` / `after`
- `improvement` (architecture score delta)
- `survivabilityBefore` / `survivabilityAfter` for the injected compute failure
- `recoveryDelta`
- QA score

The Re-test stage now reports the compute-failure recovery explicitly, e.g. `90 → 100 compute-failure survivability (+10)`.

The judge-facing metric label `Gain` was changed to `Recovery`, and `Survivability` to `Failure resilience`, making the semantics clear.

The existing Digital Twin hardening behavior remains unchanged: Judge Mode adds a bounded independent compute replica when needed, then re-runs the same failure scenario.

## Waiting-state audit

Completed stages are already rendered with a duration instead of `waiting`. `waiting` is reserved for pending stages. No change to execution state semantics was required in this patch.

## Scope

Changed only:
- `src/types/finalWow.ts`
- `src/lib/finalWow.ts`
- `src/components/FinalWowPanel.tsx`

No WebMCP, Agent OS, code generation, execution engine, WebContainer, QA, or responsive implementation was changed.

## Verification

Static source consistency was checked after the patch. The environment available for this audit does not contain the project's installed dependencies, so a local TypeScript build could not be executed here. The patch is intentionally limited to existing typed fields and their consumers.

## Expected judge-facing result

After a fresh `New Brief` and a new Judge Mode run, the panel should distinguish:

- architecture score: `Before → After`
- injected compute-failure resilience: `X → Y`
- recovery delta: `+D`
- QA: `N`

A healthy run should therefore visibly demonstrate the BREAK → DIAGNOSE → HEAL → RE-TEST recovery rather than masking it behind the independent load-spike minimum.
