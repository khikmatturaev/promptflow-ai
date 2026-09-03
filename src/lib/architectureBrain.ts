import { buildScaleOperations } from "./architectureIntelligence";
import { projectArchitecture } from "./architectureAgentOS";
import type {
    ArchitectureEdge,
    ArchitectureNode,
    ArchitectureNodeType,
    ArchitectureTransformOperation,
} from "../types";
import type {
    ArchitectureIntelligenceReport,
    ArchitectureStressTest,
    IntelligenceDimension,
    IntelligenceDimensionScore,
    IntelligenceFinding,
    IntelligenceRecommendation,
    IntelligenceSeverity,
    IntelligencePriority,
    ArchitectureDNA,
    StressTestScenario,
} from "../types/intelligence";

const COMPUTE_TYPES: ArchitectureNodeType[] = ["backend", "api", "service"];
const DATA_TYPES: ArchitectureNodeType[] = ["database"];
const ASYNC_TYPES: ArchitectureNodeType[] = ["queue", "worker"];

function count(nodes: ArchitectureNode[], types: ArchitectureNodeType[]): number {
    const set = new Set(types);
    return nodes.filter((node) => set.has(node.data.type)).length;
}

function text(node: ArchitectureNode): string {
    return `${node.data.label} ${node.data.description}`.toLowerCase();
}

function hasTerm(nodes: ArchitectureNode[], terms: string[]): boolean {
    return nodes.some((node) => {
        const value = text(node);
        return terms.some((term) => value.includes(term));
    });
}


