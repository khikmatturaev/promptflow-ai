import type { GeneratedArtifact, ProjectGenerationResult } from "./codeGeneration";

export type ExecutionPhase =
    | "idle"
    | "booting"
    | "mounting"
    | "installing"
    | "testing"
    | "building"
    | "diagnosing"
    | "healing"
    | "verifying"
    | "completed"
    | "failed"
    | "unsupported";

export type ExecutionStatus = "pending" | "running" | "passed" | "failed" | "skipped";

export interface ExecutionStep {
    id: string;
    phase: Exclude<ExecutionPhase, "idle" | "unsupported">;
    command?: string;
    status: ExecutionStatus;
    exitCode?: number;
    durationMs: number;
    output: string;
}

export interface ExecutionDiagnostic {
    code: string;
    title: string;
    severity: "error" | "warning" | "info";
    explanation: string;
    evidence: string;
    confidence: number;
}

export interface SelfHealingPatch {
    id: string;
    title: string;
    reason: string;
    filePath: string;
    before: string;
    after: string;
    confidence: number;
}

export interface SelfHealingAttempt {
    attempt: number;
    diagnostic: ExecutionDiagnostic | null;
    patches: SelfHealingPatch[];
    verified: boolean;
}

export interface ExecutionLoopResult {
    id: string;
    startedAt: number;
    finishedAt: number;
    phase: ExecutionPhase;
    status: "passed" | "failed" | "unsupported";
    runtime: "webcontainer" | "static";
    projectName: string;
    steps: ExecutionStep[];
    diagnostics: ExecutionDiagnostic[];
    healingAttempts: SelfHealingAttempt[];
    artifacts: GeneratedArtifact[];
    output: string;
    previewUrl?: string;
    note?: string;
}

export interface ExecutionLoopOptions {
    maxHealingAttempts?: number;
    installTimeoutMs?: number;
    commandTimeoutMs?: number;
    enableSelfHealing?: boolean;
}

export interface ExecutionCapability {
    supported: boolean;
    reason: string;
    runtime: "webcontainer" | "static";
}

export interface ExecutionPatchPlan {
    project: ProjectGenerationResult;
    patches: SelfHealingPatch[];
    diagnostic: ExecutionDiagnostic | null;
}
