import type { ArchitectureNode, ArchitectureTransformOperation } from "./index";

export type DigitalTwinScenarioKind =
    | "load-spike"
    | "database-failure"
    | "compute-failure"
    | "cache-failure"
    | "queue-failure"
    | "external-dependency-failure"
    | "region-outage";

export type DigitalTwinSeverity = "low" | "medium" | "high" | "critical";

export interface DigitalTwinEvent {
    kind: DigitalTwinScenarioKind;
    label: string;
    targetUsers?: number;
    targetNodeId?: string;
}

export interface DigitalTwinImpact {
    nodeId: string;
    label: string;
    severity: DigitalTwinSeverity;
    reason: string;
    propagationDepth: number;
}

export interface DigitalTwinRecovery {
    strategy: string;
    actions: string[];
    estimatedRecoveryClass: "fast" | "moderate" | "slow" | "manual";
}

export interface DigitalTwinScenarioResult {
    event: DigitalTwinEvent;
    baselineScore: number;
    projectedScore: number;
    affectedNodeIds: string[];
    impacts: DigitalTwinImpact[];
    failureModes: string[];
    bottlenecks: string[];
    recovery: DigitalTwinRecovery;
    survivability: number;
    grade: "healthy" | "degraded" | "strained" | "critical";
}

export interface DigitalTwinLoadProfile {
    targetUsers: number;
    estimatedRps: number;
    burstMultiplier: number;
    sustainedRps: number;
}

export interface DigitalTwinReport {
    generatedAt: number;
    modelVersion: string;
    architectureFingerprint: string;
    baselineScore: number;
    scenarios: DigitalTwinScenarioResult[];
    loadProfile: DigitalTwinLoadProfile | null;
    criticalPaths: string[][];
    singlePointsOfFailure: string[];
    recommendedHardening: string[];
    confidence: "heuristic";
}

export interface DigitalTwinSnapshot {
    nodes: ArchitectureNode[];
    edges: import("./index").ArchitectureEdge[];
    operations: ArchitectureTransformOperation[];
}