function clamp(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function unique(values: string[]): string[] {
    return [...new Set(values)];
}

function dimension(
    score: number,
    rationale: string,
): IntelligenceDimensionScore {
    return { score: clamp(score), rationale };
}

function finding(
    id: string,
    dimensionName: IntelligenceDimension,
    severity: IntelligenceSeverity,
    title: string,
    message: string,
    evidence: string[],
    nodeIds: string[] = [],
): IntelligenceFinding {
    return { id, dimension: dimensionName, severity, title, message, evidence, nodeIds };
}

function recommendation(
    id: string,
    dimensionName: IntelligenceDimension,
    priority: IntelligencePriority,
    title: string,
    rationale: string,
    operations: ArchitectureTransformOperation[] = [],
    automatic = operations.length > 0,
): IntelligenceRecommendation {
    return { id, dimension: dimensionName, priority, title, rationale, operations, automatic };
}

function scoreReliability(nodes: ArchitectureNode[], edges: ArchitectureEdge[]): IntelligenceDimensionScore {
    const compute = count(nodes, COMPUTE_TYPES);
    const databases = count(nodes, DATA_TYPES);
    const queues = count(nodes, ASYNC_TYPES);
    const replicas = hasTerm(nodes, ["read replica", "secondary", "replica set", "multi-region"]);
    const connectedCompute = nodes.filter((node) => COMPUTE_TYPES.includes(node.data.type) && (
        edges.some((edge) => edge.source === node.id) || edges.some((edge) => edge.target === node.id)
    )).length;

    let score = compute > 0 ? 55 : 20;
    if (connectedCompute === compute && compute > 0) score += 15;
    if (databases > 0) score += 10;
    if (queues > 0) score += 8;
    if (replicas || databases > 1) score += 12;
    if (databases === 1) score -= 15;

    return dimension(score, replicas
        ? "Compute, durable data, and a redundancy path are represented."
        : "The graph has a primary data path but no explicit database redundancy.");
}

function scoreScalability(nodes: ArchitectureNode[], edges: ArchitectureEdge[]): IntelligenceDimensionScore {
    const compute = count(nodes, COMPUTE_TYPES);
    const gateway = count(nodes, ["gateway"]);
    const cache = count(nodes, ["cache"]);
    const async = count(nodes, ASYNC_TYPES);
    const replicas = hasTerm(nodes, ["read replica", "secondary", "replica"]);
    let score = compute > 0 ? 45 : 15;

    if (gateway > 0) score += 18;
    if (cache > 0) score += 12;
    if (async >= 2) score += 10;
    if (compute >= 2) score += 8;
    if (replicas) score += 12;
    if (edges.length >= Math.max(3, nodes.length - 1)) score += 5;

    return dimension(score, "Score reflects explicit traffic distribution, stateless compute, caching, async work, and read scaling patterns.");
}

function scorePerformance(nodes: ArchitectureNode[], edges: ArchitectureEdge[]): IntelligenceDimensionScore {
    const cache = count(nodes, ["cache"]);
    const gateway = count(nodes, ["gateway"]);
    const async = count(nodes, ASYNC_TYPES);
    const db = count(nodes, DATA_TYPES);
    const cdn = hasTerm(nodes, ["cdn", "content delivery", "edge cache"]);
    let score = db > 0 ? 45 : 25;
    if (cache > 0) score += 20;
    if (gateway > 0) score += 8;
    if (async > 0) score += 10;
    if (cdn) score += 15;
    if (edges.length > 0) score += 2;
    return dimension(score, "Performance readiness is inferred from latency-sensitive caching, edge delivery, and offloaded asynchronous work.");
}

function scoreSecurity(nodes: ArchitectureNode[]): IntelligenceDimensionScore {
    const auth = count(nodes, ["auth"]);
    const gateway = count(nodes, ["gateway"]);
    const payment = count(nodes, ["payment"]);
    const rateLimit = hasTerm(nodes, ["rate limit", "waf", "web application firewall", "throttle"]);
    const encryption = hasTerm(nodes, ["tls", "https", "encryption", "kms", "secret"]);
    let score = auth > 0 ? 55 : 20;
    if (gateway > 0) score += 15;
    if (rateLimit) score += 12;
    if (encryption) score += 10;
    if (payment) score += 5;
    return dimension(score, auth
        ? "An explicit identity boundary is represented; transport and abuse controls are checked heuristically."
        : "No explicit identity boundary is represented in the graph.");
}

function scoreResilience(nodes: ArchitectureNode[], edges: ArchitectureEdge[]): IntelligenceDimensionScore {
    const gateway = count(nodes, ["gateway"]);
    const cache = count(nodes, ["cache"]);
    const async = count(nodes, ASYNC_TYPES);
    const replicas = hasTerm(nodes, ["read replica", "secondary", "replica", "multi-region"]);
    const compute = count(nodes, COMPUTE_TYPES);
    let score = 25;
    if (gateway > 0) score += 10;
    if (cache > 0) score += 8;
    if (async >= 2) score += 15;
    if (replicas) score += 20;
    if (compute >= 2) score += 12;
    if (edges.length >= nodes.length && nodes.length > 0) score += 5;
    return dimension(score, "Resilience looks for redundancy, asynchronous isolation, and explicit recovery-oriented boundaries.");
}

function scoreObservability(nodes: ArchitectureNode[]): IntelligenceDimensionScore {
    const explicit = hasTerm(nodes, ["observability", "monitoring", "tracing", "logging", "telemetry", "opentelemetry", "prometheus", "grafana"]);
    const health = hasTerm(nodes, ["health check", "health endpoint", "metrics"]);
    let score = explicit ? 75 : 25;
    if (health) score += 15;
    return dimension(score, explicit
        ? "The graph explicitly represents operational telemetry."
        : "No explicit logs, metrics, tracing, or telemetry boundary is represented.");
}

function scoreStressReadiness(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
): IntelligenceDimensionScore {
    const base = (
        scoreReliability(nodes, edges).score +
        scoreScalability(nodes, edges).score +
        scorePerformance(nodes, edges).score +
        scoreResilience(nodes, edges).score
    ) / 4;
    return dimension(base, "Stress readiness is a composite heuristic over reliability, scaling, latency, and failure isolation.");
}

function buildDNA(nodes: ArchitectureNode[], edges: ArchitectureEdge[]): ArchitectureDNA {
    const metrics = {
        compute: count(nodes, COMPUTE_TYPES),
        data: count(nodes, DATA_TYPES),
        async: count(nodes, ASYNC_TYPES),
        cache: count(nodes, ["cache"]),
        gateway: count(nodes, ["gateway"]),
        cdn: count(nodes, ["cdn"]),
        observability: count(nodes, ["observability"]),
        external: count(nodes, ["external", "payment"]),
    };

    let archetype = "Modular application";
    if (metrics.gateway > 0 && metrics.async >= 2 && metrics.cache > 0) {
        archetype = metrics.compute >= 3 ? "Distributed service platform" : "Production web platform";
    } else if (metrics.async >= 2) {
        archetype = "Async-first application";
    } else if (metrics.compute >= 2) {
        archetype = "Service-oriented application";
    } else if (metrics.data === 1 && metrics.compute === 1) {
        archetype = "Monolithic application";
    }

    const traits: string[] = [];
    if (metrics.gateway) traits.push("traffic boundary");
    if (metrics.cache) traits.push("latency optimization");
    if (metrics.async) traits.push("async workload isolation");
    if (metrics.external) traits.push("external integrations");
    if (metrics.cdn) traits.push("edge delivery");
    if (metrics.observability) traits.push("operational telemetry");
    if (metrics.data) traits.push("durable state");
    if (metrics.compute >= 2) traits.push("horizontal compute potential");

    const bottlenecks: string[] = [];
    if (metrics.data === 1) bottlenecks.push("single durable data tier");
    if (!metrics.cache && nodes.length >= 4) bottlenecks.push("uncached hot path");
    if (!metrics.gateway && metrics.compute >= 2) bottlenecks.push("unbounded traffic entry");
    if (metrics.async === 0 && nodes.length >= 5) bottlenecks.push("synchronous work coupling");
    if (metrics.observability === 0 && !hasTerm(nodes, ["monitoring", "tracing", "logging", "telemetry"])) {
        bottlenecks.push("limited operational visibility");
    }

    const strengths: string[] = [];
    if (metrics.compute > 0) strengths.push("clear compute layer");
    if (metrics.data > 0) strengths.push("durable state represented");
    if (metrics.cache > 0) strengths.push("hot-read acceleration");
    if (metrics.async >= 2) strengths.push("background workload isolation");
    if (edges.length >= Math.max(2, nodes.length - 1)) strengths.push("well-connected system graph");

    const typeSignature = nodes
        .map((node) => node.data.type)
        .sort()
        .join(",");
    const edgeSignature = edges
        .map((edge) => `${edge.source}>${edge.target}`)
        .sort()
        .join("|");
    const fingerprint = `${nodes.length}N-${edges.length}E-${typeSignature || "empty"}-${hash(edgeSignature).toString(16)}`;

    return {
        archetype,
        fingerprint,
        traits: unique(traits),
        strengths: unique(strengths),
        bottlenecks: unique(bottlenecks),
    };
}

function hash(value: string): number {
    let result = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        result ^= value.charCodeAt(index);
        result = Math.imul(result, 16777619);
    }
    return result >>> 0;
}

