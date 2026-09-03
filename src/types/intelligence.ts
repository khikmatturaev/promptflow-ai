import type { ArchitectureTransformOperation } from "./index";

export type IntelligenceDimension =
    | "reliability"
    | "scalability"
    | "performance"
    | "security"
    | "resilience"
    | "observability"
    | "stress-readiness";

export type IntelligenceSeverity = "critical" | "warning" | "info";
export type IntelligencePriority = "high" | "medium" | "low";

export interface IntelligenceDimensionScore {
    score: number;
    rationale: string;
}

export interface IntelligenceFinding {
    id: string;
    dimension: IntelligenceDimension;
    severity: IntelligenceSeverity;
    title: string;
    message: string;
    evidence: string[];
    nodeIds: string[];
}

export interface IntelligenceRecommendation {
    id: string;
    dimension: IntelligenceDimension;
    priority: IntelligencePriority;
    title: string;
    rationale: string;
    operations: ArchitectureTransformOperation[];
    automatic: boolean;
}

export interface ArchitectureDNA {
    archetype: string;
    fingerprint: string;
    traits: string[];
    strengths: string[];
    bottlenecks: string[];
}

export interface StressTestScenario {
    name: string;
    targetUsers: number;
    estimatedRps: number;
    computePressure: number;
    dataPressure: number;
    asyncPressure: number;
    score: number;
    grade: "healthy" | "watch" | "strained" | "critical";
    bottlenecks: string[];
    failureModes: string[];
}

export interface ArchitectureStressTest {
    targetUsers: number;
    model: string;
    baselineScore: number;
    scenario: StressTestScenario;
    projectedScore: number;
    projectedNodeCount: number;
    projectedConnectionCount: number;
    projectedOperations: number;
    confidence: "heuristic";
}

export interface ArchitectureIntelligenceReport {
    generatedAt: number;
    overallScore: number;
    maturity: "prototype" | "production-candidate" | "production-ready" | "resilient";
    dimensions: Record<IntelligenceDimension, IntelligenceDimensionScore>;
    findings: IntelligenceFinding[];
    recommendations: IntelligenceRecommendation[];
    dna: ArchitectureDNA;
    stressTest: ArchitectureStressTest | null;
    metrics: {
        nodeCount: number;
        connectionCount: number;
        computeCount: number;
        databaseCount: number;
        gatewayCount: number;
        cacheCount: number;
        asyncCount: number;
        authCount: number;
        observabilityCount: number;
    };
}

export interface IntelligenceReportSummary {
    score: number;
    maturity: ArchitectureIntelligenceReport["maturity"];
    findingCount: number;
    highPriorityRecommendationCount: number;
    dna: Pick<ArchitectureDNA, "archetype" | "fingerprint">;
}
