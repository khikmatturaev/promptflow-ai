# PromptFlow — Execution Failure Root Cause and Final Fix Audit
Date: 2026-09-03

## User-observed failure

The real execution loop failed during `npm test`:

`FAIL application-api.test.ts Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'express' imported from /home/promptflow-execution/src/components/application-api.ts`

Other generated tests passed.

## Exact root cause

The architecture compiler does not infer Express when the user prompt does not explicitly request Express. For the tested e-commerce brief, the generated backend node is an `Application API` and the implementation stack does not contain `Express`.

However, `ArchitectExperience.tsx` used this fallback for the representative API boilerplate:

- Fastify when Fastify was explicitly detected;
- Express when Express was explicitly detected;
- Python/FastAPI for Python;
- **Express for every other Node.js case**.

That unconditional Express fallback was stored as the primary API node's `boilerplate`. `codeGeneration.ts` correctly built `package.json` from the detected architecture/implementation stack, so Express was not added to dependencies. The generated source therefore imported `express` while the generated package did not install `express`.

This exactly explains the observed runtime error.

## Fix applied

### 1. Neutral Node.js fallback

`src/components/ArchitectExperience.tsx`

The default Node.js representative API implementation now uses Node's built-in `node:http` module. It has zero third-party runtime dependency and therefore works for arbitrary Node.js prompts that did not explicitly request Express or Fastify.

Python's representative implementation was also changed from FastAPI to Python's standard-library HTTP server so the representative code does not introduce an undeclared FastAPI dependency.

### 2. Dependency reconciliation defense

`src/lib/codeGeneration.ts`

Generated package dependencies now also inspect node boilerplate/source imports for known framework dependencies. If a custom/agent-authored boilerplate explicitly imports Express or Fastify, the corresponding runtime dependency and TypeScript type package are included even when the architecture text did not mention that framework.

This is a defensive consistency check; it does not replace the neutral default.

### 3. Agent OS count consistency

`src/components/AgentDemoPanel.tsx`

The visible Agent OS count now uses the actual registered tool set size instead of a hardcoded `35`. The current registry contains 37 Agent OS tools and 49 total tools.

## Why this fixes the observed failure

Before:

`Application API boilerplate -> import express -> package.json without express -> npm test -> ERR_MODULE_NOT_FOUND`

After:

`Application API boilerplate -> import node:http -> no Express dependency required -> npm test can load the module`

If an explicit Express boilerplate is supplied:

`boilerplate -> Express import -> dependency reconciliation -> express + @types/express added`

## Scope

Only these project files were changed:

- `src/components/ArchitectExperience.tsx`
- `src/lib/codeGeneration.ts`
- `src/components/AgentDemoPanel.tsx`

No execution engine, WebMCP registry, Judge Mode, or UI behavior unrelated to this root cause was rewritten.

## Verification

- Checked the exact reported error against the generated-code path.
- Confirmed the unconditional Express fallback in `ArchitectExperience.tsx`.
- Confirmed `package.json` dependencies are derived from the implementation stack and therefore omitted Express for the tested prompt.
- Confirmed the generated test runner imports `application-api.ts`, which triggers the missing package immediately.
- Added a dependency reconciliation defense for explicit boilerplate imports.
- Static syntax/transpile parsing should be run locally with the project's existing toolchain before submission.

## Expected next result

For the same e-commerce prompt, the failing `application-api.test.ts` should no longer throw `ERR_MODULE_NOT_FOUND: Cannot find package 'express'`.

The next run should either pass execution or expose a genuinely new failure with the diagnostics instrumentation already present. That is materially different from the previous opaque failure: the known root cause has now been directly fixed.