function buildFindings(
    nodes: ArchitectureNode[],
    dimensions: Record<IntelligenceDimension, IntelligenceDimensionScore>,
): IntelligenceFinding[] {
    const findings: IntelligenceFinding[] = [];
    const database = nodes.find((node) => node.data.type === "database");
    const compute = nodes.filter((node) => COMPUTE_TYPES.includes(node.data.type));
    const hasAuth = count(nodes, ["auth"]) > 0;
    const hasGateway = count(nodes, ["gateway"]) > 0;
    const hasCache = count(nodes, ["cache"]) > 0;
    const hasAsync = count(nodes, ASYNC_TYPES) >= 2;
    const hasObservability = hasTerm(nodes, ["observability", "monitoring", "tracing", "logging", "telemetry", "opentelemetry"]);

    if (database && nodes.filter((node) => node.data.type === "database").length === 1) {
        findings.push(finding(
            "single-data-tier",
            "reliability",
            "warning",
            "Single durable data tier",
            "One database is the only explicit durable state tier. A database failure can become a system-wide availability event.",
            ["Add replication, automated backups, restore testing, and a recovery strategy appropriate to the workload."],
            [database.id],
        ));
    }

    if (database && !hasTerm(nodes, ["backup", "snapshot", "restore", "point-in-time"])) {
        findings.push(finding(
            "recovery-plan-gap",
            "reliability",
            "warning",
            "Recovery strategy is not represented",
            "The durable data tier has no explicit backup, snapshot, restore, or point-in-time recovery signal.",
            ["Define backup retention, restore objectives, recovery point objectives, and restore drills."],
            [database.id],
        ));
    }

    if (compute.length > 1 && !hasGateway) {
        findings.push(finding(
            "missing-traffic-boundary",
            "scalability",
            "warning",
            "No explicit traffic boundary",
            "Multiple compute components are exposed without a represented gateway or load-balancing boundary.",
            ["Centralize routing, throttling, authentication policy, and traffic distribution."],
            compute.map((node) => node.id),
        ));
    }

    if (nodes.length >= 4 && !hasCache) {
        findings.push(finding(
            "hot-path-cache",
            "performance",
            "info",
            "No explicit cache tier",
            "The graph has enough components to suggest hot reads may benefit from a low-latency cache.",
            ["Validate read/write ratios and add caching only for measured hot paths."],
        ));
    }

    if (nodes.length >= 3 && !hasAuth) {
        findings.push(finding(
            "missing-identity-boundary",
            "security",
            "critical",
            "Identity boundary not represented",
            "Authentication or authorization is not explicit in the architecture graph.",
            ["Confirm the trust model and represent an identity boundary before production."],
        ));
    }

    if (hasGateway && !hasTerm(nodes, ["rate limit", "waf", "web application firewall", "throttle"])) {
        findings.push(finding(
            "abuse-control-gap",
            "security",
            "warning",
            "Abuse controls are not explicit",
            "The ingress boundary does not visibly represent rate limiting, WAF policy, or throttling.",
            ["Validate authentication, authorization, rate limits, bot controls, and request-size limits at the appropriate edge."],
        ));
    }

    if (nodes.length >= 5 && !hasAsync) {
        findings.push(finding(
            "synchronous-coupling",
            "resilience",
            "warning",
            "Synchronous workload coupling",
            "No queue/worker boundary is represented for a graph with multiple components.",
            ["Move retryable or slow side effects behind a durable queue and worker where appropriate."],
        ));
    }

    if (!hasObservability && nodes.length >= 4) {
        findings.push(finding(
            "observability-gap",
            "observability",
            "warning",
            "Operational visibility gap",
            "Logs, metrics, tracing, and telemetry are not explicit in the graph.",
            ["Define golden signals, correlation IDs, alert thresholds, and trace propagation before production."],
        ));
    }

    if (hasTerm(nodes, ["video", "media", "image", "cdn"]) && !hasTerm(nodes, ["cdn", "content delivery", "edge cache"])) {
        findings.push(finding(
            "media-edge-gap",
            "performance",
            "warning",
            "Media edge delivery is not explicit",
            "The architecture appears to serve media-heavy traffic without a represented CDN or edge cache.",
            ["Move cacheable media delivery to an edge layer and keep origin storage off the hot request path."],
        ));
    }

    if (dimensions["stress-readiness"].score < 50 && nodes.length > 0) {
        findings.push(finding(
            "stress-readiness",
            "stress-readiness",
            "warning",
            "Stress readiness is limited",
            "The architecture has one or more concentrated bottlenecks that should be tested before high traffic.",
            ["Run a workload-specific load test against the projected critical path and recovery scenarios."],
        ));
    }

    return findings;
}

