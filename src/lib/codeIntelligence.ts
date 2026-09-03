import type { ProjectGenerationResult } from "../types/codeGeneration";
import type { ProjectCodeReview, CodeReviewFinding } from "../types/codeIntelligence";

export function reviewGeneratedProject(project: ProjectGenerationResult): ProjectCodeReview {
    const findings: CodeReviewFinding[] = [];
    const source = project.artifacts.filter((artifact) => artifact.kind === "source");
    const tests = project.artifacts.filter((artifact) => artifact.kind === "test");
    const allText = project.artifacts.map((artifact) => artifact.content).join("\n");

    if (!project.artifacts.some((artifact) => artifact.path === "package.json")) {
        findings.push({ id: "missing-manifest", severity: "critical", title: "Project manifest missing", message: "A generated project needs a package manifest before dependency installation can be deterministic.", paths: [] });
    }
    if (!project.entrypoints.length) {
        findings.push({ id: "missing-entrypoint", severity: "critical", title: "Entrypoint missing", message: "No executable application entrypoint was inferred from the architecture.", paths: [] });
    }
    if (source.length === 0) {
        findings.push({ id: "no-source", severity: "critical", title: "No source artifacts", message: "The project contains no implementation source files.", paths: [] });
    }
    if (source.some((artifact) => /TODO|FIXME/.test(artifact.content))) {
        findings.push({ id: "unfinished-code", severity: "warning", title: "Unfinished markers detected", message: "One or more source artifacts contain unfinished markers and require engineering completion.", paths: source.filter((artifact) => /TODO|FIXME/.test(artifact.content)).map((artifact) => artifact.path) });
    }
    if (/password\s*=\s*["'][^"']+["']|api[_-]?key\s*=\s*["'][^"']+["']/i.test(allText)) {
        findings.push({ id: "hardcoded-secret", severity: "critical", title: "Possible hardcoded secret", message: "Generated content appears to contain a credential literal. Move secrets to runtime configuration and rotate exposed credentials.", paths: project.artifacts.filter((artifact) => /password\s*=|api[_-]?key\s*=/i.test(artifact.content)).map((artifact) => artifact.path) });
    }
    if (!project.artifacts.some((artifact) => artifact.path === ".env.example")) {
        findings.push({ id: "missing-env", severity: "warning", title: "Environment contract missing", message: "No .env.example artifact was generated for runtime configuration review.", paths: [] });
    }
    if (source.length > 1 && tests.length === 0) {
        findings.push({ id: "missing-tests", severity: "warning", title: "No test artifacts", message: "Multiple source artifacts exist without generated test coverage scaffolding.", paths: source.map((artifact) => artifact.path) });
    }
    if (!project.artifacts.some((artifact) => artifact.path === "docs/contracts.md")) {
        findings.push({ id: "missing-contracts", severity: "warning", title: "Contract documentation missing", message: "The implementation should preserve explicit architecture boundaries as inspectable contracts.", paths: [] });
    }

    const penalty = findings.reduce((score, finding) => score + (finding.severity === "critical" ? 22 : finding.severity === "warning" ? 8 : 2), 0);
    const score = Math.max(0, Math.min(100, 100 - penalty));
    const strengths = [
        project.artifacts.some((artifact) => artifact.kind === "documentation") ? "Architecture documentation is exported with the code scaffold." : "",
        project.contractsCovered > 0 ? `${project.contractsCovered} architecture contracts are represented.` : "",
        project.execution.buildReady ? "Execution preflight has no blocking artifact errors." : "",
    ].filter(Boolean);
    const nextActions = findings.filter((finding) => finding.severity !== "info").slice(0, 6).map((finding) => finding.title);
    return {
        reviewedAt: Date.now(),
        score,
        productionReady: score >= 90 && !findings.some((finding) => finding.severity === "critical"),
        findings,
        strengths,
        nextActions,
    };
}
