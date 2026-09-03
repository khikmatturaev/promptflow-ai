import { auditArchitecture } from "./architectureAudit";
import { buildScaleOperations } from "./architectureIntelligence";
import { analyzeArchitectureIntent, buildArchitecturePlan } from "./architectureIntent";
import type {
    ArchitectureAudit,
    ArchitectureEdge,
    ArchitectureNode,
    ArchitectureNodeType,
    ArchitectureTransformOperation,
} from "../types";

export interface AgentPlannedComponent {
    id: string;
    label: string;
    type: ArchitectureNodeType;
    description: string;
}

export interface AgentPlannedConnection {
    sourceId: string;
    targetId: string;
    label?: string;
}

export interface AgentArchitectureBlueprint {
    request: string;
    targetUsers: number;
    operations: ArchitectureTransformOperation[];
    source: "agent-plan" | "intent-compiler";
    domain: string;
    technologies: string[];
    requirements: string[];
}

export interface ArchitectureMetrics {
    nodeCount: number;
    connectionCount: number;
    entrypointCount: number;
    computeCount: number;
    dataCount: number;
    asyncCount: number;
    externalCount: number;
    codeReadyCount: number;
    capabilities: string[];
}

export interface ArchitectureRecommendation {
    id: string;
    priority: "high" | "medium" | "low";
    title: string;
    rationale: string;
    action: "fix-structural" | "scale" | "review-security" | "review-observability";
}

export interface ArchitectureScaleSimulation {
    targetUsers: number;
    operations: ArchitectureTransformOperation[];
    currentAudit: ArchitectureAudit;
    projectedAudit: ArchitectureAudit;
    currentMetrics: ArchitectureMetrics;
    projectedMetrics: ArchitectureMetrics;
}

function toOperations(
    components: AgentPlannedComponent[],
    connections: AgentPlannedConnection[],
): ArchitectureTransformOperation[] {
    const operations: ArchitectureTransformOperation[] = components.map((component) => ({
        kind: "add",
        id: component.id,
        label: component.label,
        type: component.type,
        description: component.description,
    }));

    for (const connection of connections) {
        operations.push({
            kind: "connect",
            sourceId: connection.sourceId,
            targetId: connection.targetId,
            ...(connection.label ? { label: connection.label } : {}),
        });
    }

    return operations;
}

export function buildAgentArchitectureBlueprint(
    request: string,
    components?: AgentPlannedComponent[],
    connections?: AgentPlannedConnection[],
    targetUsers?: number,
): AgentArchitectureBlueprint {
    const intent = analyzeArchitectureIntent(request);
    const resolvedScale = targetUsers ?? intent.scale;

    if (components && components.length > 0) {
        return {
            request: intent.originalPrompt,
            targetUsers: resolvedScale,
            operations: toOperations(components, connections ?? []),
            source: "agent-plan",
            domain: intent.domain,
            technologies: intent.technologies,
            requirements: intent.requirements,
        };
    }

    const plan = buildArchitecturePlan(request);
    return {
        request: plan.intent.originalPrompt,
        targetUsers: targetUsers ?? plan.intent.scale,
        operations: plan.operations,
        source: "intent-compiler",
        domain: plan.intent.domain,
        technologies: plan.intent.technologies,
        requirements: plan.intent.requirements,
    };
}

export function projectArchitecture(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
    operations: ArchitectureTransformOperation[],
): { nodes: ArchitectureNode[]; edges: ArchitectureEdge[] } {
    let nextNodes = nodes.map((node) => ({
        ...node,
        position: { ...node.position },
        data: { ...node.data },
    }));
    let nextEdges: ArchitectureEdge[] = edges.map((edge) => ({
        ...edge,
        data: edge.data ? { ...edge.data } : {},
    }));

    const positionFor = (index: number) => ({
        x: 80 + (index % 3) * 340,
        y: 120 + Math.floor(index / 3) * 240,
    });

    for (const operation of operations) {
        if (operation.kind === "add") {
            if (nextNodes.some((node) => node.id === operation.id)) continue;
            nextNodes.push({
                id: operation.id,
                type: "architecture",
                position:
                    operation.x !== undefined && operation.y !== undefined
                        ? { x: operation.x, y: operation.y }
                        : positionFor(nextNodes.length),
                selected: false,
                data: {
                    label: operation.label,
                    type: operation.type,
                    description: operation.description,
                    boilerplate: "",
                },
            });
            continue;
        }

        if (operation.kind === "update") {
            nextNodes = nextNodes.map((node) =>
                node.id === operation.nodeId
                    ? {
                        ...node,
                        data: {
                            ...node.data,
                            ...(operation.label !== undefined ? { label: operation.label } : {}),
                            ...(operation.type !== undefined ? { type: operation.type } : {}),
                            ...(operation.description !== undefined ? { description: operation.description } : {}),
                        },
                    }
                    : node,
            );
            continue;
        }

        if (operation.kind === "remove") {
            nextNodes = nextNodes.filter((node) => node.id !== operation.nodeId);
            nextEdges = nextEdges.filter(
                (edge) => edge.source !== operation.nodeId && edge.target !== operation.nodeId,
            );
            continue;
        }

        if (operation.kind === "connect") {
            if (
                operation.sourceId === operation.targetId ||
                nextEdges.some(
                    (edge) => edge.source === operation.sourceId && edge.target === operation.targetId,
                )
            ) {
                continue;
            }
            nextEdges.push({
                id: `${operation.sourceId}-${operation.targetId}`,
                source: operation.sourceId,
                target: operation.targetId,
                animated: true,
                data: { label: operation.label },
            });
            continue;
        }

        nextEdges = nextEdges.filter(
            (edge) => !(edge.source === operation.sourceId && edge.target === operation.targetId),
        );
    }

    return { nodes: nextNodes, edges: nextEdges };
}

