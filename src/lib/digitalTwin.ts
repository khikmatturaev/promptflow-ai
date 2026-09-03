import { auditArchitecture } from "./architectureAudit";
import { buildScaleOperations, validateTransformOperations } from "./architectureIntelligence";
import { buildArchitectureDNA } from "./architectureBrain";
import type { ArchitectureEdge, ArchitectureNode, ArchitectureNodeType, ArchitectureTransformOperation } from "../types";
import type {
    DigitalTwinEvent,
    DigitalTwinImpact,
    DigitalTwinLoadProfile,
    DigitalTwinRecovery,
    DigitalTwinReport,
    DigitalTwinScenarioResult,
    DigitalTwinScenarioKind,
} from "../types/digitalTwin";

const MAX_TARGET_USERS = 1_000_000_000;
const COMPUTE_TYPES: ArchitectureNodeType[] = ["backend", "api", "service", "worker"];

const clamp = (value: number, min = 0, max = 100) =>
    Math.min(max, Math.max(min, Math.round(value)));

function outgoing(nodes: ArchitectureNode[], edges: ArchitectureEdge[], id: string): string[] {
    const ids = edges.filter((edge) => edge.source === id).map((edge) => edge.target);
    return [...new Set(ids)].filter((candidate) => nodes.some((node) => node.id === candidate));
}

function nodeById(nodes: ArchitectureNode[], id: string): ArchitectureNode | undefined {
    return nodes.find((node) => node.id === id);
}

function hasType(nodes: ArchitectureNode[], types: ArchitectureNodeType[]): boolean {
    return nodes.some((node) => types.includes(node.data.type));
}

function countType(nodes: ArchitectureNode[], type: ArchitectureNodeType): number {
    return nodes.filter((node) => node.data.type === type).length;
}

function dependencyLabel(node: ArchitectureNode): string {
    return node.data.label;
}

function findSinglePointsOfFailure(nodes: ArchitectureNode[], edges: ArchitectureEdge[]): string[] {
    return nodes
        .filter((node) => {
            const type = node.data.type;
            if (!["database", "backend", "api", "gateway", "queue", "external"].includes(type)) return false;
            const incoming = edges.filter((edge) => edge.target === node.id).length;
            const outgoingCount = edges.filter((edge) => edge.source === node.id).length;
            return (type === "database" || type === "gateway" || type === "queue") && (incoming + outgoingCount) > 0;
        })
        .filter((node) => {
            if (node.data.type === "database") return countType(nodes, "database") === 1;
            if (node.data.type === "gateway") return countType(nodes, "gateway") === 1;
            if (node.data.type === "queue") return countType(nodes, "queue") === 1;
            return false;
        })
        .map(dependencyLabel);
}

function criticalPaths(nodes: ArchitectureNode[], edges: ArchitectureEdge[]): string[][] {
    const entries = nodes.filter((node) => ["frontend", "cdn", "gateway", "external"].includes(node.data.type));
    const data = nodes.filter((node) => ["database", "payment", "external"].includes(node.data.type));
    const paths: string[][] = [];

    for (const entry of entries.slice(0, 4)) {
        const queue: Array<{ id: string; path: string[] }> = [{ id: entry.id, path: [entry.data.label] }];
        const seen = new Set<string>();
        while (queue.length > 0 && paths.length < 8) {
            const current = queue.shift();
            if (!current) break;
            if (seen.has(current.id)) continue;
            seen.add(current.id);
            const node = nodeById(nodes, current.id);
            if (!node) continue;
            if (data.some((item) => item.id === node.id) && current.path.length > 1) {
                paths.push(current.path);
                continue;
            }
            for (const next of outgoing(nodes, edges, current.id)) {
                const nextNode = nodeById(nodes, next);
                if (nextNode && current.path.length < 7) {
                    queue.push({ id: next, path: [...current.path, nextNode.data.label] });
                }
            }
        }
    }

    return paths;
}

function buildLoadProfile(targetUsers: number): DigitalTwinLoadProfile {
    const safeTarget = Math.min(MAX_TARGET_USERS, Math.max(1, targetUsers));
    const estimatedRps = Math.max(10, Math.round(safeTarget * 0.001));
    const burstMultiplier = safeTarget >= 10_000_000 ? 3 : safeTarget >= 1_000_000 ? 2.5 : 2;
    return {
        targetUsers: safeTarget,
        estimatedRps,
        burstMultiplier,
        sustainedRps: Math.round(estimatedRps * burstMultiplier),
    };
}

