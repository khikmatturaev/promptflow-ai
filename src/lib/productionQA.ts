import type { ArchitectureNode } from "../types";
import type { ProductionQAInput, ProductionQACheck, ProductionQAReport, ProductionQAStatus } from "../types/productionQA";

const EXPECTED_AGENT_OS_TOOLS = [
    "architect_system",
    "analyze_architecture",
    "recommend_architecture",
    "simulate_architecture_scale",
    "apply_architecture_recommendations",
    "explain_architecture",
    "generate_implementation_plan",
    "assess_architecture_intelligence",
    "stress_test_architecture",
    "get_architecture_dna",
    "apply_intelligence_recommendations",
    "run_digital_twin",
    "simulate_failure",
    "simulate_load",
    "apply_digital_twin_hardening",
    "assess_implementation_readiness",
    "generate_project_blueprint",
    "generate_implementation_contracts",
    "generate_project_code",
    "validate_generated_project",
    "run_project_execution_preflight",
    "review_generated_project",
    "prepare_build_workspace",
    "export_project_artifacts",
    "run_final_hackathon_demo",
    "run_project_execution_loop",
    "diagnose_execution_failure",
    "create_architecture_version",
    "list_architecture_versions",
    "compare_architecture_versions",
    "plan_architecture_migration",
    "restore_architecture_version",
    "clear_version_analysis",
    "run_production_qa",
    "run_judge_mode",
    "get_promptflow_capabilities",
    "build_and_verify_system",
] as const;

const EXPECTED_TOTAL_TOOLS = 49;
const MAX_ARTIFACT_BYTES = 2_000_000;
const MAX_GRAPH_NODES = 120;
const MAX_GRAPH_CONNECTIONS = 300;

function check(
    id: string,
    category: ProductionQACheck["category"],
    status: ProductionQAStatus,
    title: string,
    message: string,
    evidence?: string,
): ProductionQACheck {
    return { id, category, status, title, message, ...(evidence ? { evidence } : {}) };
}

function bytes(text: string): number {
    return new TextEncoder().encode(text).byteLength;
}

function isSafeArtifactPath(path: string): boolean {
    if (!path || path.startsWith("/") || path.includes("\\") || path.split("/").some((part) => part === "..")) {
        return false;
    }
    return !/^[A-Za-z]:/.test(path);
}

function isValidNode(node: ArchitectureNode): boolean {
    return Boolean(
        node.id.trim()
        && node.data.label.trim()
        && node.data.type
        && Number.isFinite(node.position.x)
        && Number.isFinite(node.position.y),
    );
}

function headerValue(headers: Readonly<Record<string, string>>, name: string): string | undefined {
    const target = name.toLowerCase();
    const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === target);
    return key ? headers[key] : undefined;
}

function uniqueCount(values: readonly string[]): number {
    return new Set(values).size;
}

function finalStatus(checks: ProductionQACheck[]): ProductionQAStatus {
    if (checks.some((item) => item.status === "fail")) return "fail";
    if (checks.some((item) => item.status === "warning")) return "warning";
    return "pass";
}

