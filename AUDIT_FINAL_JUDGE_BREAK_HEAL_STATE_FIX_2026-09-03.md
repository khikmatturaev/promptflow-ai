# PromptFlow — Judge Mode BREAK/HEAL + Stage-State Audit — 2026-09-03

## Finding

The supplied screenshot showed green checkmarks for Diagnose, Heal, Re-test and Verdict while their small duration labels still read `waiting`.

This was a presentation-state bug, not an execution-state bug. `FinalWowPanel` used `durationMs === 0` as a proxy for waiting, so a completed synchronous stage that finished inside the same millisecond was rendered as `waiting`.

The screenshot also showed `BEFORE 100 → AFTER 100`, `GAIN +0`, and `SURVIVABILITY 78 → 78`. The Judge Mode pipeline completed, but that run did not provide strong visible evidence that the injected compute-failure scenario caused measurable degradation and recovery.

## Fix

### `src/components/FinalWowPanel.tsx`

Stage detail now uses the stage status as the source of truth:

- `running` → `working…`
- `completed` / `failed` / `skipped` → `${durationMs}ms`
- `pending` → `waiting`

Therefore a completed stage can no longer be visually reported as `waiting` merely because its measured duration is `0ms`.

### `src/lib/digitalTwin.ts`

The compute-failure model now distinguishes the Judge-specific failover replica:

- no Judge replica + one compute path → strong injected penalty
- no Judge replica + two compute paths → partial penalty
- no Judge replica + three or more compute paths → smaller but measurable penalty
- Judge failover replica present → the modeled compute failure is contained

`buildHardeningOperations()` adds one stable `twin-compute-replica-1` failover path when a compute path exists and the Judge replica is not already present.

This is deliberately a Digital Twin model. It does not crash or mutate a real production service.

## Expected evidence on a fresh Judge run

For an architecture without the Judge replica, the panel should now be able to show:

`BREAK: Failure injected: 1 scenario · ... survivability`

followed by:

`HEAL: 1 hardening operation applied`

and:

`RE-TEST: X → Y survivability (+D) · ... score`

with `Y > X` for the modeled compute-failure scenario.

The exact numeric values depend on the generated architecture.

## Repeat-run behavior

After a Judge run has already added `twin-compute-replica-1`, running Judge Mode again on the same canvas represents an already-hardened architecture. In that state the compute-failure model can legitimately show no additional degradation/recovery delta. For the cinematic before/after demonstration, use `New Brief` first so the baseline starts without the Judge-specific replica.

## Scope

Changed only:

- `src/lib/digitalTwin.ts`
- `src/lib/finalWow.ts`
- `src/components/FinalWowPanel.tsx`

No WebMCP, code-generation, execution-engine, store, or responsive architecture was changed.
