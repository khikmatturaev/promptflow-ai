import type { ArchitectureEdge, ArchitectureNode } from "./index";
import type { ProjectGenerationResult } from "./codeGeneration";
import type { ProjectCodeReview } from "./codeIntelligence";
import type { ExecutionLoopResult } from "./execution";
import type { ArchitectureVersioningState } from "./versioning";

export type ProductionQACategory =
    | "architecture"
    | "security"
    | "performance"
    | "webmcp"
    | "execution"
    | "release";

export type ProductionQAStatus = "pass" | "warning" | "fail";

export interface ProductionQACheck {
    id: string;
    category: ProductionQACategory;
    status: ProductionQAStatus;
    title: string;
    message: string;
    evidence?: string;
}

export interface ProductionQAReport {
    runAt: number;
    status: ProductionQAStatus;
    score: number;
    checks: ProductionQACheck[];
    blockers: string[];
    warnings: string[];
    recommendations: string[];
    metrics: {
        nodeCount: number;
        connectionCount: number;
        artifactCount: number;
        versionCount: number;
        webmcpToolCount: number;
        agentOSToolCount: number;
        estimatedArtifactBytes: number;
    };
}

export interface ProductionQAInput {
    nodes: ArchitectureNode[];
    edges: ArchitectureEdge[];
    project?: ProjectGenerationResult | null;
    execution?: ExecutionLoopResult | null;
    codeReview?: ProjectCodeReview | null;
    versioning?: ArchitectureVersioningState;
    webmcpToolNames?: readonly string[];
    headers?: Readonly<Record<string, string>>;
}
