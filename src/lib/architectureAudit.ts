import type {
    ArchitectureAudit,
    ArchitectureAuditFinding,
    ArchitectureEdge,
    ArchitectureNode,
} from "../types";

function finding(
    id: string,
    severity: ArchitectureAuditFinding["severity"],
    title: string,
    message: string,
    nodeIds: string[] = [],
): ArchitectureAuditFinding {
    return { id, severity, title, message, nodeIds };
}

function findDisconnectedComponents(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
): ArchitectureNode[][] {
    if (nodes.length < 2) {
        return [];
    }

    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const adjacency = new Map<string, Set<string>>();
    for (const node of nodes) {
        adjacency.set(node.id, new Set());
    }

    for (const edge of edges) {
        adjacency.get(edge.source)?.add(edge.target);
        adjacency.get(edge.target)?.add(edge.source);
    }

    const visited = new Set<string>();
    const components: ArchitectureNode[][] = [];

    for (const node of nodes) {
        if (visited.has(node.id)) {
            continue;
        }

        const component: ArchitectureNode[] = [];
        const queue = [node.id];
        let queueIndex = 0;
        visited.add(node.id);

        while (queueIndex < queue.length) {
            const currentId = queue[queueIndex];
            queueIndex += 1;

            const currentNode = nodeById.get(currentId);
            if (currentNode) {
                component.push(currentNode);
            }

            for (const neighborId of adjacency.get(currentId) ?? []) {
                if (visited.has(neighborId)) {
                    continue;
                }
                visited.add(neighborId);
                queue.push(neighborId);
            }
        }

        components.push(component);
    }

    return components.filter((component) => component.length > 0);
}

export function auditArchitecture(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
): ArchitectureAudit {
    const findings: ArchitectureAuditFinding[] = [];

    if (nodes.length === 0) {
        return {
            score: 0,
            findings: [
                finding(
                    "empty-architecture",
                    "critical",
                    "Architecture is empty",
                    "Add at least a client, service, or external dependency before auditing the system.",
                ),
            ],
            auditedAt: Date.now(),
        };
    }

    const hasType = (type: ArchitectureNode["data"]["type"]): boolean =>
        nodes.some((node) => node.data.type === type);

    if (!hasType("frontend") && !hasType("external") && !hasType("gateway")) {
        findings.push(
            finding(
                "missing-entrypoint",
                "warning",
                "No client or external entrypoint",
                "The architecture has no obvious user-facing or external entrypoint.",
            ),
        );
    }

    if (!hasType("backend") && !hasType("api") && !hasType("service")) {
        findings.push(
            finding(
                "missing-compute",
                "critical",
                "No application service layer",
                "There is no backend, API, or service component to execute application logic.",
            ),
        );
    }

    if (hasType("frontend") && !hasType("backend") && !hasType("api") && !hasType("service")) {
        findings.push(
            finding(
                "frontend-without-backend",
                "warning",
                "Frontend has no application service",
                "The frontend is not connected to a backend, API, or service layer.",
                nodes.filter((node) => node.data.type === "frontend").map((node) => node.id),
            ),
        );
    }

    const dataNodes = nodes.filter(
        (node) => node.data.type === "database" || node.data.type === "cache",
    );

    for (const node of dataNodes) {
        const hasIncoming = edges.some((edge) => edge.target === node.id);
        if (!hasIncoming) {
            findings.push(
                finding(
                    `unreachable-data-${node.id}`,
                    "warning",
                    `${node.data.label} has no incoming connection`,
                    "This data component is not reachable from another architecture component.",
                    [node.id],
                ),
            );
        }
    }

    const components = findDisconnectedComponents(nodes, edges);
    if (components.length > 1) {
        const isolatedComponents = components.slice(1);
        const disconnectedNodeIds = isolatedComponents.flatMap((component) =>
            component.map((node) => node.id),
        );

        findings.push(
            finding(
                "disconnected-components",
                "warning",
                `${components.length} disconnected architecture groups`,
                "The architecture contains multiple disconnected graph components. Connect intentional boundaries or remove accidental fragments.",
                disconnectedNodeIds,
            ),
        );
    }

    const duplicateLabels = new Map<string, string[]>();
    for (const node of nodes) {
        const key = node.data.label.trim().toLowerCase();
        const ids = duplicateLabels.get(key) ?? [];
        ids.push(node.id);
        duplicateLabels.set(key, ids);
    }

    for (const [label, ids] of duplicateLabels) {
        if (ids.length > 1) {
            findings.push(
                finding(
                    `duplicate-label-${label}`,
                    "info",
                    "Duplicate component names",
                    `Multiple components use the name “${label}”. Distinct names make architecture discussions more precise.`,
                    ids,
                ),
            );
        }
    }

    const criticalCount = findings.filter((item) => item.severity === "critical").length;
    const warningCount = findings.filter((item) => item.severity === "warning").length;
    const infoCount = findings.filter((item) => item.severity === "info").length;
    const score = Math.max(
        0,
        Math.min(100, 100 - criticalCount * 30 - warningCount * 12 - infoCount * 4),
    );

    return {
        score,
        findings,
        auditedAt: Date.now(),
    };
}
