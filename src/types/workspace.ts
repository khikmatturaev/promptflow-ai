import type { ProjectExecutionReport, ProjectGenerationResult } from "./codeGeneration";

export interface WorkspaceFile {
    path: string;
    kind: "source" | "config" | "schema" | "test" | "documentation";
    language: string;
    content: string;
}

export interface ProjectWorkspace {
    projectName: string;
    createdAt: number;
    fingerprint: string;
    files: WorkspaceFile[];
    execution: ProjectExecutionReport;
}

export interface WorkspaceExportResult {
    fileName: string;
    fileCount: number;
    byteCount: number;
}

export interface DemoStageResult {
    id: string;
    title: string;
    status: "completed" | "skipped" | "failed";
    summary: string;
}

export interface FinalDemoRun {
    startedAt: number;
    finishedAt: number;
    status: "completed" | "blocked";
    stages: DemoStageResult[];
    project: ProjectGenerationResult | null;
    headline: string;
}