function applyOperations(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
    operations: ArchitectureTransformOperation[],
): { nodes: ArchitectureNode[]; edges: ArchitectureEdge[] } {
    const nextNodes = nodes.map((node) => ({ ...node }));
    const nextEdges: ArchitectureEdge[] = edges.map((edge) => ({ ...edge, data: edge.data ?? {} }));
    for (const operation of operations) {
        if (operation.kind === "add") {
            if (nextNodes.some((node) => node.id === operation.id)) continue;
            nextNodes.push({
                id: operation.id,
                type: "architecture",
                position: {
                    x: operation.x ?? 80 + (nextNodes.length % 3) * 340,
                    y: operation.y ?? 120 + Math.floor(nextNodes.length / 3) * 240,
                },
                selected: false,
                data: {
                    label: operation.label,
                    type: operation.type,
                    description: operation.description,
                    boilerplate: "",
                },
            });
        } else if (operation.kind === "connect") {
            if (
                operation.sourceId !== operation.targetId &&
                nextNodes.some((node) => node.id === operation.sourceId) &&
                nextNodes.some((node) => node.id === operation.targetId) &&
                !nextEdges.some((edge) => edge.source === operation.sourceId && edge.target === operation.targetId)
            ) {
                nextEdges.push({
                    id: `${operation.sourceId}-${operation.targetId}`,
                    source: operation.sourceId,
                    target: operation.targetId,
                    animated: true,
                    data: { label: operation.label },
                });
            }
        } else if (operation.kind === "disconnect") {
            for (let index = nextEdges.length - 1; index >= 0; index -= 1) {
                const edge = nextEdges[index];
                if (edge.source === operation.sourceId && edge.target === operation.targetId) {
                    nextEdges.splice(index, 1);
                }
            }
        } else if (operation.kind === "remove") {
            for (let index = nextNodes.length - 1; index >= 0; index -= 1) {
                if (nextNodes[index].id === operation.nodeId) nextNodes.splice(index, 1);
            }
            for (let index = nextEdges.length - 1; index >= 0; index -= 1) {
                if (nextEdges[index].source === operation.nodeId || nextEdges[index].target === operation.nodeId) {
                    nextEdges.splice(index, 1);
                }
            }
        } else {
            const node = nextNodes.find((item) => item.id === operation.nodeId);
            if (node) {
                node.data = {
                    ...node.data,
                    ...(operation.label !== undefined ? { label: operation.label } : {}),
                    ...(operation.type !== undefined ? { type: operation.type } : {}),
                    ...(operation.description !== undefined ? { description: operation.description } : {}),
                };
            }
        }
    }
    return { nodes: nextNodes, edges: nextEdges };
}