export function runProductionQA(input: ProductionQAInput): ProductionQAReport {
    const checks: ProductionQACheck[] = [];
    const blockers: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    const project = input.project ?? null;
    const execution = input.execution ?? null;
    const codeReview = input.codeReview ?? null;
    const versioning = input.versioning;
    const toolNames = input.webmcpToolNames ?? [];
    const headers = input.headers ?? {};
    const artifactBytes = project?.artifacts.reduce((sum, artifact) => sum + bytes(artifact.content), 0) ?? 0;

    const nodeIds = input.nodes.map((node) => node.id);
    const duplicateNodeIds = nodeIds.filter((id, index) => nodeIds.indexOf(id) !== index);
    const nodeSet = new Set(nodeIds);
    const danglingEdges = input.edges.filter((edge) => !nodeSet.has(edge.source) || !nodeSet.has(edge.target));
    const duplicateEdges = input.edges.filter((edge, index) =>
        input.edges.findIndex((candidate) => candidate.source === edge.source && candidate.target === edge.target) !== index,
    );

    if (input.nodes.length <= MAX_GRAPH_NODES && input.edges.length <= MAX_GRAPH_CONNECTIONS) {
        checks.push(check("graph-bounds", "performance", "pass", "Graph size is bounded", `${input.nodes.length} nodes and ${input.edges.length} connections are within the interactive budget.`));
    } else {
        checks.push(check("graph-bounds", "performance", "warning", "Large graph detected", `The graph has ${input.nodes.length} nodes and ${input.edges.length} connections; interactive rendering may degrade.`));
        warnings.push("Keep the live canvas below the recommended graph budget or introduce aggregation for very large systems.");
    }

    if (duplicateNodeIds.length === 0 && danglingEdges.length === 0 && duplicateEdges.length === 0 && input.nodes.every(isValidNode)) {
        checks.push(check("graph-integrity", "architecture", "pass", "Architecture graph integrity", "Node identities, positions, and connection references are consistent."));
    } else {
        const evidence = [
            duplicateNodeIds.length ? `${uniqueCount(duplicateNodeIds)} duplicate node IDs` : "",
            danglingEdges.length ? `${danglingEdges.length} dangling connections` : "",
            duplicateEdges.length ? `${duplicateEdges.length} duplicate connections` : "",
            input.nodes.some((node) => !isValidNode(node)) ? "invalid node data or coordinates" : "",
        ].filter(Boolean).join("; ");
        checks.push(check("graph-integrity", "architecture", "fail", "Architecture graph integrity", "The live architecture contains structural inconsistencies that can invalidate downstream analysis.", evidence));
        blockers.push("Repair architecture graph integrity before release.");
    }

    const safePaths = project ? project.artifacts.every((artifact) => isSafeArtifactPath(artifact.path)) : true;
    if (safePaths) {
        checks.push(check("artifact-path-safety", "security", "pass", "Artifact path safety", "Generated artifact paths cannot escape the project workspace."));
    } else {
        checks.push(check("artifact-path-safety", "security", "fail", "Artifact path traversal detected", "One or more generated paths contain absolute paths or parent traversal segments.", "Unsafe artifact path detected in generated workspace."));
        blockers.push("Remove unsafe artifact paths before exporting or executing generated projects.");
    }

    if (artifactBytes <= MAX_ARTIFACT_BYTES) {
        checks.push(check("artifact-budget", "performance", "pass", "Artifact size budget", `${artifactBytes.toLocaleString()} bytes of generated source are within the browser workspace budget.`));
    } else {
        checks.push(check("artifact-budget", "performance", "warning", "Large generated workspace", `${artifactBytes.toLocaleString()} bytes exceeds the recommended ${MAX_ARTIFACT_BYTES.toLocaleString()} byte browser workspace budget.`));
        warnings.push("Reduce generated artifact size before a live demo to keep mount and export operations responsive.");
    }

    const secureHeaders =
        headerValue(headers, "Cross-Origin-Opener-Policy") === "same-origin"
        && headerValue(headers, "Cross-Origin-Embedder-Policy") === "require-corp"
        && headerValue(headers, "Permissions-Policy")?.includes("tools=(self)") === true
        && headerValue(headers, "X-Content-Type-Options") === "nosniff"
        && headerValue(headers, "Referrer-Policy") === "strict-origin-when-cross-origin";
    if (secureHeaders) {
        checks.push(check("browser-isolation", "security", "pass", "Browser isolation headers", "COOP, COEP, and WebMCP Permissions Policy are explicitly configured."));
    } else {
        checks.push(check("browser-isolation", "security", "warning", "Browser isolation headers", "Deployment must preserve COOP, COEP, and the WebMCP tools Permissions Policy for the full execution experience."));
        warnings.push("Verify the production host sends Cross-Origin-Opener-Policy, Cross-Origin-Embedder-Policy, and Permissions-Policy: tools=(self).");
    }

    const duplicateTools = toolNames.filter((name, index) => toolNames.indexOf(name) !== index);
    const expectedSet: ReadonlySet<string> = new Set(EXPECTED_AGENT_OS_TOOLS);
    const missingAgentTools = EXPECTED_AGENT_OS_TOOLS.filter((name) => !toolNames.includes(name));
    const actualAgentCount = toolNames.filter((name) => expectedSet.has(name)).length;
    if (duplicateTools.length === 0 && actualAgentCount === EXPECTED_AGENT_OS_TOOLS.length && toolNames.length === EXPECTED_TOTAL_TOOLS) {
        checks.push(check("webmcp-registry", "webmcp", "pass", "WebMCP registry coverage", `${toolNames.length} unique tools registered, including all ${EXPECTED_AGENT_OS_TOOLS.length} Agent OS tools.`));
    } else {
        const evidence = `actual=${toolNames.length}, Agent OS=${actualAgentCount}, missing=${missingAgentTools.join(", ") || "none"}, duplicates=${duplicateTools.length}`;
        checks.push(check("webmcp-registry", "webmcp", "fail", "WebMCP registry coverage", "The registered tool surface does not match the production contract.", evidence));
        blockers.push("Restore the complete WebMCP tool registry before the hackathon demo.");
    }

    if (!project) {
        checks.push(check("generated-project", "release", "warning", "Generated project", "No generated project is currently available; code execution and artifact QA cannot be fully verified."));
        warnings.push("Generate the project before the final release gate.");
    } else if (project.artifacts.length > 0 && project.entrypoints.length > 0 && project.execution.buildReady) {
        checks.push(check("generated-project", "release", "pass", "Generated project readiness", `${project.artifacts.length} artifacts and ${project.entrypoints.length} entrypoint(s) are declared build-ready.`));
    } else {
        checks.push(check("generated-project", "release", "warning", "Generated project readiness", "The generated project exists but its static execution readiness is incomplete."));
        warnings.push("Run project validation and execution before presenting the generated code as verified.");
    }

    if (codeReview) {
        if (codeReview.productionReady && codeReview.score >= 85) {
            checks.push(check("code-review", "security", "pass", "Production code review", `Heuristic production review score is ${codeReview.score}/100 with no release-blocking finding.`));
        } else if (codeReview.findings.some((finding) => finding.severity === "critical")) {
            checks.push(check("code-review", "security", "fail", "Production code review", `Critical findings remain in the generated project (${codeReview.score}/100).`));
            blockers.push("Resolve critical generated-code review findings.");
        } else {
            checks.push(check("code-review", "security", "warning", "Production code review", `Review score is ${codeReview.score}/100; non-critical findings remain.`));
            warnings.push("Resolve remaining generated-code review findings before claiming production readiness.");
        }
    } else {
        checks.push(check("code-review", "security", "warning", "Production code review", "No generated-project review is stored for the current release candidate."));
    }

    if (execution?.status === "passed") {
        checks.push(check("execution-verification", "execution", "pass", "Real execution verification", `Install, test, build, and runtime verification passed${execution.healingAttempts.length ? ` after ${execution.healingAttempts.length} self-healing attempt(s)` : ""}.`));
    } else if (execution?.status === "unsupported") {
        checks.push(check("execution-verification", "execution", "warning", "Real execution verification", "The current environment cannot execute this project in WebContainer; static validation remains available."));
        warnings.push("Use a secure, cross-origin-isolated browser for the real execution demo.");
    } else if (execution) {
        checks.push(check("execution-verification", "execution", "fail", "Real execution verification", "The latest execution attempt did not complete successfully."));
        blockers.push("Resolve the execution failure or explicitly demonstrate the bounded self-healing result.");
    } else {
        checks.push(check("execution-verification", "execution", "warning", "Real execution verification", "No real execution result is stored for the current release candidate."));
    }

    const versions = versioning?.versions ?? [];
    const versionIds = versions.map((version) => version.id);
    const versionIntegrity = versions.every((version) =>
        version.id
        && version.nodes.length === version.nodeCount
        && version.edges.length === version.connectionCount
        && version.nodes.every(isValidNode),
    ) && new Set(versionIds).size === versionIds.length;
    if (versionIntegrity) {
        checks.push(check("version-integrity", "architecture", "pass", "Architecture version integrity", `${versions.length} immutable checkpoint(s) have consistent graph metadata.`));
    } else {
        checks.push(check("version-integrity", "architecture", "fail", "Architecture version integrity", "One or more architecture checkpoints have inconsistent metadata."));
        blockers.push("Repair or discard corrupted architecture checkpoints.");
    }

    const criticalCount = checks.filter((item) => item.status === "fail").length;
    const warningCount = checks.filter((item) => item.status === "warning").length;
    const score = Math.max(0, Math.round(100 - criticalCount * 24 - warningCount * 6));
    const status = finalStatus(checks);

    if (status === "pass") {
        recommendations.push("Freeze the release candidate and capture one final architecture version before the demo.");
        recommendations.push("Run the final agent prompt once in a fresh browser tab to verify real WebMCP discovery.");
    } else {
        recommendations.push("Treat every failed check as a release blocker; warnings are demo risks that should be addressed when practical.");
    }

    return {
        runAt: Date.now(),
        status,
        score,
        checks,
        blockers,
        warnings,
        recommendations,
        metrics: {
            nodeCount: input.nodes.length,
            connectionCount: input.edges.length,
            artifactCount: project?.artifacts.length ?? 0,
            versionCount: versions.length,
            webmcpToolCount: toolNames.length,
            agentOSToolCount: actualAgentCount,
            estimatedArtifactBytes: artifactBytes,
        },
    };
}