function countType(nodes: ArchitectureNode[], types: ArchitectureNodeType[]): number {
    const allowed = new Set<ArchitectureNodeType>(types);
    return nodes.filter((node) => allowed.has(node.data.type)).length;
}

export function getArchitectureMetrics(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
): ArchitectureMetrics {
    const capabilities: string[] = [];
    const labels = nodes.map((node) => `${node.data.label} ${node.data.description}`.toLowerCase()).join(" ");

    if (countType(nodes, ["auth"]) > 0) capabilities.push("identity boundary");
    if (countType(nodes, ["payment"]) > 0) capabilities.push("payments");
    if (countType(nodes, ["cache"]) > 0) capabilities.push("low-latency caching");
    if (countType(nodes, ["queue", "worker"]) > 0) capabilities.push("async processing");
    if (countType(nodes, ["gateway"]) > 0) capabilities.push("traffic gateway");
    if (labels.includes("websocket") || labels.includes("realtime") || labels.includes("real-time")) capabilities.push("realtime");
    if (labels.includes("search")) capabilities.push("search");
    if (labels.includes("vector") || labels.includes("inference") || labels.includes("llm") || labels.includes("ai ")) capabilities.push("AI / inference");
    if (labels.includes("storage") || labels.includes("cdn") || labels.includes("media")) capabilities.push("media delivery");

    return {
        nodeCount: nodes.length,
        connectionCount: edges.length,
        entrypointCount: countType(nodes, ["frontend", "external", "gateway"]),
        computeCount: countType(nodes, ["backend", "api", "service"]),
        dataCount: countType(nodes, ["database", "cache"]),
        asyncCount: countType(nodes, ["queue", "worker"]),
        externalCount: countType(nodes, ["external", "payment"]),
        codeReadyCount: nodes.filter((node) => Boolean(node.data.boilerplate.trim())).length,
        capabilities,
    };
}

export function recommendArchitecture(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
    targetUsers?: number,
): ArchitectureRecommendation[] {
    const audit = auditArchitecture(nodes, edges);
    const recommendations: ArchitectureRecommendation[] = [];

    if (audit.findings.some((finding) => finding.severity !== "info")) {
        recommendations.push({
            id: "fix-structural",
            priority: audit.findings.some((finding) => finding.severity === "critical") ? "high" : "medium",
            title: "Resolve structural findings",
            rationale: `${audit.findings.length} structural finding${audit.findings.length === 1 ? "" : "s"} currently reduce architecture confidence.`,
            action: "fix-structural",
        });
    }

    const hasCompute = countType(nodes, ["backend", "api", "service"]) > 0;
    const hasGateway = countType(nodes, ["gateway"]) > 0;
    const hasCache = countType(nodes, ["cache"]) > 0;
    const hasAsync = countType(nodes, ["queue", "worker"]) >= 2;

    if (hasCompute && targetUsers !== undefined && targetUsers >= 100_000 && (!hasGateway || !hasCache || !hasAsync)) {
        recommendations.push({
            id: "scale-capacity",
            priority: targetUsers >= 1_000_000 ? "high" : "medium",
            title: `Prepare for ${targetUsers.toLocaleString()} users`,
            rationale: "Introduce deterministic traffic, cache, asynchronous processing, and read-scaling patterns where they are missing.",
            action: "scale",
        });
    }

    if (countType(nodes, ["auth"]) === 0 && nodes.length >= 3) {
        recommendations.push({
            id: "review-security",
            priority: "medium",
            title: "Review the security boundary",
            rationale: "No explicit authentication/authorization component is represented. Confirm whether identity is intentionally external or add a boundary.",
            action: "review-security",
        });
    }

    if (nodes.length >= 5 && !labelsContain(nodes, ["observability", "monitoring", "tracing", "logging", "telemetry"])) {
        recommendations.push({
            id: "review-observability",
            priority: "low",
            title: "Plan observability before production",
            rationale: "The graph does not explicitly represent logs, metrics, or tracing. Treat this as a review recommendation rather than an automatic mutation.",
            action: "review-observability",
        });
    }

    return recommendations;
}

