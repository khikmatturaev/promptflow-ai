import type { ArchitectureEdge, ArchitectureNode, ArchitectureNodeType } from "./index";

export interface ArchitectureVersionSnapshot {
    id: string;
    version: number;
    name: string;
    message: string;
    createdAt: number;
    fingerprint: string;
    nodes: ArchitectureNode[];
    edges: ArchitectureEdge[];
    nodeCount: number;
    connectionCount: number;
    auditScore: number | null;
    architectureDna: string | null;
}

export type ArchitectureChangeKind =
    | "node-added"
    | "node-removed"
    | "node-updated"
    | "node-moved"
    | "connection-added"
    | "connection-removed";

export interface ArchitectureChange {
    id: string;
    kind: ArchitectureChangeKind;
    severity: "breaking" | "significant" | "non-breaking";
    nodeId?: string;
    sourceId?: string;
    targetId?: string;
    label: string;
    details: string;
}

export interface ArchitectureVersionDiff {
    fromVersion: number;
    toVersion: number;
    fromFingerprint: string;
    toFingerprint: string;
    changes: ArchitectureChange[];
    addedNodes: ArchitectureNode[];
    removedNodes: ArchitectureNode[];
    updatedNodes: ArchitectureNode[];
    addedEdges: ArchitectureEdge[];
    removedEdges: ArchitectureEdge[];
    breakingChanges: number;
    significantChanges: number;
    nonBreakingChanges: number;
    riskScore: number;
    summary: string;
}

export type MigrationStepKind =
    | "application"
    | "database"
    | "api-contract"
    | "infrastructure"
    | "data-backfill"
    | "rollback";

export interface ArchitectureMigrationStep {
    id: string;
    order: number;
    kind: MigrationStepKind;
    title: string;
    description: string;
    risk: "low" | "medium" | "high" | "critical";
    reversible: boolean;
    affectedNodeIds: string[];
}

export interface ArchitectureMigrationPlan {
    id: string;
    fromVersion: number;
    toVersion: number;
    generatedAt: number;
    risk: "low" | "medium" | "high" | "critical";
    riskScore: number;
    requiresDowntime: boolean;
    requiresDataMigration: boolean;
    requiresApiCompatibility: boolean;
    steps: ArchitectureMigrationStep[];
    preflightChecks: string[];
    rollbackPlan: string[];
    summary: string;
}

export interface ArchitectureVersioningState {
    versions: ArchitectureVersionSnapshot[];
    activeVersionId: string | null;
    diff: ArchitectureVersionDiff | null;
    migrationPlan: ArchitectureMigrationPlan | null;
}
