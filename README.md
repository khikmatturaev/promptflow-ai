# PromptFlow.ai 2.0

## AI Software Architect — WebMCP Agent OS

**Describe it. Watch it architect. Build it.**

PromptFlow is an AI-native software architecture workspace. A human can describe a system in plain English, while an AI agent can operate the live canvas directly through WebMCP. The graph lives in Zustand, renders with React Flow, and is validated by deterministic architecture audit/intelligence before and after agent mutations.

## Product architecture

```text
Human brief
   ↓
AI agent semantic reasoning
   ↓
CORE 2 · WebMCP Agent OS
   ├─ architect_system
   ├─ analyze_architecture
   ├─ recommend_architecture
   ├─ simulate_architecture_scale
   ├─ apply_architecture_recommendations
   ├─ explain_architecture
   └─ generate_implementation_plan
   ↓
CORE 1 · Intent compiler fallback
   ↓
Validated architecture operations
   ↓
Zustand source of truth
   ↓
React Flow live canvas
   ↓
Audit / Fix / Scale / Verify
```

The important separation is intentional: **ChatGPT handles open-ended semantic reasoning; PromptFlow owns the structured execution contract, validation, state, deterministic intelligence, and visualization.** This makes arbitrary briefs possible without pretending that a browser-only keyword parser is a general-purpose LLM.

## CORE 3 — Architecture Intelligence

CORE 3 moves PromptFlow beyond a structural graph check into an architecture-review brain. It evaluates the live system across:

- **Reliability** — durable state, redundancy signals, recovery planning
- **Scalability** — traffic boundaries, horizontal compute, cache, async processing, read scaling
- **Performance** — cache, edge delivery, async offload, hot-path pressure
- **Security** — identity boundaries, ingress controls, transport/secrets signals
- **Resilience** — failure isolation, redundancy, async recovery boundaries
- **Observability** — logs, metrics, tracing, telemetry and explicit operational ownership
- **Stress Test** — deterministic what-if pressure model for a target user population
- **Architecture DNA** — archetype, structural fingerprint, traits, strengths, and bottlenecks

### Architecture Intelligence tools

20. `assess_architecture_intelligence` — full seven-dimension production-readiness assessment plus findings, recommendations, DNA, and optional stress test.
21. `stress_test_architecture` — non-destructive target-scale pressure simulation with estimated RPS, bottlenecks, failure modes, and projected score.
22. `get_architecture_dna` — return the architecture's structural fingerprint and system archetype.
23. `apply_intelligence_recommendations` — validate and apply selected safe recommendations, then re-assess the live graph.

The original 12 atomic tools remain available alongside the Agent OS surface. The total is now **47 WebMCP tools: 35 Agent OS + 12 atomic**.

The intelligence layer is deliberately transparent: its scores are **heuristic architecture-planning signals**, not penetration tests, production load tests, SLO guarantees, or capacity certifications. Real agents can combine these signals with domain knowledge and actual infrastructure telemetry.

### Architecture DNA

DNA is deterministic for the current graph. The fingerprint changes when component types or relationships change, allowing the agent to compare architecture shape across iterations without storing a separate backend.

### Stress testing

Stress tests are non-destructive. PromptFlow projects the existing deterministic scale operations into a temporary graph, compares current vs projected intelligence, and reports synthetic pressure. The model is intentionally disclosed in the result and must not be presented as a real benchmark.

## CORE 2 — WebMCP Agent OS

CORE 2 adds seven high-level WebMCP capabilities above the original atomic tool layer. A capable AI agent no longer needs dozens of add/connect calls for a complete system.

### High-level Agent OS tools

1. `architect_system` — primary orchestration tool. Accepts the full user brief and, optionally, an agent-authored semantic component/connection plan. PromptFlow validates the plan, applies it, scales it when justified, repairs deterministic structural findings, lays it out, and verifies the final graph.
2. `analyze_architecture` — read-only architecture metrics + structural audit + represented capabilities.
3. `recommend_architecture` — prioritized architecture review recommendations, optionally informed by a future scale target.
4. `simulate_architecture_scale` — non-destructive “what if?” scale simulation with exact projected operations and before/after metrics/audits.
5. `apply_architecture_recommendations` — apply deterministic structural fixes and/or scale patterns in one round-trip, then verify.
6. `explain_architecture` — explain the whole system or a selected component with upstream/downstream dependencies.
7. `generate_implementation_plan` — convert the live graph into ordered implementation phases and recommended first code targets.

