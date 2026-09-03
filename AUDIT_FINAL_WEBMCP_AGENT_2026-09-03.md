# PromptFlow.ai — Final WebMCP Agent Architecture Audit

Date: 2026-09-03

## Audit scope

This audit reviewed the complete uploaded project, with special focus on the hackathon-critical path:

Human intent → ChatGPT/calling AI agent → WebMCP → PromptFlow deterministic architecture engine → generated project → WebContainer real execution → Judge Mode → Production QA → final verdict.

## Final architecture decision

PromptFlow does not embed a second LLM API for the hackathon path. The calling AI agent owns open-ended semantic understanding and tool selection. PromptFlow owns typed schemas, plan validation, deterministic architecture state, graph mutation, intelligence, code generation, sandbox execution, bounded healing, QA, and verdict generation.

For arbitrary briefs, the agent should infer semantic `components` and `connections` and pass them through WebMCP. PromptFlow still retains its local intent compiler as a fallback when an explicit semantic plan is not supplied.

## Changes completed

### 1. One-call WebMCP orchestration

Added `build_and_verify_system` as the recommended complete-system tool. It:

1. parses and validates the human brief;
2. accepts an optional agent-authored semantic component/connection plan;
3. validates the full architecture operation batch before replacing the canvas;
4. applies deterministic scale patterns and safe structural repair;
5. lays out and audits the graph;
6. runs architecture intelligence and digital-twin failure scenarios;
7. applies bounded hardening and re-tests the same scenario;
8. generates inspectable project artifacts;
9. runs real WebContainer install/test/build/runtime verification;
10. runs production QA;
11. returns a compact judge-facing scorecard and verdict.

This removes the need for ChatGPT to chain a long list of WebMCP tools for the primary demo path, while the lower-level tools remain available for inspection and precise follow-up edits.

### 2. Agent capability discovery

Added `get_promptflow_capabilities`, a read-only tool that explicitly tells the calling agent:

- semantic reasoning belongs to the calling AI agent;
- PromptFlow is the deterministic execution environment;
- `build_and_verify_system` is the recommended primary tool;
- WebContainer provides runtime proof;
- Judge Mode and Production QA provide verification.

### 3. Repeated-prompt execution isolation

The WebContainer instance is intentionally singleton-scoped. Mounting a new project over an existing workdir can leave stale source, config, lockfile, dependency, or build artifacts from a previous prompt.

The execution engine now clears the WebContainer workdir before every execution attempt, including self-healing retries.

### 4. Runtime-process cleanup

A successful generated runtime remains alive after the `server-ready` event. Reusing the same WebContainer without terminating that process can cause stale servers, port conflicts, or filesystem races on later prompts.

The execution engine now tracks the active generated runtime and kills it before resetting the workspace for the next run.

### 5. WebMCP production contract updated

The production WebMCP surface is now:

- 37 Agent OS tools
- 12 atomic tools
- 49 total tools

Production QA now verifies the complete 37-tool Agent OS contract, including `run_production_qa`, `run_judge_mode`, `get_promptflow_capabilities`, and `build_and_verify_system`.

### 6. Judge/demo UI updated

The Agent OS demo prompt now instructs ChatGPT to use the one-call `build_and_verify_system` path. A successful one-call run is recognized by the demo progress panel as completing the architecture, intelligence, stress, digital twin, hardening, build, execution, explanation, and QA journey.

The visible WebMCP count is updated to 49 total / 37 Agent OS tools.

### 7. README / judge handoff updated

README now documents the intended hackathon architecture:

Human → ChatGPT → WebMCP → PromptFlow → WebContainer → Judge Mode.

It also includes a one-call judge demo prompt and explicitly avoids presenting PromptFlow as an internal LLM wrapper.

## Existing strengths confirmed

- WebMCP registration is centralized and instrumented.
- Tool calls are reflected in a real activity feed; no fabricated agent activity is required.
- Agent-authored architecture plans are schema-bounded and validated before destructive canvas replacement.
- Zustand remains the single live architecture state.
- Architecture audit, intelligence, digital twin, implementation intelligence, code generation, code review, versioning, execution, QA, and Judge Mode are connected to the same state.
- Generated project source is mounted into WebContainer rather than evaluated in the host page.
- Generated Node/React execution is bounded by timeouts and bounded deterministic healing attempts.
- Deployment headers include COOP, COEP, WebMCP Permissions Policy, nosniff, and strict referrer policy.
- No `eval`, `new Function`, or `dangerouslySetInnerHTML` use was found in `src`.
- No TypeScript `any` type usage was found in `src`.

## Important product boundary

PromptFlow's generated code remains a validated executable scaffold rather than production-complete domain business logic for every possible technology stack. The hackathon claim should therefore be precise:

PromptFlow lets an AI agent turn arbitrary software intent into a validated architecture, an inspectable executable project scaffold, real browser-native execution proof, deterministic failure hardening, and a QA/verdict loop.

Do not claim that every conceivable framework or production business domain is fully implemented by the generated scaffold.

## Validation performed in this audit

- Full source-tree review of the uploaded project.
- WebMCP tool registry consistency check.
- Agent OS tool name uniqueness check.
- Agent demo tool-set consistency check.
- Production QA expected-tool contract consistency check.
- Modified TypeScript/TSX files passed TypeScript `transpileModule` syntax diagnostics.
- Search for TODO/FIXME implementation markers in product source found only the intentional generated-code review detector.
- Search for `any` type usage in `src` found none.
- Search for `eval`, `new Function`, and `dangerouslySetInnerHTML` found none.

A full dependency install / Vite production build could not be executed in the audit container because external npm registry DNS/network access was unavailable. The project itself should still be validated with the existing local commands before deployment:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm lint
```

Then perform the final real-world test in ChatGPT's in-app browser or WebMCP-enabled Chrome using `build_and_verify_system` on multiple fresh prompts.

## Final recommended judge story

PromptFlow is a WebMCP-native software architecture and execution environment for AI agents. A human describes intent; ChatGPT supplies semantic reasoning; WebMCP turns that reasoning into structured actions; PromptFlow validates and materializes the system; WebContainer proves the generated project actually runs; Judge Mode deliberately breaks, diagnoses, hardens, re-tests, and produces the final release verdict.
