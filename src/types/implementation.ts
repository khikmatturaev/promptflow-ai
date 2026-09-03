import type { ArchitectureNodeType } from "./index";

export type ImplementationLayer =
    | "experience"
    | "edge"
    | "application"
    | "domain"
    | "data"
    | "async"
    | "integration"
    | "operations";

export type ImplementationMaturity =
    | "implementation-ready"
    | "implementation-candidate"
    | "design-ready"
    | "needs-architecture-work";

export interface ImplementationComponent {
    nodeId: string;
    label: string;
    type: ArchitectureNodeType;
    layer: ImplementationLayer;
    responsibility: string;
    suggestedFiles: string[];
    dependencies: string[];
    interfaces: string[];
    testTargets: string[];
    codeReady: boolean;
}

export interface ImplementationContract {
    id: string;
    ownerNodeId: string;
    consumerNodeIds: string[];
    name: string;
    kind: "http" | "event" | "data" | "external";
    boundary: string;
    inputs: string[];
    outputs: string[];
    reliabilityNotes: string[];
}

export interface ImplementationPhase {
    order: number;
    title: string;
    goal: string;
    nodeIds: string[];
    deliverables: string[];
    exitCriteria: string[];
}

export interface ImplementationRisk {
    id: string;
    severity: "high" | "medium" | "low";
    title: string;
    message: string;
    mitigation: string;
}

export interface ImplementationEnvironmentVariable {
    name: string;
    purpose: string;
    required: boolean;
    secret: boolean;
    sourceNodeIds: string[];
}

export interface ImplementationTestPlan {
    unit: string[];
    integration: string[];
    contract: string[];
    resilience: string[];
}

export interface ArchitectureImplementationBlueprint {
    generatedAt: number;
    modelVersion: "implementation-intelligence-1.0";
    architectureFingerprint: string;
    readinessScore: number;
    maturity: ImplementationMaturity;
    stack: string[];
    projectStructure: string[];
    components: ImplementationComponent[];
    contracts: ImplementationContract[];
    phases: ImplementationPhase[];
    environment: ImplementationEnvironmentVariable[];
    risks: ImplementationRisk[];
    tests: ImplementationTestPlan;
    recommendedFirstFiles: string[];
    totalSuggestedFiles: number;
    codeReadyCount: number;
}