### Atomic execution tools

8. `add_architecture_node`
9. `connect_architecture_nodes`
10. `update_architecture_node`
11. `remove_architecture_node`
12. `clear_architecture_canvas`
13. `generate_node_boilerplate`
14. `get_architecture_snapshot`
15. `audit_architecture`
16. `auto_layout_architecture`
17. `transform_architecture`
18. `scale_architecture`
19. `fix_architecture`

The atomic tools remain available for precise follow-up edits. For complete product briefs, agents should prefer `architect_system`. For arbitrary model-planned multi-step edits, `transform_architecture` remains the low-level batch primitive.

## Why arbitrary briefs now work professionally

CORE 1 remains a very fast deterministic browser fallback. CORE 2 removes its semantic ceiling by allowing the real AI agent to submit its own structured architecture plan in the `architect_system` call:

```text
User: “Design a TikTok-like platform for 10M users…”
                     ↓
ChatGPT understands the domain semantically
                     ↓
architect_system {
  request,
  targetUsers,
  components: [...],
  connections: [...]
}
                     ↓
PromptFlow validates every id/type/relationship
                     ↓
Build → Scale → Fix → Layout → Verify
                     ↓
Live architecture canvas
```

If the agent does not provide a component plan, `architect_system` falls back to CORE 1’s local `Intent → Architecture` compiler, so the tool still has a deterministic browser-only path.

## Current capabilities

- Arbitrary AI-agent-authored architecture plans through structured WebMCP schemas
- Single-round-trip complete-system orchestration
- Typed architecture nodes and directed relationships
- React Flow live architecture canvas
- Zustand as the single architecture source of truth
- Deterministic structural architecture audit
- Seven-dimensional Architecture Intelligence assessment
- Reliability, scalability, performance, security, resilience, and observability review
- Non-destructive heuristic stress testing and Architecture DNA fingerprinting
- Deterministic auto-fix for safe structural findings
- Gateway/cache/queue/worker/read-replica scale patterns
- Non-destructive scale simulation
- Architecture review recommendations
- Whole-system and per-component explanations
- Ordered implementation planning
- Batch `transform_architecture` for precise AI follow-up edits
- Real WebMCP execution telemetry with duration/failure state
- 47 total WebMCP tools: 35 Agent OS + 12 atomic tools
- No backend/API dependency required for the MVP execution layer

## Real Agent OS demo

1. Run PromptFlow.
2. Open the page in ChatGPT's built-in browser and allow site access.
3. Open **Agent** / **WebMCP Agent OS**.
4. Confirm the panel reports **7/7 OS** tools.
5. Use the demo prompt:

> Use PromptFlow's high-level Agent OS tools. Design a production-ready TikTok-like platform for 10 million users with video uploads, recommendations, realtime messaging, authentication, CDN/media storage, background processing, and analytics. Build it on the canvas, analyze it, recommend improvements, simulate 10M-user scale, apply the useful recommendations, then explain the final architecture.

The activity feed is driven only by actual WebMCP executions. PromptFlow does not fabricate agent activity.

## CORE 1 — local intent fallback

The first-screen **Architect this** flow remains available and dependency-free:

```text
Brief → Intent → Architecture → Audit → Fix → Scale → Verify → Code
```

CORE 1 detects common domains, technologies, explicit requirements, and meaningful user/traffic scale. Scale parsing now ignores unrelated numbers unless they are attached to a scale suffix (`k`, `million`, etc.) or a traffic/user noun.

## CORE 9 — Architecture Evolution / Versioning / Migration Intelligence

CORE 9 makes the architecture graph evolvable instead of treating every canvas mutation as an isolated edit.

### Version checkpoints

PromptFlow can create immutable local architecture checkpoints containing:

