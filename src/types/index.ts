import type { Edge, Node } from "@xyflow/react";
import type { ProjectWorkspace, FinalDemoRun } from "./workspace";
import type { ArchitectureVersioningState } from "./versioning";

export type ArchitectureNodeType =
    | "frontend"
    | "backend"
    | "api"
    | "database"
    | "cache"
    | "queue"
    | "payment"
    | "auth"
    | "service"
    | "external"
    | "gateway"
    | "worker"
    | "cdn"
    | "observability";

export interface ArchitectureNodeData {
    label: string;
    type: ArchitectureNodeType;
    description: string;
    boilerplate: string;
    [key: string]: unknown;
}

export type ArchitectureNode = Node<ArchitectureNodeData>;

export interface ArchitectureEdgeData {
    label?: string;
    [key: string]: unknown;
}

export type ArchitectureEdge = Edge<ArchitectureEdgeData>;

export type ArchitectureAuditSeverity = "critical" | "warning" | "info";

export interface ArchitectureAuditFinding {
    id: string;
    severity: ArchitectureAuditSeverity;
    title: string;
    message: string;
    nodeIds: string[];
}

export interface ArchitectureAudit {
    score: number;
    findings: ArchitectureAuditFinding[];
    auditedAt: number;
}

export type AgentToolCallStatus = "running" | "completed" | "failed";

export interface AgentToolCall {
    id: string;
    toolName: string;
    status: AgentToolCallStatus;
    startedAt: number;
    finishedAt?: number;
    inputSummary: string;
    resultSummary?: string;
}

export interface CanvasState {
    nodes: ArchitectureNode[];
    edges: ArchitectureEdge[];
    audit: ArchitectureAudit | null;
    intelligence: import("./intelligence").ArchitectureIntelligenceReport | null;
    digitalTwin: import("./digitalTwin").DigitalTwinReport | null;
    implementation: import("./implementation").ArchitectureImplementationBlueprint | null;
    codeGeneration: import("./codeGeneration").ProjectGenerationResult | null;
    workspace: ProjectWorkspace | null;
    finalDemo: FinalDemoRun | null;
    codeReview: import("./codeIntelligence").ProjectCodeReview | null;
    execution: import("./execution").ExecutionLoopResult | null;
    productionQA: import("./productionQA").ProductionQAReport | null;
    finalWow: import("./finalWow").FinalWowRun | null;
    versioning: ArchitectureVersioningState;
    layoutRevision: number;
    agentToolCalls: AgentToolCall[];
}

export interface AddArchitectureNodeInput {
    id: string;
    label: string;
    type: ArchitectureNodeType;
    description: string;
    x?: number;
    y?: number;
}

export interface ConnectArchitectureNodesInput {
    sourceId: string;
    targetId: string;
    label?: string;
}

export interface UpdateNodeDataInput {
    nodeId: string;
    data: Partial<ArchitectureNodeData>;
}

export interface GenerateNodeBoilerplateInput {
    nodeId: string;
    code: string;
}

export interface UpdateArchitectureNodeInput {
    nodeId: string;
    label?: string;
    type?: ArchitectureNodeType;
    description?: string;
}

export interface RemoveArchitectureNodeInput {
    nodeId: string;
}

export type ArchitectureTransformOperation =
    | {
        kind: "add";
        id: string;
        label: string;
        type: ArchitectureNodeType;
        description: string;
        x?: number;
        y?: number;
    }
    | {
        kind: "update";
        nodeId: string;
        label?: string;
        type?: ArchitectureNodeType;
        description?: string;
    }
    | {
        kind: "remove";
        nodeId: string;
    }
    | {
        kind: "connect";
        sourceId: string;
        targetId: string;
        label?: string;
    }
    | {
        kind: "disconnect";
        sourceId: string;
        targetId: string;
    };

export interface TransformArchitectureInput {
    reason: string;
    operations: ArchitectureTransformOperation[];
}

export interface ScaleArchitectureInput {
    targetUsers: number;
    reason: string;
}

export interface FixArchitectureInput {
    findingIds?: string[];
}

export type { FinalWowRun, WowStage, WowStageId, WowStageStatus, WowScorecard } from "./finalWow";