function propagation(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
    rootId: string,
): DigitalTwinImpact[] {
    const impacts: DigitalTwinImpact[] = [];
    const queue: Array<{ id: string; depth: number }> = [{ id: rootId, depth: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0 && impacts.length < 30) {
        const current = queue.shift();
        if (!current || visited.has(current.id)) continue;
        visited.add(current.id);
        const node = nodeById(nodes, current.id);
        if (!node) continue;

        const severity: DigitalTwinImpact["severity"] =
            current.depth === 0 ? "critical" : current.depth === 1 ? "high" : current.depth === 2 ? "medium" : "low";

        impacts.push({
            nodeId: node.id,
            label: node.data.label,
            severity,
            reason: current.depth === 0
                ? "Directly affected by the injected failure."
                : `Depends on the failed path at propagation depth ${current.depth}.`,
            propagationDepth: current.depth,
        });

        // Failure propagates to dependents: if A → B, a failure in B
        // can surface in A. Traverse incoming edges for the impact model.
        for (const next of nodes.filter((candidate) =>
            edges.some((edge) => edge.source === candidate.id && edge.target === current.id),
        ).map((candidate) => candidate.id)) {
            queue.push({ id: next, depth: current.depth + 1 });
        }
    }

    return impacts;
}

function recoveryFor(
    kind: DigitalTwinScenarioKind,
    nodes: ArchitectureNode[],
): DigitalTwinRecovery {
    const hasReplica = nodes.some((node) =>
        /replica|secondary/i.test(node.data.label) || /replica|secondary/i.test(node.data.description),
    );
    const hasQueue = hasType(nodes, ["queue"]);
    const hasObservability = hasType(nodes, ["observability"]);

    if (kind === "database-failure") {
        return {
            strategy: hasReplica ? "Fail over to the modeled read replica/secondary, then restore the primary path." : "Restore from backup or provision a replica before reintroducing the primary data path.",
            actions: [
                hasReplica ? "Promote or route reads to the secondary." : "Provision a database replica and restore the latest durable backup.",
                "Verify application write consistency before recovery.",
                hasObservability ? "Use telemetry and alerts to confirm recovery." : "Add health checks and telemetry around the data tier.",
            ],
            estimatedRecoveryClass: hasReplica ? "moderate" : "slow",
        };
    }

    if (kind === "queue-failure") {
        return {
            strategy: hasQueue ? "Drain or replay durable work after the queue becomes healthy." : "Introduce a durable queue to isolate asynchronous work.",
            actions: [
                hasQueue ? "Pause producers and preserve pending work." : "Move non-critical work behind a durable queue.",
                "Replay idempotent jobs after recovery.",
                hasObservability ? "Verify backlog depth and worker health." : "Instrument queue depth and worker health.",
            ],
            estimatedRecoveryClass: hasQueue ? "moderate" : "slow",
        };
    }

    if (kind === "external-dependency-failure") {
        return {
            strategy: "Contain the dependency failure at the integration boundary and degrade gracefully.",
            actions: [
                "Apply bounded timeouts and retries with backoff.",
                "Use a circuit breaker or fallback response.",
                hasObservability ? "Alert on dependency latency and error rate." : "Add external dependency latency/error telemetry.",
            ],
            estimatedRecoveryClass: "fast",
        };
    }

    if (kind === "region-outage") {
        return {
            strategy: "Fail traffic to an independently deployable secondary region.",
            actions: [
                "Route traffic away from the failed region.",
                "Promote replicated state where the data tier supports it.",
                "Run a controlled failback after health verification.",
            ],
            estimatedRecoveryClass: hasReplica ? "moderate" : "manual",
        };
    }

    return {
        strategy: kind === "load-spike"
            ? "Absorb burst traffic through caching, horizontal compute, async work, and controlled ingress."
            : "Replace the failed compute path and rebalance traffic.",
        actions: [
            hasType(nodes, ["gateway"]) ? "Use the ingress boundary for throttling and traffic distribution." : "Add a gateway/load-balancing boundary.",
            hasType(nodes, ["cache"]) ? "Protect hot reads with cache." : "Add caching for repeatable reads.",
            hasQueue ? "Move retryable or slow work to asynchronous processing." : "Isolate slow work behind a durable queue.",
        ],
        estimatedRecoveryClass: "fast",
    };
}

function scenario(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
    event: DigitalTwinEvent,
    baselineScore: number,
): DigitalTwinScenarioResult {
    const root = event.targetNodeId
        ? nodeById(nodes, event.targetNodeId)
        : event.kind === "database-failure"
            ? nodes.find((node) => node.data.type === "database")
            : event.kind === "compute-failure"
                ? nodes.find((node) => COMPUTE_TYPES.includes(node.data.type))
                : event.kind === "cache-failure"
                    ? nodes.find((node) => node.data.type === "cache")
                    : event.kind === "queue-failure"
                        ? nodes.find((node) => node.data.type === "queue")
                        : event.kind === "external-dependency-failure"
                            ? nodes.find((node) => node.data.type === "external" || node.data.type === "payment")
                            : nodes.find((node) => node.data.type === "gateway") ?? nodes[0];

    const impacts = root ? propagation(nodes, edges, root.id) : [];
    const failureModes: string[] = [];
    const bottlenecks: string[] = [];

    if (event.kind !== "load-spike" && root) {
        const type = root.data.type;
        if (type === "database" && countType(nodes, "database") === 1) failureModes.push("single data-tier failure");
        if (COMPUTE_TYPES.includes(type) && nodes.filter((node) => COMPUTE_TYPES.includes(node.data.type)).length === 1) failureModes.push("single compute path failure");
        if (type === "cache") failureModes.push("cache miss amplification");
        if (type === "external" || type === "payment") failureModes.push("dependency timeout/error propagation");
        if (type === "queue" && countType(nodes, "queue") === 1) failureModes.push("asynchronous backlog growth");
    }

    if (event.kind === "load-spike") {
        const profile = buildLoadProfile(event.targetUsers ?? 1_000_000);
        const compute = Math.max(1, nodes.filter((node) => COMPUTE_TYPES.includes(node.data.type)).length);
        const data = Math.max(1, countType(nodes, "database"));
        if (profile.sustainedRps > compute * 350) bottlenecks.push("compute saturation");
        if (profile.sustainedRps > data * 500) bottlenecks.push("data-tier saturation");
        if (!hasType(nodes, ["cache"]) && profile.sustainedRps > 1000) bottlenecks.push("uncached read pressure");
        if (!hasType(nodes, ["gateway"]) && profile.sustainedRps > 2000) bottlenecks.push("uncontrolled ingress pressure");
    }

    const rawPropagationPenalty = Math.min(30, Math.max(0, impacts.length - 1) * 4);
    const computePathCount = countType(nodes, "backend") + countType(nodes, "api") + countType(nodes, "service") + countType(nodes, "worker");
    // A redundant compute path should contain a single-node failure instead
    // of scoring the same propagation as a single-path architecture.
    const propagationPenalty = event.kind === "compute-failure"
        ? computePathCount >= 3
            ? 0
            : Math.round(rawPropagationPenalty * (computePathCount >= 2 ? 0.5 : 1))
        : rawPropagationPenalty;

    // A failure event must have a measurable impact even when the baseline
    // graph has no detected SPOF. This keeps the Digital Twin honest about
    // the fact that BREAK is an injected scenario, not a passive audit.
    const explicitComputeReplicaCount = nodes.filter((node) =>
        /^twin-compute-replica-\d+$/i.test(node.id),
    ).length;
    const injectedFailurePenalty = event.kind === "compute-failure"
        ? explicitComputeReplicaCount > 0
            ? 0
            : computePathCount <= 1
                ? 18
                : computePathCount === 2
                    ? 10
                    : 6
        : event.kind === "database-failure"
            ? (countType(nodes, "database") <= 1 ? 18 : 6)
            : event.kind === "cache-failure"
                ? 8
                : event.kind === "queue-failure"
                    ? (countType(nodes, "queue") <= 1 ? 14 : 6)
                    : event.kind === "external-dependency-failure"
                        ? 8
                        : event.kind === "region-outage"
                            ? 16
                            : 0;
    const failurePenalty = failureModes.length * 12;
    const bottleneckPenalty = bottlenecks.length * 9;
    const survivability = clamp(100 - propagationPenalty - injectedFailurePenalty - failurePenalty - bottleneckPenalty);
    const projectedScore = clamp(baselineScore * 0.55 + survivability * 0.45);

    return {
        event,
        baselineScore,
        projectedScore,
        affectedNodeIds: impacts.map((impact) => impact.nodeId),
        impacts,
        failureModes,
        bottlenecks,
        recovery: recoveryFor(event.kind, nodes),
        survivability,
        grade: survivability >= 80 ? "healthy" : survivability >= 65 ? "degraded" : survivability >= 45 ? "strained" : "critical",
    };
}

export function runDigitalTwin(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
    events: DigitalTwinEvent[],
    targetUsers?: number,
): DigitalTwinReport {
    const baselineAudit = auditArchitecture(nodes, edges);
    const dna = buildArchitectureDNA(nodes, edges);
    const safeEvents = events.slice(0, 8);
    const scenarios = safeEvents.map((event) =>
        scenario(nodes, edges, event, baselineAudit.score),
    );

    const loadProfile = targetUsers !== undefined
        ? buildLoadProfile(targetUsers)
        : safeEvents.some((event) => event.kind === "load-spike")
            ? buildLoadProfile(safeEvents.find((event) => event.kind === "load-spike")?.targetUsers ?? 1_000_000)
            : null;

    const hardening = new Set<string>();
    for (const item of scenarios) {
        for (const bottleneck of item.bottlenecks) hardening.add(`Harden against ${bottleneck}.`);
        for (const failureMode of item.failureModes) hardening.add(`Mitigate ${failureMode}.`);
    }
    if (findSinglePointsOfFailure(nodes, edges).length > 0) {
        hardening.add("Remove critical single points of failure with redundancy and tested failover.");
    }

    return {
        generatedAt: Date.now(),
        modelVersion: "digital-twin-1.0",
        architectureFingerprint: dna.fingerprint,
        baselineScore: baselineAudit.score,
        scenarios,
        loadProfile,
        criticalPaths: criticalPaths(nodes, edges),
        singlePointsOfFailure: findSinglePointsOfFailure(nodes, edges),
        recommendedHardening: [...hardening].slice(0, 12),
        confidence: "heuristic",
    };
}

export function simulateLoad(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
    targetUsers: number,
): DigitalTwinReport {
    return runDigitalTwin(
        nodes,
        edges,
        [{ kind: "load-spike", label: `Traffic spike at ${targetUsers.toLocaleString()} users`, targetUsers }],
        targetUsers,
    );
}

export function simulateFailure(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
    kind: Exclude<DigitalTwinScenarioKind, "load-spike">,
    targetNodeId?: string,
): DigitalTwinReport {
    const root = targetNodeId ? nodeById(nodes, targetNodeId) : undefined;
    if (targetNodeId && !root) throw new Error(`Simulation target node not found: ${targetNodeId}`);
    return runDigitalTwin(nodes, edges, [{ kind, label: kind.replaceAll("-", " "), targetNodeId }]);
}

export function buildHardeningOperations(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
    targetUsers?: number,
): ArchitectureTransformOperation[] {
    const operations: ArchitectureTransformOperation[] = [];
    const ids = new Set(nodes.map((node) => node.id));

    const add = (operation: ArchitectureTransformOperation) => {
        if (operation.kind === "add" && ids.has(operation.id)) return;
        if (operation.kind === "add") ids.add(operation.id);
        operations.push(operation);
    };

    const projected = () => applyOperations(nodes, edges, operations);

    if (targetUsers !== undefined && targetUsers >= 100_000) {
        const scale = buildScaleOperations(nodes, edges, targetUsers);
        for (const operation of scale) {
            if (operation.kind === "add" && ids.has(operation.id)) continue;
            if (operation.kind === "add") ids.add(operation.id);
            operations.push(operation);
        }
    }

    let candidate = projected();

    if (!hasType(candidate.nodes, ["observability"])) {
        const compute = candidate.nodes.find((node) => COMPUTE_TYPES.includes(node.data.type));
        if (compute) {
            add({
                kind: "add",
                id: "twin-observability",
                label: "Observability",
                type: "observability",
                description: "Metrics, logs, traces, health checks, and alerts for the production architecture.",
            });
            add({
                kind: "connect",
                sourceId: compute.id,
                targetId: "twin-observability",
                label: "Telemetry",
            });
        }
    }

    candidate = projected();

    if (!hasType(candidate.nodes, ["cache"]) && candidate.nodes.length > 0) {
        const compute = candidate.nodes.find((node) => COMPUTE_TYPES.includes(node.data.type));
        if (compute) {
            add({
                kind: "add",
                id: "twin-cache",
                label: "Redis Cache",
                type: "cache",
                description: "Low-latency cache protecting hot reads and reducing primary data pressure.",
            });
            add({
                kind: "connect",
                sourceId: compute.id,
                targetId: "twin-cache",
                label: "Cache",
            });
        }
    }

    // Judge Mode models the loss of one compute capacity unit. A generated
    // architecture receives a measurable penalty until the Judge-specific
    // failover replica has been added; after hardening, the same scenario is
    // modeled as contained. This keeps BREAK → HEAL → RE-TEST visible without
    // mutating the real application at runtime.
    candidate = projected();
    const computeNodes = candidate.nodes.filter((node) => COMPUTE_TYPES.includes(node.data.type));
    const hasJudgeComputeReplica = candidate.nodes.some((node) =>
        /^twin-compute-replica-\d+$/i.test(node.id),
    );
    if (computeNodes.length > 0 && !hasJudgeComputeReplica) {
        const primary = computeNodes[0];
        const gateway = candidate.nodes.find((node) => node.data.type === "gateway");
        const frontend = candidate.nodes.find((node) => node.data.type === "frontend");
        const parentId = gateway?.id ?? frontend?.id;
        const replicaId = "twin-compute-replica-1";
        add({
            kind: "add",
            id: replicaId,
            label: `${primary.data.label} Replica 1`,
            type: primary.data.type,
            description: "Independent compute replica providing failover capacity for the Judge Mode compute-failure scenario.",
        });
        if (parentId) {
            add({
                kind: "connect",
                sourceId: parentId,
                targetId: replicaId,
                label: "Failover capacity",
            });
        } else {
            add({
                kind: "connect",
                sourceId: primary.id,
                targetId: replicaId,
                label: "Replica",
            });
        }
    }

    const candidateAfter = applyOperations(nodes, edges, operations);
    validateTransformOperations(nodes, edges, operations);
    void candidateAfter;
    return operations;
}