function buildRecommendations(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
    findings: IntelligenceFinding[],
    targetUsers?: number,
): IntelligenceRecommendation[] {
    const recommendations: IntelligenceRecommendation[] = [];
    const compute = nodes.find((node) => COMPUTE_TYPES.includes(node.data.type));
    const database = nodes.find((node) => node.data.type === "database");
    const gateway = nodes.find((node) => node.data.type === "gateway");

    if (findings.some((item) => item.id === "missing-identity-boundary")) {
        recommendations.push(recommendation(
            "add-auth-boundary",
            "security",
            "high",
            "Represent an authentication boundary",
            "Add an explicit auth component and connect the primary compute path to it. This is a structural representation, not a security certification.",
            compute ? [{
                kind: "add",
                id: "intelligence-auth",
                label: "Auth Service",
                type: "auth",
                description: "Identity and authorization boundary for protected application operations.",
            }, {
                kind: "connect",
                sourceId: compute.id,
                targetId: "intelligence-auth",
                label: "Identity",
            }] : [],
        ));
    }

    if (findings.some((item) => item.id === "missing-traffic-boundary") && compute) {
        recommendations.push(recommendation(
            "add-gateway",
            "scalability",
            "high",
            "Add a traffic gateway",
            "Create an explicit ingress boundary so routing, throttling, and horizontal compute can be managed independently.",
            [{
                kind: "add",
                id: "intelligence-gateway",
                label: "API Gateway",
                type: "gateway",
                description: "Ingress boundary for routing, throttling, and traffic distribution.",
            }, {
                kind: "connect",
                sourceId: "intelligence-gateway",
                targetId: compute.id,
                label: "Route",
            }],
        ));
    }

    if (findings.some((item) => item.id === "observability-gap")) {
        recommendations.push(recommendation(
            "add-observability",
            "observability",
            "medium",
            "Add an observability boundary",
            "Represent telemetry ownership explicitly so logs, metrics, traces, alerts, and service health have a home in the architecture.",
            [{
                kind: "add",
                id: "intelligence-observability",
                label: "Observability",
                type: "observability",
                description: "Central telemetry boundary for logs, metrics, traces, alerts, and service health.",
            }],
        ));
    }

    if (findings.some((item) => item.id === "synchronous-coupling") && compute) {
        recommendations.push(recommendation(
            "add-async-boundary",
            "resilience",
            "medium",
            "Isolate slow or retryable work",
            "Introduce a durable queue and worker boundary for background processing, retries, notifications, and other non-critical-path work.",
            [{
                kind: "add",
                id: "intelligence-queue",
                label: "Durable Job Queue",
                type: "queue",
                description: "Durable asynchronous boundary for retryable background workloads.",
            }, {
                kind: "add",
                id: "intelligence-worker",
                label: "Background Worker",
                type: "worker",
                description: "Scalable worker pool for asynchronous processing.",
            }, {
                kind: "connect",
                sourceId: compute.id,
                targetId: "intelligence-queue",
                label: "Enqueue",
            }, {
                kind: "connect",
                sourceId: "intelligence-queue",
                targetId: "intelligence-worker",
                label: "Consume",
            }],
        ));
    }

    if (findings.some((item) => item.id === "media-edge-gap")) {
        const frontend = nodes.find((node) => node.data.type === "frontend");
        const nextTarget = gateway?.id ?? compute?.id;
        if (frontend && nextTarget) {
            recommendations.push(recommendation(
                "add-media-cdn",
                "performance",
                "medium",
                "Move media delivery to the edge",
                "Represent a CDN so cacheable media can be served near users without turning the application compute tier into the media origin.",
                [{
                    kind: "add",
                    id: "intelligence-cdn",
                    label: "Media CDN",
                    type: "cdn",
                    description: "Edge delivery layer for cacheable media, images, and video assets.",
                }, {
                    kind: "connect",
                    sourceId: frontend.id,
                    targetId: "intelligence-cdn",
                    label: "Media",
                }, {
                    kind: "connect",
                    sourceId: "intelligence-cdn",
                    targetId: nextTarget,
                    label: "Origin",
                }],
            ));
        }
    }

    if (targetUsers !== undefined && targetUsers >= 100_000 && compute) {
        const scaleOps = buildScaleOperations(nodes, edges, targetUsers);
        if (scaleOps.length > 0) {
            recommendations.push(recommendation(
                "scale-for-target",
                "scalability",
                targetUsers >= 1_000_000 ? "high" : "medium",
                `Stress the ${targetUsers.toLocaleString()}-user target`,
                "Apply the existing deterministic scaling patterns, then re-run the intelligence assessment.",
                scaleOps,
            ));
        }
    }

    if (database && nodes.filter((node) => node.data.type === "database").length === 1) {
        recommendations.push(recommendation(
            "plan-data-redundancy",
            "reliability",
            "high",
            "Plan database redundancy",
            "Define replication, backups, restore drills, and a failover strategy for the primary data tier. This recommendation is intentionally review-first.",
        ));
    }

    return recommendations;
}