function labelsContain(nodes: ArchitectureNode[], terms: string[]): boolean {
    return nodes.some((node) => {
        const haystack = `${node.data.label} ${node.data.description}`.toLowerCase();
        return terms.some((term) => haystack.includes(term));
    });
}

export function simulateArchitectureScale(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
    targetUsers: number,
): ArchitectureScaleSimulation {
    const operations = buildScaleOperations(nodes, edges, targetUsers);
    const projected = projectArchitecture(nodes, edges, operations);

    return {
        targetUsers,
        operations,
        currentAudit: auditArchitecture(nodes, edges),
        projectedAudit: auditArchitecture(projected.nodes, projected.edges),
        currentMetrics: getArchitectureMetrics(nodes, edges),
        projectedMetrics: getArchitectureMetrics(projected.nodes, projected.edges),
    };
}

export function explainArchitecture(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
    nodeId?: string,
): Record<string, unknown> {
    if (nodeId) {
        const node = nodes.find((item) => item.id === nodeId);
        if (!node) throw new Error(`Node not found: ${nodeId}`);

        const upstream = edges
            .filter((edge) => edge.target === nodeId)
            .map((edge) => nodes.find((item) => item.id === edge.source))
            .filter((item): item is ArchitectureNode => Boolean(item))
            .map((item) => ({ id: item.id, label: item.data.label, type: item.data.type }));
        const downstream = edges
            .filter((edge) => edge.source === nodeId)
            .map((edge) => nodes.find((item) => item.id === edge.target))
            .filter((item): item is ArchitectureNode => Boolean(item))
            .map((item) => ({ id: item.id, label: item.data.label, type: item.data.type }));

        return {
            scope: "component",
            component: {
                id: node.id,
                label: node.data.label,
                type: node.data.type,
                responsibility: node.data.description,
                hasAttachedCode: Boolean(node.data.boilerplate.trim()),
            },
            upstream,
            downstream,
        };
    }

    const metrics = getArchitectureMetrics(nodes, edges);
    const entrypoints = nodes
        .filter((node) => ["frontend", "external", "gateway"].includes(node.data.type))
        .map((node) => node.data.label);
    const compute = nodes
        .filter((node) => ["backend", "api", "service"].includes(node.data.type))
        .map((node) => node.data.label);
    const data = nodes
        .filter((node) => ["database", "cache"].includes(node.data.type))
        .map((node) => node.data.label);

    return {
        scope: "system",
        summary: `${metrics.nodeCount} components and ${metrics.connectionCount} relationships form the current software architecture.`,
        entrypoints,
        compute,
        data,
        capabilities: metrics.capabilities,
        audit: auditArchitecture(nodes, edges),
    };
}

export function buildImplementationPlan(nodes: ArchitectureNode[], edges: ArchitectureEdge[]): Record<string, unknown> {
    const orderedTypes: ArchitectureNodeType[][] = [
        ["database", "cache", "queue"],
        ["auth", "backend", "api", "service", "worker"],
        ["gateway", "frontend", "cdn"],
        ["payment", "external", "observability"],
    ];
    const phaseTitles = [
        "Foundation & data",
        "Core services",
        "Delivery layer",
        "External integrations",
    ];

    const phases = orderedTypes
        .map((types, index) => ({
            order: index + 1,
            title: phaseTitles[index],
            components: nodes
                .filter((node) => types.includes(node.data.type))
                .map((node) => ({
                    id: node.id,
                    label: node.data.label,
                    type: node.data.type,
                    responsibility: node.data.description,
                    hasAttachedCode: Boolean(node.data.boilerplate.trim()),
                })),
        }))
        .filter((phase) => phase.components.length > 0);

    return {
        phases,
        relationshipCount: edges.length,
        recommendedFirstCodeTargets: nodes
            .filter((node) => ["backend", "api", "service", "worker"].includes(node.data.type))
            .slice(0, 5)
            .map((node) => ({ id: node.id, label: node.data.label })),
    };
}
