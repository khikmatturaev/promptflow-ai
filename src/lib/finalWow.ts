import { auditArchitecture } from "./architectureAudit";
import { buildArchitecturePlan } from "./architectureIntent";
import { analyzeArchitectureIntelligence, buildArchitectureDNA } from "./architectureBrain";
import { buildHardeningOperations, runDigitalTwin } from "./digitalTwin";
import { analyzeImplementationIntelligence } from "./implementationIntelligence";
import { generateProjectFromArchitecture } from "./codeGeneration";
import { reviewGeneratedProject } from "./codeIntelligence";
import { executeProject } from "./executionEngine";
import { runProductionQA } from "./productionQA";
import { createProjectWorkspace } from "./projectWorkspace";
import { useCanvasStore } from "../store/useCanvasStore";
import type { ArchitectureEdge, ArchitectureNode } from "../types";
import type { FinalWowRun, WowStage, WowStageId } from "../types/finalWow";

const TARGET_USERS = 10_000_000;
const STAGE_ORDER: Array<{ id: WowStageId; label: string }> = [
    { id: "brief", label: "Brief" },
    { id: "reason", label: "Reason" },
    { id: "architect", label: "Architect" },
    { id: "break", label: "Break" },
    { id: "diagnose", label: "Diagnose" },
    { id: "heal", label: "Heal" },
    { id: "retest", label: "Re-test" },
    { id: "build", label: "Build" },
    { id: "execute", label: "Execute" },
    { id: "qa", label: "QA" },
    { id: "verdict", label: "Verdict" },
];

function makeStages(): WowStage[] {
    return STAGE_ORDER.map(({ id, label }) => ({
        id,
        label,
        status: "pending",
        detail: "Waiting",
        durationMs: 0,
    }));
}

function updateStage(stages: WowStage[], id: WowStageId, status: WowStage["status"], detail: string, durationMs: number): WowStage[] {
    return stages.map((stage) => stage.id === id ? { ...stage, status, detail, durationMs } : stage);
}

function survivability(report: ReturnType<typeof runDigitalTwin>): number {
    if (report.scenarios.length === 0) return 0;
    return Math.min(...report.scenarios.map((scenario) => scenario.survivability));
}

function scenarioSurvivability(
    report: ReturnType<typeof runDigitalTwin>,
    kind: "compute-failure" | "load-spike",
): number {
    return report.scenarios.find((scenario) => scenario.event.kind === kind)?.survivability
        ?? survivability(report);
}


async function readToolNames(): Promise<string[]> {
    const context = document.modelContext;
    if (!context?.getTools) return [];
    try {
        const tools = await context.getTools();
        return tools.map((tool) => tool.name);
    } catch {
        return [];
    }
}

