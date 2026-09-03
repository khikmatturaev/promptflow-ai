import { auditArchitecture } from "./architectureAudit";
import { analyzeArchitectureIntelligence } from "./architectureBrain";
import { runDigitalTwin, simulateLoad } from "./digitalTwin";
import { analyzeImplementationIntelligence } from "./implementationIntelligence";
import { generateProjectFromArchitecture, validateGeneratedProject } from "./codeGeneration";
import { buildArchitectureDNA } from "./architectureBrain";
import { reviewGeneratedProject } from "./codeIntelligence";
import { createProjectWorkspace } from "./projectWorkspace";
import type { ArchitectureEdge, ArchitectureNode } from "../types";
import type { FinalDemoRun } from "../types/workspace";

export function runFinalDemo(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
    targetUsers = 10_000_000,
): FinalDemoRun {
    const startedAt = Date.now();
    const stages: FinalDemoRun["stages"] = [];

    if (nodes.length === 0) {
        return {
            startedAt,
            finishedAt: Date.now(),
            status: "blocked",
            stages: [{ id: "architecture", title: "Architecture", status: "failed", summary: "Build an architecture before running the final demo." }],
            project: null,
            headline: "Final demo blocked: the canvas is empty.",
        };
    }

    const audit = auditArchitecture(nodes, edges);
    stages.push({ id: "architecture", title: "Architecture", status: "completed", summary: `${nodes.length} components · ${edges.length} connections` });

    const intelligence = analyzeArchitectureIntelligence(nodes, edges, targetUsers);
    stages.push({ id: "intelligence", title: "Intelligence", status: "completed", summary: `${intelligence.overallScore}/100 production intelligence` });

    const load = simulateLoad(nodes, edges, targetUsers);
    stages.push({ id: "load", title: "Load simulation", status: "completed", summary: `${load.loadProfile?.estimatedRps ?? 0} estimated RPS · ${load.scenarios[0]?.bottlenecks.length ?? 0} bottlenecks` });

    const twin = runDigitalTwin(nodes, edges, [
        { kind: "load-spike", label: `Severe traffic spike at ${targetUsers.toLocaleString()} users`, targetUsers },
        { kind: "compute-failure", label: "Compute failure", },
    ], targetUsers);
    const survivability = twin.scenarios.length > 0
        ? Math.min(...twin.scenarios.map((scenario) => scenario.survivability))
        : 0;
    const affected = new Set(twin.scenarios.flatMap((scenario) => scenario.affectedNodeIds)).size;
    stages.push({ id: "twin", title: "Digital twin", status: "completed", summary: `${survivability}/100 survivability · ${affected} affected components` });

    const implementation = analyzeImplementationIntelligence(nodes, edges);
    stages.push({ id: "implementation", title: "Implementation", status: "completed", summary: `${implementation.readinessScore}/100 readiness · ${implementation.contracts.length} contracts` });

    const project = generateProjectFromArchitecture(nodes, edges);
    const execution = validateGeneratedProject(project);
    stages.push({
        id: "codegen",
        title: "Project generation",
        status: "completed",
        summary: `${project.artifacts.length} artifacts · ${execution.buildReady ? "build ready" : "review required"}`,
    });

    const review = reviewGeneratedProject(project);
    stages.push({ id: "review", title: "Code review", status: "completed", summary: `${review.score}/100 · ${review.findings.length} findings` });

    const workspace = createProjectWorkspace(project);
    stages.push({ id: "workspace", title: "Build workspace", status: "completed", summary: `${workspace.files.length} inspectable files · local export ready` });

    const dna = buildArchitectureDNA(nodes, edges);
    stages.push({ id: "dna", title: "Architecture DNA", status: "completed", summary: `${dna.archetype} · ${dna.fingerprint}` });

    const finishedAt = Date.now();
    return {
        startedAt,
        finishedAt,
        status: "completed",
        stages,
        project,
        headline: `Final demo complete: ${audit.score}/100 structural score, ${intelligence.overallScore}/100 intelligence, ${survivability}/100 survivability, ${project.artifacts.length} generated artifacts.`,
    };
}
