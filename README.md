# PromptFlow.ai

## AI Software Architect — WebMCP Agent OS

**Describe it. Watch it architect. Build it.**

PromptFlow.ai is an AI-native software architecture workspace where a human describes a system in natural language and an AI agent operates the live architecture canvas through WebMCP.

PromptFlow treats architecture as a **living system**, not a static diagram. The agent can create and modify an architecture, analyze its structure, simulate scale and failure, harden the design, generate an implementation workspace, execute the generated Node/React project in a browser-native WebContainer, and finish with Production QA and a release verdict.

---

## Why PromptFlow

Traditional architecture tools are primarily visual editors. PromptFlow adds an agent-native execution and verification loop:

```text
Human brief
    ↓
ChatGPT / calling AI agent
    ↓ semantic reasoning + tool choice
WebMCP
    ↓ structured tool call
PromptFlow deterministic architecture engine
    ↓ validated graph
Architecture Intelligence
    ↓ analysis / scale / failure simulation
Break → Diagnose → Heal → Re-test
    ↓
Project generation
    ↓
WebContainer
    ↓ install → test → build → runtime verification
Production QA
    ↓
Final verdict
```

The separation is intentional:

- **The calling AI agent owns open-ended semantic reasoning and tool selection.**
- **PromptFlow owns structured execution, validation, application state, deterministic architecture intelligence, code generation, browser-native execution, and verification.**

PromptFlow therefore does not need to embed a second model API to make the WebMCP workflow work.

---

# WebMCP Agent OS

PromptFlow exposes **49 WebMCP tools**:

- **37 Agent OS tools** for high-level workflows
- **12 atomic tools** for precise architecture mutations

The browser agent can discover these capabilities from the live page and invoke them directly.

### Primary high-level workflow

For a complete natural-language brief, the recommended tool is:

`build_and_verify_system`

The calling agent can infer a semantic component/connection plan and submit it as structured input. PromptFlow validates the plan before mutating the live architecture, then runs the architecture-to-proof pipeline.

`get_promptflow_capabilities` can be used when an agent first needs to understand the intended division of responsibility and recommended workflow.

### Agent OS capabilities

The 37 high-level tools cover:

**Architecture**

- `architect_system`
- `analyze_architecture`
- `recommend_architecture`
- `simulate_architecture_scale`
- `apply_architecture_recommendations`
- `explain_architecture`
- `generate_implementation_plan`

**Architecture Intelligence**

- `assess_architecture_intelligence`
- `stress_test_architecture`
- `get_architecture_dna`
- `apply_intelligence_recommendations`

**Digital Twin / Failure Simulation**

- `run_digital_twin`
- `simulate_failure`
- `simulate_load`
- `apply_digital_twin_hardening`

**Implementation Intelligence**

- `assess_implementation_readiness`
- `generate_project_blueprint`
- `generate_implementation_contracts`

**Project Generation / Execution**

- `generate_project_code`
- `validate_generated_project`
- `run_project_execution_preflight`
- `review_generated_project`
- `prepare_build_workspace`
- `export_project_artifacts`
- `run_final_hackathon_demo`
- `run_project_execution_loop`
- `diagnose_execution_failure`

**Architecture Versioning**

- `create_architecture_version`
- `list_architecture_versions`
- `compare_architecture_versions`
- `plan_architecture_migration`
- `restore_architecture_version`
- `clear_version_analysis`

**Release / Demo**

- `run_production_qa`
- `run_judge_mode`
- `get_promptflow_capabilities`
- `build_and_verify_system`

The original atomic tools remain available for precise follow-up operations:

- `add_architecture_node`
- `connect_architecture_nodes`
- `update_architecture_node`
- `remove_architecture_node`
- `clear_architecture_canvas`
- `generate_node_boilerplate`
- `get_architecture_snapshot`
- `audit_architecture`
- `auto_layout_architecture`
- `transform_architecture`
- `scale_architecture`
- `fix_architecture`

---

# One-call WebMCP demo

Open the deployed PromptFlow URL in ChatGPT's in-app browser or in a WebMCP-enabled Chrome environment.

Use:

> Use PromptFlow's `build_and_verify_system` WebMCP tool to design and verify a production-ready marketplace for 1 million users with authentication, payments, realtime chat, object storage, background jobs, observability, and a PostgreSQL data layer. Infer a complete component and connection plan. Then summarize the architecture, execution result, QA score, and final verdict.

The intended result is:

```text
Agent semantic reasoning
        ↓
build_and_verify_system
        ↓
validated architecture
        ↓
Judge Mode
        ↓
Break → Diagnose → Heal → Re-test
        ↓
Generate → Execute → QA
        ↓
Production verdict
```