- full node and dependency snapshots
- deterministic architecture fingerprint
- graph size
- audit score at checkpoint time
- Architecture DNA fingerprint
- human-readable release name and change message

History is bounded to the latest 50 checkpoints and remains browser-local. Restoring a checkpoint invalidates downstream derived artifacts so stale code, execution, simulation, or review results cannot be mistaken for the restored architecture.

### Architecture diff

Version comparison classifies topology and component changes into:

- **Breaking** — removed components/dependencies and high-risk API/database/auth/payment changes
- **Significant** — implementation metadata or structural changes
- **Non-breaking** — additive components and dependencies

The diff includes exact changed component/dependency identities, fingerprints, counts, and a deterministic risk score.

### Migration intelligence

A version diff can be converted into an ordered migration plan covering:

```text
Database compatibility
        ↓
Data backfill / verification
        ↓
API & event contract compatibility
        ↓
Infrastructure provisioning
        ↓
Controlled application rollout
        ↓
Rollback readiness
```

The plan explicitly reports data-migration requirements, API compatibility requirements, downtime risk, preflight checks, and rollback actions. It is a planning model, not a guarantee of zero-downtime deployment.

### Versioning Agent OS

The Agent OS now includes:

- `create_architecture_version`
- `list_architecture_versions`
- `compare_architecture_versions`
- `plan_architecture_migration`
- `restore_architecture_version`
- `clear_version_analysis`

This brings the total to **47 WebMCP tools: 35 Agent OS + 12 atomic**.

## Local development

```bash
pnpm install
pnpm dev
```

Release gate:

```bash
pnpm build
pnpm lint
```

## WebMCP deployment requirements

Vite dev/preview sends:

```text
Origin-Agent-Cluster: ?1
Permissions-Policy: tools=(self)
```

Production hosting must preserve equivalent headers or `document.modelContext` may be unavailable.

## QA principles

- No simulated WebMCP activity.
- Agent-authored plans are validated before destructive canvas replacement.
- High-level tools use the same Zustand state and deterministic intelligence as the UI/atomic tools.
- Read-only Agent OS tools do not mutate the live graph.
- Scale simulation is projected in memory and does not touch canvas state.
- Tool input lengths/counts are bounded to protect demo reliability.
- The architecture score remains a **structural preflight score**, not a security, compliance, cost, or availability certification.
- Source package does not claim build/lint PASS in environments where project dependencies are unavailable; `pnpm build` and `pnpm lint` remain the authoritative release gate.

## CORE 5 — Implementation Intelligence

CORE 5 turns the architecture graph into an implementation contract rather than stopping at a diagram or review score.

### What it produces

- **Implementation readiness** score and maturity
- Component-by-component implementation map
- Suggested source files and project structure
- Dependency and interface map
- HTTP, event, data, and external integration contracts
- Environment variable and secret contract
- Ordered delivery phases with exit criteria
- Unit, integration, contract, and resilience test targets
- Implementation risks and mitigations
- Prioritized first files to build
- Architecture DNA fingerprint carried into the implementation blueprint

The output is deliberately planning metadata. PromptFlow does not claim that suggested paths are the only valid project structure, and it does not fabricate production source code.

### Implementation Agent OS

The Agent OS now exposes 21 high-level tools plus the original 12 atomic tools, for **33 WebMCP tools total**.

New implementation tools:

- `assess_implementation_readiness` — evaluate whether the live graph is ready to enter implementation.
- `generate_project_blueprint` — produce the complete project/file/delivery blueprint, including environment and test strategy.
- `generate_implementation_contracts` — turn every represented relationship into an explicit implementation boundary.

A capable agent can now run:

```text
Architect → Analyze → Stress → Digital Twin → Harden →
Assess implementation → Generate blueprint → Generate contracts → Build
```

This keeps the graph as the source of truth while giving the agent enough structured information to move from architecture decisions toward actual engineering work.

### Implementation safety

All Core 5 tools are read-only. They never mutate the canvas. Existing `generate_node_boilerplate` remains the explicit code-artifact mutation primitive, so generated planning metadata cannot silently overwrite implementation work.