function maturity(score: number): ArchitectureIntelligenceReport["maturity"] {
    if (score >= 85) return "resilient";
    if (score >= 72) return "production-ready";
    if (score >= 55) return "production-candidate";
    return "prototype";
}

export function analyzeArchitectureIntelligence(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
    targetUsers?: number,
): ArchitectureIntelligenceReport {
    const dimensions = {
        reliability: scoreReliability(nodes, edges),
        scalability: scoreScalability(nodes, edges),
        performance: scorePerformance(nodes, edges),
        security: scoreSecurity(nodes),
        resilience: scoreResilience(nodes, edges),
        observability: scoreObservability(nodes),
        "stress-readiness": scoreStressReadiness(nodes, edges),
    } satisfies Record<IntelligenceDimension, IntelligenceDimensionScore>;

    const weighted = (
        dimensions.reliability.score * 0.16 +
        dimensions.scalability.score * 0.16 +
        dimensions.performance.score * 0.13 +
        dimensions.security.score * 0.17 +
        dimensions.resilience.score * 0.15 +
        dimensions.observability.score * 0.10 +
        dimensions["stress-readiness"].score * 0.13
    );

    const findings = buildFindings(nodes, dimensions);
    const recommendations = buildRecommendations(nodes, edges, findings, targetUsers);
    const dna = buildDNA(nodes, edges);

    return {
        generatedAt: Date.now(),
        overallScore: clamp(weighted),
        maturity: maturity(weighted),
        dimensions,
        findings,
        recommendations,
        dna,
        stressTest: targetUsers ? runArchitectureStressTest(nodes, edges, targetUsers) : null,
        metrics: {
            nodeCount: nodes.length,
            connectionCount: edges.length,
            computeCount: count(nodes, COMPUTE_TYPES),
            databaseCount: count(nodes, DATA_TYPES),
            gatewayCount: count(nodes, ["gateway"]),
            cacheCount: count(nodes, ["cache"]),
            asyncCount: count(nodes, ASYNC_TYPES),
            authCount: count(nodes, ["auth"]),
            observabilityCount: count(nodes, ["observability"]) + (hasTerm(nodes, ["monitoring", "tracing", "logging", "telemetry"]) ? 1 : 0),
        },
    };
}