The Agent activity feed is driven by real WebMCP execution. PromptFlow does not fabricate agent activity.

---

# Judge Mode

Judge Mode provides the main end-to-end demonstration:

```text
Brief
  ↓
Reason
  ↓
Architect
  ↓
Break
  ↓
Diagnose
  ↓
Heal
  ↓
Re-test
  ↓
Build
  ↓
Execute
  ↓
QA
  ↓
Verdict
```

The demo deliberately introduces traffic and compute failure into the architecture model, identifies the resulting weaknesses, applies bounded hardening, and re-tests the same scenario.

It then generates a project workspace, executes the generated Node/React project inside WebContainer, and finishes with the Production QA release gate.

The UI exposes stage state and a before/after scorecard so the reasoning and recovery are visible.

---

# Architecture Intelligence

PromptFlow evaluates the live architecture across seven planning dimensions:

- **Reliability**
- **Scalability**
- **Performance**
- **Security**
- **Resilience**
- **Observability**
- **Stress Test**

It also provides **Architecture DNA**:

- system archetype
- deterministic structural fingerprint
- traits
- strengths
- bottlenecks

Architecture DNA is deterministic for the current graph. Changes to component types or relationships can therefore be compared across architecture iterations.

### Important limitation

Architecture Intelligence scores are **heuristic planning signals**. They are not:

- penetration tests
- production load tests
- SLO guarantees
- capacity certifications
- compliance certifications
- security certifications

---

# Digital Twin

The Digital Twin layer provides non-destructive failure and load simulation.

It models:

- load spikes and sustained traffic pressure
- database, compute, cache, queue, and external dependency failures
- regional outage scenarios
- failure propagation
- single points of failure
- critical paths
- survivability
- recovery strategy
- post-simulation hardening priorities

Simulation is performed against a projected graph and does not mutate the live architecture.

Hardening is a separate explicit operation. Safe operation batches are validated before application, followed by re-analysis.

Digital Twin results are heuristic planning models, not production benchmarks or capacity guarantees.

---

# Implementation Intelligence

PromptFlow can convert the architecture graph into an implementation contract.

It produces:

- implementation readiness
- component implementation maps
- suggested project files
- dependency and interface maps
- HTTP, event, data, and external integration contracts
- environment variable and secret contracts
- ordered delivery phases
- exit criteria
- unit, integration, contract, and resilience test targets
- implementation risks and mitigations
- prioritized first files to build
- Architecture DNA carried into the implementation blueprint

These tools are read-only and do not silently overwrite implementation work.

---

# Project Generation and Execution

PromptFlow generates a bounded, inspectable project workspace containing items such as:

- `package.json`
- `tsconfig.json`
- `.env.example`
- framework-aware entrypoints
- component source scaffolds
- executable test scaffolds
- architecture documentation
- implementation contracts

Generated source is a scaffold and implementation starting point; PromptFlow does not claim that generated source is automatically production-complete.

## Real browser-native execution

Node.js and React/Vite projects can run through WebContainer:

```text
Generate
   ↓
Mount
   ↓
Install
   ↓
Test
   ↓
Build
   ↓
Diagnose
   ↓
Heal (bounded)
   ↓
Re-run
   ↓
Verify
```

The generated project runs inside the isolated WebContainer runtime. The host page does not execute generated source directly.

Execution exposes:

- install/test/build status
- command output
- diagnostics and evidence
- bounded self-healing attempts
- final artifact verification
- execution capability state

Dependency-network failures are detected but are not automatically repaired.

Python projects remain static-preflight only.

---

# Production QA

The final `run_production_qa` release gate validates:

- architecture graph integrity
- generated artifact path safety and workspace bounds
- browser isolation / WebMCP deployment headers
- WebMCP registry coverage
- generated project readiness
- production-code review state
- real WebContainer execution status
- architecture version/checkpoint integrity

Production QA is a release gate, not a security certification. Real deployments should still use normal CI/CD, dependency scanning, secret scanning, security testing, observability, and infrastructure controls.

---

# Architecture Versioning

PromptFlow can create browser-local architecture checkpoints containing:

- node and dependency snapshots
- architecture fingerprint
- graph size
- audit score
- Architecture DNA
- release name
- change message

History is bounded to the latest 50 checkpoints.

Version comparison classifies changes as:

- **Breaking**
- **Significant**
- **Non-breaking**

Migration intelligence produces an ordered planning model:

```text
Database compatibility
        ↓
Data backfill / verification
        ↓
API & event contract compatibility
        ↓
Infrastructure provisioning
        ↓
Controlled rollout
        ↓
Rollback readiness
```

This is a planning model, not a zero-downtime guarantee.

---

# CORE 1 — Local Intent Fallback

