# PromptFlow — Execution Failure Root-Cause Instrumentation Audit
Date: 2026-09-03

## Scope
Audited the complete uploaded project snapshot, including the current WebMCP Agent OS, Judge Mode, code generation, execution engine, QA, and UI flow.

## Current failure observed
The application reaches:
- WebMCP registration: 49 tools
- Architecture generation
- Code generation
- Judge Mode
- WebContainer execution attempt

but can end with `REAL EXECUTION LOOP: FAILED` while the UI shows no actionable process error and the browser console has no corresponding application error.

## Root cause found in the execution diagnostics path
`src/lib/executionEngine.ts` was already creating a WebContainer process and reading `process.output`, but `runProcess()` stopped the output reader as soon as `process.exit` won the race. The reader was then released while a `read()` could still be pending, and the output-reader rejection was intentionally ignored.

Consequences:
1. `npm install`, `npm test`, or `npm run build` could exit non-zero.
2. The actual stdout/stderr containing the root error could be lost.
3. `ExecutionStep.output` could therefore be empty or incomplete.
4. `diagnosticFor()` had no evidence to classify, so the UI only showed a generic FAILED state.
5. This made the real failure look like a silent WebContainer failure.

This is the primary diagnostic defect fixed in this patch.

## Additional execution-path issues fixed
### Runtime output was discarded
`startRuntime()` did not capture the runtime process output. If `npm run start` exited before `server-ready`, the UI received only:
`Runtime process exited before the WebContainer server-ready event.`
The patch now captures the runtime process output and includes it in the failed step.

### Failure evidence was not visible
`CodeGenerationPanel` only displayed a status/title summary and the last few phase chips. The patch now:
- shows a dedicated Failure evidence block;
- displays diagnostic code/title/explanation;
- displays captured process output;
- makes every execution step expandable;
- automatically opens the failed step.

### Judge Mode used the pre-healing project for QA
`runFinalWowDemo()` passed the original `project` to production QA even when `executeProject()` returned healed artifacts. The patch makes QA inspect `execution.artifacts` when available.

### Runbook mismatch
Generated project preflight advertised `npm run dev`, while the real verification path uses `npm run start`. The patch aligns the displayed runbook with the actual execution contract.

## Existing robustness already present and preserved
- WebContainer singleton boot with retry-safe boot promise reset.
- Workspace reset before each attempt to prevent stale files/node_modules/configs.
- Active runtime process cleanup.
- Bounded self-healing attempts.
- Artifact path traversal/collision protection.
- NodeNext test import healing.
- React runtime/type dependency healing.
- Vitest was removed from generated projects in the previous patch; generated tests use a sequential `tsx` runner.
- Bundler diagnosis is scoped to the build phase and no longer falsely matches `vitest`.

## Verification performed
The changed TypeScript/TSX files were transpile-parsed with TypeScript 6.x and all changed files passed syntax/transpile diagnostics:
- `src/lib/executionEngine.ts` — PASS
- `src/components/CodeGenerationPanel.tsx` — PASS
- `src/lib/finalWow.ts` — PASS

A full application build could not be executed in this isolated audit environment because the uploaded project has no installed `node_modules`, and dependency installation requires external registry access. Therefore this audit does not claim a WebContainer runtime PASS.

## Expected result after applying this patch
The next failing run should no longer end as an opaque `FAILED`.

The UI should identify the exact phase and command, for example:
- `installing · npm install ... · exit 1`
- `testing · npm test · exit 1`
- `building · npm run build · exit 2`
- `verifying · npm run start ... · exit 1`

and display the captured stdout/stderr immediately.

This turns the next run into a deterministic root-cause capture rather than another blind retry.