export async function runFinalWowDemo(
    initialNodes: ArchitectureNode[],
    initialEdges: ArchitectureEdge[],
    targetUsers = TARGET_USERS,
    onStage?: (stage: WowStage) => void,
): Promise<FinalWowRun> {
    const startedAt = Date.now();
    const id = crypto.randomUUID();
    let stages = makeStages();
    let nodes = [...initialNodes];
    let edges = [...initialEdges];

    const mark = (stageId: WowStageId, status: WowStage["status"], detail: string, started: number) => {
        stages = updateStage(stages, stageId, status, detail, Date.now() - started);
        const stage = stages.find((item) => item.id === stageId);
        if (stage) onStage?.(stage);
    };

    if (nodes.length === 0) {
        const seed = buildArchitecturePlan("Build a production-ready TikTok-like platform for 10 million users with video uploads, recommendations, realtime messaging, authentication, CDN media storage, background processing, and analytics.");
        useCanvasStore.getState().applyTransform(seed.operations);
        const seeded = useCanvasStore.getState();
        nodes = seeded.nodes;
        edges = seeded.edges;
    }

    const briefStarted = Date.now();
    mark("brief", "running", "Reading the live architecture as the release candidate.", briefStarted);
    await Promise.resolve();
    mark("brief", "completed", `${nodes.length} components · ${edges.length} relationships`, briefStarted);

    const reasonStarted = Date.now();
    mark("reason", "running", "Scoring architecture quality across reliability, scale and resilience.", reasonStarted);
    const intelligence = analyzeArchitectureIntelligence(nodes, edges, targetUsers);
    mark("reason", "completed", `${intelligence.overallScore}/100 architecture intelligence`, reasonStarted);

    const architectStarted = Date.now();
    mark("architect", "running", "Locking the architecture fingerprint before the stress test.", architectStarted);
    const beforeAudit = auditArchitecture(nodes, edges);
    const beforeDNA = buildArchitectureDNA(nodes, edges);
    useCanvasStore.getState().createVersion("Judge Mode baseline", "Judge Baseline");
    mark("architect", "completed", `Baseline ${beforeAudit.score}/100 · ${beforeDNA.fingerprint}`, architectStarted);

    const breakStarted = Date.now();
    mark("break", "running", "Injecting severe traffic and compute failure into the digital twin.", breakStarted);
    const twinBefore = runDigitalTwin(nodes, edges, [
        { kind: "load-spike", label: `10M-user traffic spike`, targetUsers },
        { kind: "compute-failure", label: "Compute failure" },
    ], targetUsers);
    const injectedFailures = twinBefore.scenarios.filter((item) => item.event.kind !== "load-spike");
    const breakSignals = twinBefore.scenarios.flatMap((item) => [...item.failureModes, ...item.bottlenecks]);
    mark(
        "break",
        "completed",
        `Failure injected: ${injectedFailures.length} scenario${injectedFailures.length === 1 ? "" : "s"} · ${breakSignals.length} diagnostic signal${breakSignals.length === 1 ? "" : "s"} · ${survivability(twinBefore)}/100 survivability · ${twinBefore.singlePointsOfFailure.length} SPOFs`,
        breakStarted,
    );

    const diagnoseStarted = Date.now();
    mark("diagnose", "running", "Tracing the injected failure and its propagation through architecture boundaries.", diagnoseStarted);
    const diagnostics = twinBefore.scenarios.flatMap((scenario) => [
        scenario.event.label,
        ...scenario.bottlenecks,
        ...scenario.failureModes,
    ]);
    mark("diagnose", "completed", `${diagnostics.length} failure signal${diagnostics.length === 1 ? "" : "s"} traced`, diagnoseStarted);

    const healStarted = Date.now();
    mark("heal", "running", "Applying bounded, non-destructive hardening operations.", healStarted);
    const hardening = buildHardeningOperations(nodes, edges, targetUsers);
    if (hardening.length > 0) {
        useCanvasStore.getState().applyTransform(hardening);
        const current = useCanvasStore.getState();
        nodes = current.nodes;
        edges = current.edges;
    }
    mark("heal", "completed", `${hardening.length} hardening operations applied`, healStarted);

    const retestStarted = Date.now();
    mark("retest", "running", "Re-running the same failure scenario after hardening.", retestStarted);
    const twinAfter = runDigitalTwin(nodes, edges, [
        { kind: "load-spike", label: `10M-user traffic spike`, targetUsers },
        { kind: "compute-failure", label: "Compute failure" },
    ], targetUsers);
    const afterAudit = auditArchitecture(nodes, edges);
    // The Judge's BREAK/HEAL scenario is specifically a compute failure.
    // Do not collapse it with the independent load-spike scenario: doing so
    // can hide a real recovery behind an unrelated lower load score.
    const beforeFailureSurvivability = scenarioSurvivability(twinBefore, "compute-failure");
    const afterFailureSurvivability = scenarioSurvivability(twinAfter, "compute-failure");
    const recoveryDelta = afterFailureSurvivability - beforeFailureSurvivability;
    mark(
        "retest",
        "completed",
        `${beforeFailureSurvivability} → ${afterFailureSurvivability} compute-failure survivability (${recoveryDelta >= 0 ? "+" : ""}${recoveryDelta}) · ${beforeAudit.score} → ${afterAudit.score} score`,
        retestStarted,
    );

    const buildStarted = Date.now();
    mark("build", "running", "Generating implementation artifacts, contracts and a real browser workspace.", buildStarted);
    const implementation = analyzeImplementationIntelligence(nodes, edges);
    const project = generateProjectFromArchitecture(nodes, edges);
    const review = reviewGeneratedProject(project);
    useCanvasStore.getState().setImplementation(implementation);
    useCanvasStore.getState().setCodeGeneration(project);
    useCanvasStore.getState().setCodeReview(review);
    useCanvasStore.getState().setWorkspace(createProjectWorkspace(project));
    mark("build", "completed", `${project.artifacts.length} artifacts · ${implementation.readinessScore}/100 readiness · review ${review.score}/100`, buildStarted);

    const executeStarted = Date.now();
    mark("execute", "running", "Installing, testing, building and verifying the generated project in WebContainer.", executeStarted);
    const execution = await executeProject(project, {
        maxHealingAttempts: 2,
        installTimeoutMs: 120_000,
        commandTimeoutMs: 60_000,
        enableSelfHealing: true,
    });
    useCanvasStore.getState().setExecution(execution);
    mark(
        "execute",
        execution.status === "passed" ? "completed" : execution.status === "unsupported" ? "skipped" : "failed",
        execution.status === "passed"
            ? `Verified${execution.healingAttempts.length ? ` after ${execution.healingAttempts.length} self-heal cycle(s)` : ""}`
            : execution.diagnostics[0]
                ? `${execution.diagnostics[0].title}: ${execution.diagnostics[0].evidence.slice(0, 220)}`
                : execution.note ?? "Execution requires environment attention.",
        executeStarted,
    );

    const qaStarted = Date.now();
    mark("qa", "running", "Running the production release gate against the final candidate.", qaStarted);
    const names = await readToolNames();
    const qa = runProductionQA({
        nodes,
        edges,
        project: execution.artifacts.length ? { ...project, artifacts: execution.artifacts } : project,
        execution,
        codeReview: review,
        versioning: useCanvasStore.getState().versioning,
        webmcpToolNames: names,
        headers: {
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Permissions-Policy": "tools=(self)",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "strict-origin-when-cross-origin",
        },
    });
    useCanvasStore.getState().setProductionQA(qa);
    mark("qa", qa.status === "fail" ? "failed" : "completed", `${qa.score}/100 release gate · ${qa.blockers.length} blockers · ${qa.warnings.length} warnings`, qaStarted);

    const verdictStarted = Date.now();
    mark("verdict", "running", "Preparing the judge-facing before/after verdict.", verdictStarted);
    const scorecard = {
        before: beforeAudit.score,
        after: afterAudit.score,
        improvement: afterAudit.score - beforeAudit.score,
        survivabilityBefore: beforeFailureSurvivability,
        survivabilityAfter: afterFailureSurvivability,
        recoveryDelta,
        qaScore: qa.score,
    };
    const status = qa.status === "fail" ? "failed" : "completed";
    const headline = status === "completed"
        ? `Production candidate verified: ${scorecard.after}/100 architecture score, compute-failure survivability ${scorecard.survivabilityBefore} → ${scorecard.survivabilityAfter} (${scorecard.recoveryDelta >= 0 ? "+" : ""}${scorecard.recoveryDelta}), ${qa.score}/100 QA.`
        : `Candidate hardened: ${scorecard.after}/100 architecture score, but ${qa.blockers.length} release blocker(s) remain.`;
    mark("verdict", status === "completed" ? "completed" : "failed", headline, verdictStarted);

    return {
        id,
        startedAt,
        finishedAt: Date.now(),
        status,
        targetUsers,
        stages,
        scorecard,
        twinBefore,
        twinAfter,
        execution,
        qa,
        headline,
        pitch: [
            "PromptFlow is not a diagram generator: it turns intent into a living architecture.",
            "It deliberately breaks the architecture, traces the failure, hardens the system, and re-tests the same scenario.",
            "Then it generates a project, executes the real build loop, and runs a production release gate.",
        ],
    };
}