PromptFlow also retains a dependency-free local architecture compiler:

```text
Brief
  ↓
Intent
  ↓
Architecture
  ↓
Audit
  ↓
Fix
  ↓
Scale
  ↓
Verify
  ↓
Code
```

This fallback recognizes common domains, technologies, explicit requirements, and meaningful scale targets.

For arbitrary domain reasoning, the WebMCP agent path is preferred because the calling AI agent provides the semantic interpretation.

---

# Technical Architecture

```text
React
 ├─ React Flow
 ├─ Zustand
 └─ WebMCP UI
       │
       ▼
WebMCP Registry
       │
       ├─ 37 Agent OS tools
       └─ 12 atomic tools
       │
       ▼
Deterministic Architecture Engine
       ├─ Architecture Audit
       ├─ Architecture Intelligence
       ├─ Digital Twin
       ├─ Implementation Intelligence
       ├─ Code Generation
       ├─ Execution Engine
       └─ Production QA
       │
       ▼
WebContainer
       │
       ▼
Judge Mode / Final Verdict
```

The architecture graph is stored in Zustand as the live source of truth and rendered with React Flow.

The WebMCP layer is browser-native and does not require a PromptFlow backend for the MVP execution flow.

---

# Safety and execution boundaries

PromptFlow intentionally keeps clear boundaries between agent reasoning and deterministic execution.

- Agent-authored architecture plans are validated before destructive canvas replacement.
- Read-only tools do not mutate the live graph.
- Simulation tools operate non-destructively.
- Hardening is an explicit mutation.
- Code generation uses a separate artifact workspace.
- Generated source is never executed directly by the host page.
- WebContainer execution is bounded and isolated.
- Self-healing uses deterministic, high-confidence repair classes only.
- Dependency-network failures are never auto-repaired.
- Tool inputs and operation counts are bounded for browser/demo reliability.
- Reported architecture scores are clearly presented as heuristic signals.

---

# Local development

Requirements:

- Node.js
- pnpm

Install dependencies:

```bash
pnpm install
```

Start development:

```bash
pnpm dev
```

Release gate:

```bash
pnpm build
pnpm lint
```

`pnpm build` and `pnpm lint` are the authoritative release checks.

---

# WebMCP and production deployment

WebMCP and WebContainer require a secure, cross-origin-isolated document.

The production host must preserve:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Origin-Agent-Cluster: ?1
Permissions-Policy: tools=(self)
```

For Netlify, the repository includes `netlify.toml` with the production build and header contract. A Netlify deployment should serve the headers on the deployed document before WebContainer execution is expected to work.

After deployment, verify in the browser console:

```js
window.crossOriginIsolated;
```

Expected:

```text
true
```

You can also inspect the document response headers in DevTools → Network.

If `crossOriginIsolated` is `false`, WebContainer execution should be treated as unavailable until the deployment headers are corrected.

---

# WebMCP testing

For local WebMCP testing, enable WebMCP testing support in a compatible Chrome build and relaunch the browser.

Recommended agent test flow:

1. Open PromptFlow.
2. Open the WebMCP Model Context Tool Inspector.
3. Confirm that the PromptFlow tool surface is discovered.
4. Ask the agent to use `build_and_verify_system`.
5. Observe the WebMCP execution trace.
6. Observe the live architecture canvas.
7. Observe Judge Mode.
8. Verify Build / Execute / QA.
9. Inspect the final production verdict.

A representative request:

> Use PromptFlow's `build_and_verify_system` WebMCP tool to design a production-ready order processing platform for 10 million users with authentication, payments, PostgreSQL, Redis, queues, background workers, webhooks, realtime notifications, and high resilience. Infer a complete component and connection plan. Then summarize the architecture, execution result, QA score, and final verdict.

---

# WebMCP Challenge submission

PromptFlow was meaningfully extended with WebMCP Agent OS capabilities for the WebMCP Challenge.

The WebMCP-specific extension includes:

- WebMCP tool registration and discovery
- 49 browser-exposed tools
- high-level Agent OS orchestration
- agent-authored structured architecture plans
- `build_and_verify_system`
- Judge Mode integration
- deterministic architecture validation
- failure injection, diagnosis, and hardening
- real browser-native WebContainer execution
- Production QA and final release verdict
- production cross-origin-isolation deployment configuration

The core value of the WebMCP integration is that an AI agent can reason about a user's request and then operate PromptFlow through explicit, structured browser tools rather than relying on fragile UI automation.

---

# Live product

**Production:** https://promptflow-webmcp.netlify.app/

Open the production application in a WebMCP-enabled environment to experience the complete agent-to-architecture workflow.

---

# License

PromptFlow.ai is released under the **MIT License**. See [`LICENSE`](LICENSE).
