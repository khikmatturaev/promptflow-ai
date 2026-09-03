import type {
    ArchitectureAudit,
    ArchitectureEdge,
    ArchitectureNode,
    ArchitectureTransformOperation,
} from "../types";

function hasType(nodes: ArchitectureNode[], type: ArchitectureNode["data"]["type"]): boolean {
    return nodes.some((node) => node.data.type === type);
}

function firstCompute(nodes: ArchitectureNode[]): ArchitectureNode | undefined {
    return nodes.find((node) =>
        node.data.type === "backend" || node.data.type === "api" || node.data.type === "service",
    );
}

function firstFrontend(nodes: ArchitectureNode[]): ArchitectureNode | undefined {
    return nodes.find((node) => node.data.type === "frontend");
}

function firstDatabase(nodes: ArchitectureNode[]): ArchitectureNode | undefined {
    return nodes.find((node) => node.data.type === "database");
}

function operationConnects(edges: ArchitectureEdge[], sourceId: string, targetId: string): boolean {
    return edges.some((edge) => edge.source === sourceId && edge.target === targetId);
}

function readReplicaSpec(database: ArchitectureNode): { id: string; label: string; description: string } {
    const label = database.data.label.trim().toLowerCase();

    if (label.includes("postgres")) {
        return {
            id: "postgres-read-replica",
            label: "PostgreSQL Read Replica",
            description: "Read-only PostgreSQL replica for distributing read traffic away from the primary.",
        };
    }

    if (label.includes("mongo")) {
        return {
            id: "mongodb-secondary",
            label: "MongoDB Secondary",
            description: "MongoDB replica-set secondary for resilient read scaling where the workload permits secondary reads.",
        };
    }

    if (label.includes("mysql")) {
        return {
            id: "mysql-read-replica",
            label: "MySQL Read Replica",
            description: "Read-only MySQL replica for distributing read traffic away from the primary.",
        };
    }

    return {
        id: "database-read-replica",
        label: "Database Read Replica",
        description: "Read-only replica for distributing read-heavy traffic away from the primary data store.",
    };
}

export function validateTransformOperations(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
    operations: ArchitectureTransformOperation[],
): void {
    const nodeIds = new Set(nodes.map((node) => node.id));
    const connections = new Set(edges.map((edge) => `${edge.source}\u0000${edge.target}`));

    for (const operation of operations) {
        if (operation.kind === "add") {
            if (nodeIds.has(operation.id)) throw new Error(`Transform would add an existing node: ${operation.id}`);
            nodeIds.add(operation.id);
            continue;
        }

        if (operation.kind === "update") {
            if (!nodeIds.has(operation.nodeId)) throw new Error(`Transform node not found: ${operation.nodeId}`);
            continue;
        }

        if (operation.kind === "remove") {
            if (!nodeIds.has(operation.nodeId)) throw new Error(`Transform node not found: ${operation.nodeId}`);
            nodeIds.delete(operation.nodeId);
            for (const key of [...connections]) {
                const [source, target] = key.split("\u0000");
                if (source === operation.nodeId || target === operation.nodeId) connections.delete(key);
            }
            continue;
        }

        const key = `${operation.sourceId}\u0000${operation.targetId}`;
        if (!nodeIds.has(operation.sourceId) || !nodeIds.has(operation.targetId)) {
            throw new Error(`Transform connection references a missing node: ${operation.sourceId} → ${operation.targetId}`);
        }
        if (operation.sourceId === operation.targetId) {
            throw new Error("A transform cannot connect a node to itself.");
        }

        if (operation.kind === "connect") {
            if (connections.has(key)) throw new Error(`Transform connection already exists: ${operation.sourceId} → ${operation.targetId}`);
            connections.add(key);
            continue;
        }

        if (!connections.has(key)) throw new Error(`Transform connection not found: ${operation.sourceId} → ${operation.targetId}`);
        connections.delete(key);
    }
}