export function runArchitectureStressTest(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
    targetUsers: number,
): ArchitectureStressTest {
    if (!Number.isFinite(targetUsers) || targetUsers <= 0) {
        throw new Error("targetUsers must be a positive finite number.");
    }

    const baseline = analyzeArchitectureIntelligence(nodes, edges);
    const scaleOperations = buildScaleOperations(nodes, edges, targetUsers);
    const projected = projectArchitecture(nodes, edges, scaleOperations);
    const projectedReport = analyzeArchitectureIntelligence(projected.nodes, projected.edges);

    const compute = Math.max(1, count(nodes, COMPUTE_TYPES));
    const databases = Math.max(1, count(nodes, DATA_TYPES));
    const async = Math.max(1, count(nodes, ASYNC_TYPES));
    const estimatedRps = Math.max(10, Math.round(targetUsers * 0.001));
    const computePressure = estimatedRps / (compute * 350);
    const dataPressure = estimatedRps / (databases * 500);
    const asyncPressure = (targetUsers / 1_000_000) / async;
    const bottlenecks: string[] = [];
    const failureModes: string[] = [];

    if (computePressure > 1) bottlenecks.push("compute saturation");
    if (dataPressure > 1) bottlenecks.push("primary data saturation");
    if (asyncPressure > 1) bottlenecks.push("background queue pressure");
    if (count(nodes, ["cache"]) === 0 && estimatedRps >= 1_000) bottlenecks.push("uncached read pressure");

    if (count(nodes, DATA_TYPES) === 1) failureModes.push("single database failure");
    if (count(nodes, COMPUTE_TYPES) === 1) failureModes.push("single compute failure");
    if (count(nodes, ASYNC_TYPES) === 0) failureModes.push("synchronous retry amplification");
    if (count(nodes, ["gateway"]) === 0 && compute > 1) failureModes.push("uncoordinated traffic ingress");

    const pressure = Math.max(computePressure, dataPressure, asyncPressure);
    const score = clamp(100 - Math.max(0, pressure - 0.65) * 55 - bottlenecks.length * 7 - failureModes.length * 4);
    const grade: StressTestScenario["grade"] =
        score >= 80 ? "healthy" : score >= 65 ? "watch" : score >= 45 ? "strained" : "critical";

    return {
        targetUsers,
        model: "Heuristic planning model: 0.1% concurrent request pressure, 350 RPS/compute unit, 500 RPS/data tier. Not a benchmark or capacity guarantee.",
        baselineScore: baseline.overallScore,
        scenario: {
            name: `Projected ${targetUsers.toLocaleString()} users`,
            targetUsers,
            estimatedRps,
            computePressure: Number(computePressure.toFixed(2)),
            dataPressure: Number(dataPressure.toFixed(2)),
            asyncPressure: Number(asyncPressure.toFixed(2)),
            score,
            grade,
            bottlenecks,
            failureModes,
        },
        projectedScore: projectedReport.overallScore,
        projectedNodeCount: projected.nodes.length,
        projectedConnectionCount: projected.edges.length,
        projectedOperations: scaleOperations.length,
        confidence: "heuristic",
    };
}

export function applyIntelligenceRecommendationOperations(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
    recommendationIds: string[],
    targetUsers?: number,
): ArchitectureTransformOperation[] {
    const report = analyzeArchitectureIntelligence(nodes, edges, targetUsers);
    const selected = report.recommendations.filter((item) => recommendationIds.includes(item.id));
    const operations = selected.flatMap((item) => item.operations);

    if (operations.length === 0) {
        return [];
    }

    return operations;
}

export function projectIntelligence(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
    operations: ArchitectureTransformOperation[],
): ArchitectureIntelligenceReport {
    const projected = projectArchitecture(nodes, edges, operations);
    return analyzeArchitectureIntelligence(projected.nodes, projected.edges);
}

export function buildArchitectureDNA(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
): ArchitectureDNA {
    return buildDNA(nodes, edges);
}

export function getIntelligenceDimensionLabels(): Record<IntelligenceDimension, string> {
    return {
        reliability: "Reliability",
        scalability: "Scalability",
        performance: "Performance",
        security: "Security",
        resilience: "Resilience",
        observability: "Observability",
        "stress-readiness": "Stress readiness",
    };
}
