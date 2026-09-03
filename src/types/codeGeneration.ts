import type { ArchitectureNodeType } from "./index";

export type GeneratedArtifactKind =
    | "source"
    | "config"
    | "schema"
    | "test"
    | "documentation";

export interface GeneratedArtifact {
    path: string;
    kind: GeneratedArtifactKind;
    language: string;
    nodeId?: string;
    content: string;
}

export interface ProjectExecutionCheck {
    id: string;
    status: "pass" | "warning" | "blocked";
    title: string;
    message: string;
}

export interface ProjectExecutionReport {
    generatedAt: number;
    buildReady: boolean;
    runReady: boolean;
    checks: ProjectExecutionCheck[];
    commands: string[];
    missingCapabilities: string[];
}

export interface ProjectGenerationResult {
    generatedAt: number;
    modelVersion: "project-codegen-1.0";
    projectName: string;
    framework: string;
    runtime: string;
    architectureFingerprint: string;
    artifacts: GeneratedArtifact[];
    entrypoints: string[];
    dependencies: string[];
    environment: string[];
    contractsCovered: number;
    execution: ProjectExecutionReport;
}

export interface CodeGenerationSummary {
    sourceFiles: number;
    configFiles: number;
    testFiles: number;
    documentationFiles: number;
    totalFiles: number;
    totalLines: number;
    nodeTypes: ArchitectureNodeType[];
}