export function buildScaleOperations(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
    targetUsers: number,
): ArchitectureTransformOperation[] {
    const operations: ArchitectureTransformOperation[] = [];
    const frontend = firstFrontend(nodes);
    const compute = firstCompute(nodes);
    const gateway = nodes.find((node) => node.data.type === "gateway");
    const gatewayId = gateway?.id ?? "api-gateway";

    if (targetUsers >= 100_000 && frontend && compute && !gateway) {
        operations.push({
            kind: "add",
            id: gatewayId,
            label: "API Gateway",
            type: "gateway",
            description: "Traffic entrypoint for routing, throttling, and horizontally scaled application instances.",
        });
    }

    const effectiveGatewayId = gateway?.id ?? (targetUsers >= 100_000 && compute ? gatewayId : undefined);

    if (targetUsers >= 100_000 && frontend && compute && effectiveGatewayId && !operationConnects(edges, frontend.id, effectiveGatewayId)) {
        if (operationConnects(edges, frontend.id, compute.id)) {
            operations.push({ kind: "disconnect", sourceId: frontend.id, targetId: compute.id });
        }
        operations.push({ kind: "connect", sourceId: frontend.id, targetId: effectiveGatewayId, label: "HTTPS" });
    }

    if (targetUsers >= 100_000 && compute && effectiveGatewayId && !operationConnects(edges, effectiveGatewayId, compute.id)) {
        operations.push({ kind: "connect", sourceId: effectiveGatewayId, targetId: compute.id, label: "Internal API" });
    }

    if (targetUsers >= 100_000 && compute) {
        const cache = nodes.find((node) => node.data.type === "cache");
        const cacheId = cache?.id ?? "redis-cache";

        if (!cache) {
            operations.push({
                kind: "add",
                id: cacheId,
                label: "Redis Cache",
                type: "cache",
                description: "Shared low-latency cache for hot reads, sessions, and rate-limit state.",
            });
        }

        if (!operationConnects(edges, compute.id, cacheId)) {
            operations.push({ kind: "connect", sourceId: compute.id, targetId: cacheId, label: "Cache" });
        }

        const queue = nodes.find((node) => node.data.type === "queue");
        const queueId = queue?.id ?? "job-queue";
        const worker = nodes.find((node) => node.data.type === "worker");
        const workerId = worker?.id ?? "background-worker";

        if (!queue) {
            operations.push({
                kind: "add",
                id: queueId,
                label: "Job Queue",
                type: "queue",
                description: "Durable asynchronous work buffer for jobs that should not block API requests.",
            });
        }

        if (!worker) {
            operations.push({
                kind: "add",
                id: workerId,
                label: "Background Worker",
                type: "worker",
                description: "Horizontally scalable worker pool for asynchronous jobs and integrations.",
            });
        }

        if (!operationConnects(edges, compute.id, queueId)) {
            operations.push({ kind: "connect", sourceId: compute.id, targetId: queueId, label: "Enqueue" });
        }
        if (!operationConnects(edges, queueId, workerId)) {
            operations.push({ kind: "connect", sourceId: queueId, targetId: workerId, label: "Consume" });
        }
    }

    if (targetUsers >= 1_000_000 && compute) {
        const database = firstDatabase(nodes);
        const hasReplica = nodes.some((node) => {
            if (node.data.type !== "database") return false;
            const label = node.data.label.trim().toLowerCase();
            return label.includes("replica") || label.includes("secondary");
        });

        if (database && !hasReplica) {
            const replica = readReplicaSpec(database);
            operations.push({
                kind: "add",
                id: replica.id,
                label: replica.label,
                type: "database",
                description: replica.description,
            });
            operations.push({ kind: "connect", sourceId: compute.id, targetId: replica.id, label: "Read queries" });
        }
    }

    return operations;
}

export function buildFixOperations(
    nodes: ArchitectureNode[],
    _edges: ArchitectureEdge[],
    audit: ArchitectureAudit,
    findingIds?: string[],
): ArchitectureTransformOperation[] {
    const selected = new Set(findingIds ?? audit.findings.map((item) => item.id));
    const operations: ArchitectureTransformOperation[] = [];
    const frontend = firstFrontend(nodes);
    const compute = firstCompute(nodes);
    const fixableMissingCompute = selected.has("missing-compute") && !compute;

    if (fixableMissingCompute) {
        const id = frontend ? "application-api" : "application-service";
        operations.push({
            kind: "add",
            id,
            label: frontend ? "Application API" : "Application Service",
            type: frontend ? "api" : "service",
            description: frontend
                ? "Backend API serving the frontend application."
                : "Application service layer for core business logic.",
        });
        if (frontend) {
            operations.push({ kind: "connect", sourceId: frontend.id, targetId: id, label: "REST API" });
        }
    }

    for (const finding of audit.findings) {
        if (!selected.has(finding.id)) continue;

        if (finding.id.startsWith("unreachable-data-") && finding.nodeIds[0] && (compute || fixableMissingCompute)) {
            const computeId = compute?.id ?? (frontend ? "application-api" : "application-service");
            operations.push({ kind: "connect", sourceId: computeId, targetId: finding.nodeIds[0], label: "Data access" });
        }

        if (finding.id === "missing-entrypoint" && !frontend && !hasType(nodes, "external")) {
            const computeId = compute?.id ?? (fixableMissingCompute ? (frontend ? "application-api" : "application-service") : undefined);
            if (computeId) {
                operations.push({
                    kind: "add",
                    id: "api-gateway",
                    label: "API Gateway",
                    type: "gateway",
                    description: "External entrypoint for routing requests into the application service layer.",
                });
                operations.push({ kind: "connect", sourceId: "api-gateway", targetId: computeId, label: "Internal API" });
            }
        }
    }

    // Remove duplicate generated operations while preserving order.
    const seen = new Set<string>();
    return operations.filter((operation) => {
        const key = JSON.stringify(operation);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}