## CORE 4 — Digital Twin / Failure & Load Simulation

PromptFlow now includes a non-destructive Digital Twin layer above the live architecture graph.

### What it models

- Load spikes and sustained traffic pressure
- Database, compute, cache, queue, and external dependency failures
- Regional outage scenarios
- Failure propagation through dependent components
- Single points of failure
- Critical paths
- Survivability and projected architecture score
- Recovery strategy and recovery class
- Post-simulation hardening priorities

The Digital Twin is intentionally a **heuristic planning model**, not a production benchmark, capacity guarantee, chaos-engineering system, or security certification.

### WebMCP Agent OS

The Agent OS now exposes 21 high-level tools plus the existing 12 atomic tools, for **30 WebMCP tools total**.

New Digital Twin tools:

- `run_digital_twin`
- `simulate_failure`
- `simulate_load`
- `apply_digital_twin_hardening`

A real browser agent can now run:

```text
Architect → Analyze → Stress → Digital Twin → Failure injection →
Recovery analysis → Harden → Re-validate
```

without manually manipulating the canvas.

### Safety model

Read-only simulation tools never mutate the architecture. Hardening is a separate destructive tool, validates its complete operation batch before applying it, and re-runs the simulation and structural audit afterward.

### Local UX

The canvas exposes a **Simulate** action for a quick 1M-user load scenario. Detailed results appear in the Digital Twin panel while the live graph remains unchanged until an explicit hardening operation is requested.

## CORE 6 — Real Project / Code Generation & Execution Intelligence

CORE 6 turns the architecture and implementation blueprint into a bounded, inspectable project scaffold.

### Project generation

`generate_project_code` produces an in-browser artifact workspace containing:

- `package.json`
- `tsconfig.json`
- `.env.example`
- framework-aware entrypoints
- component source scaffolds
- executable test scaffolds
- architecture documentation
- implementation contracts

Existing node boilerplate is reused when present; otherwise PromptFlow creates deterministic scaffolds from the architecture responsibility and boundaries.

### Execution intelligence

`validate_generated_project` and `run_project_execution_preflight` check:

- artifact path integrity
- project manifest
- executable source surface
- test surface
- scaffold bounds
- build/run readiness
- install/test/build/dev commands
- remaining engineering review requirements

This is intentionally a **static browser-side execution preflight**. PromptFlow does not execute arbitrary generated code inside the host page.

### Agent OS

CORE 6 adds:

- `generate_project_code`
- `validate_generated_project`
- `run_project_execution_preflight`

The Agent OS now exposes **21 high-level tools + 12 atomic tools = 33 WebMCP tools**.

### Safety boundary

Architecture mutation remains explicit. Code generation creates a separate artifact workspace and does not silently modify the live graph. Generated source is a scaffold, not a claim of production-complete code.
\n## CORE 7 — Production Code Intelligence + Build Workspace\n\nCORE 7 closes the architecture-to-artifact loop without pretending that browser-side code generation is a production CI runner.\n\n### Production code intelligence\n\nGenerated project artifacts can be reviewed for:\n\n- manifest and entrypoint integrity\n- unfinished implementation markers\n- possible hardcoded credentials\n- environment configuration contract\n- test scaffolding coverage\n- architecture contract documentation\n- production-readiness score and prioritized next actions\n\n### Real build workspace\n\nThe generated project is materialized as an inspectable in-browser workspace. Engineers can browse every generated file, inspect source content, review the execution preflight, and export the complete workspace as a local ZIP. The export includes `promptflow/workspace.json` with project identity, fingerprint, file count, and execution metadata. No source is uploaded to a PromptFlow server.\n\n### Final hackathon orchestration\n\nThe final demo can run the complete deterministic showcase without mutating the architecture:\n\n`text\nArchitecture → Intelligence → Load → Digital Twin →\nImplementation → Code Generation → Execution Preflight → DNA\n`\n\nThe real AI agent can also call `run_final_hackathon_demo` through WebMCP, while the UI provides a local showcase control. This makes the demo repeatable and keeps every reported stage tied to actual PromptFlow state.\n\n### CORE 7 Agent OS additions\n\n- `review_generated_project` — production-code heuristic review.\n- `prepare_build_workspace` — materialize the current generated project for inspection.\n- `export_project_artifacts` — create a local ZIP artifact without server upload.\n- `run_final_hackathon_demo` — orchestrate the complete end-to-end showcase.\n\nAt the CORE 7 checkpoint, the WebMCP surface was **37 tools: 25 Agent OS + 12 atomic**; CORE 8 and CORE 9 extend that surface further.\n\n> Browser-side execution remains intentionally safe: PromptFlow can validate run readiness and provide commands, but it does not execute arbitrary generated code inside the host page.\n

## CORE 8 — Real Execution + Self-Healing Build Loop

CORE 8 closes the remaining gap between generated artifacts and verified execution.

### Real browser-native execution

PromptFlow now uses **WebContainer** as an isolated in-browser Node.js runtime. The execution loop can:

`Generate → Mount → Install → Test → Build → Diagnose → Heal → Re-run → Verify`

The host page never executes generated project code directly. Generated files are mounted into the isolated runtime and commands run inside that runtime.

### Self-healing loop

When a bounded execution attempt fails, PromptFlow classifies the failure using deterministic diagnostics and applies only high-confidence, targeted patches. The retry budget is bounded to prevent runaway loops.

Supported deterministic repair classes include:

- missing React / React DOM runtime declarations
- missing React / React DOM TypeScript declarations
- broken generated test import boundaries
- dependency-network failures are detected but **never** auto-repaired

Every healing attempt records the diagnostic, patch, confidence and verification result.

### Execution state

The UI and WebMCP expose:

- real install/test/build status
- command output
- failure diagnostics and evidence
- self-healing attempts
- final verified artifact set
- execution capability state

Python projects remain static-preflight only in CORE 8; Node.js and React/Vite projects use the real WebContainer execution path.

### CORE 8 Agent OS additions

- `run_project_execution_loop` — run install → test → build with bounded self-healing.
- `diagnose_execution_failure` — expose the latest execution diagnosis without mutating the project.

The current WebMCP surface is **47 tools: 35 Agent OS + 12 atomic**.

### Runtime requirements

WebContainer requires a cross-origin isolated, secure context. PromptFlow now declares the required COOP/COEP headers in Vite and Vercel configuration. The first real execution may take longer because the browser runtime must boot and dependencies must be installed.

> WebContainer is a browser-native Node.js runtime provided by StackBlitz. PromptFlow uses it to execute generated projects without a PromptFlow backend or host-page code execution.

## FINAL — Production QA, Security, Performance & Hackathon Hardening

The final release gate adds a deterministic `run_production_qa` Agent OS tool and an in-product Production QA panel. It validates:

- architecture graph integrity and bounded graph size
- generated artifact path safety and workspace size
- browser isolation / WebMCP deployment headers
- complete WebMCP registry coverage
- generated project readiness and production-code review state
- real WebContainer execution status
- architecture version/checkpoint integrity

The final WebMCP surface is **47 tools: 35 Agent OS + 12 atomic**.

Production QA is intentionally a release gate, not a security certification. Heuristic code review and browser-side checks should be complemented by the project's real CI, dependency scanning, secret scanning, and deployment controls before production use.

## FINAL WOW PASS — Judge Mode

PromptFlow includes a judge-facing one-click orchestration layer that turns the complete architecture lifecycle into a single cinematic flow:

```text
Brief → Reason → Architect → Break → Diagnose → Heal → Re-test
      → Build → Execute → QA → Production Verdict
```

Judge Mode deliberately injects severe traffic and compute failure, identifies the resulting bottlenecks, applies bounded hardening operations, re-runs the same digital-twin scenario, generates a project workspace, executes the real browser sandbox build loop with bounded self-healing, and finishes with the production QA gate. The UI exposes live stage state plus a before/after scorecard so the reasoning is visible rather than hidden behind a final diagram.

The final WebMCP surface is **47 tools: 35 Agent OS + 12 atomic**, including `run_judge_mode`.
