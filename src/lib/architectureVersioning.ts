import type {
    ArchitectureEdge,
    ArchitectureNode,
    ArchitectureNodeType,
} from "../types";
import type {
    ArchitectureChange,
    ArchitectureMigrationPlan,
    ArchitectureMigrationStep,
    ArchitectureVersionDiff,
    ArchitectureVersionSnapshot,
} from "../types/versioning";
import { buildArchitectureDNA } from "./architectureBrain";

const MAX_VERSIONS = 50;

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

function stableStringify(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    if (value && typeof value === "object") {
        const record = value as Record<string, unknown>;
        return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
}

function hash(value: string): string {
    let first = 2166136261;
    let second = 2246822519;
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        first ^= code;
        first = Math.imul(first, 16777619);
        second ^= code + index;
        second = Math.imul(second, 3266489917);
    }
    return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
}

export function architectureFingerprint(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
): string {
    const normalizedNodes = nodes
        .map((node) => ({
            id: node.id,
            type: node.data.type,
            label: node.data.label,
            description: node.data.description,
            boilerplate: node.data.boilerplate,
        }))
        .sort((a, b) => a.id.localeCompare(b.id));
    const normalizedEdges = edges
        .map((edge) => ({
            source: edge.source,
            target: edge.target,
            label: edge.data?.label ?? "",
        }))
        .sort((a, b) => `${a.source}:${a.target}`.localeCompare(`${b.source}:${b.target}`));
    return `pf9-${hash(stableStringify({ nodes: normalizedNodes, edges: normalizedEdges }))}`;
}

export function createArchitectureVersion(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
    metadata: {
        message?: string;
        name?: string;
        auditScore?: number | null;
    } = {},
    existingVersions: ArchitectureVersionSnapshot[] = [],
): ArchitectureVersionSnapshot {
    const version = (existingVersions.at(-1)?.version ?? 0) + 1;
    const fingerprint = architectureFingerprint(nodes, edges);
    const dna = buildArchitectureDNA(nodes, edges);

    return {
        id: `v${version}-${fingerprint.slice(-8)}`,
        version,
        name: metadata.name?.trim() || `Architecture v${version}`,
        message: metadata.message?.trim() || "Architecture checkpoint",
        createdAt: Date.now(),
        fingerprint,
        nodes: clone(nodes),
        edges: clone(edges),
        nodeCount: nodes.length,
        connectionCount: edges.length,
        auditScore: metadata.auditScore ?? null,
        architectureDna: dna.fingerprint,
    };
}

function nodeSignature(node: ArchitectureNode): string {
    return stableStringify({
        id: node.id,
        type: node.data.type,
        label: node.data.label,
        description: node.data.description,
        boilerplate: node.data.boilerplate,
    });
}

function positionSignature(node: ArchitectureNode): string {
    return `${Math.round(node.position.x)}:${Math.round(node.position.y)}`;
}

function edgeKey(edge: ArchitectureEdge): string {
    return `${edge.source}\u0000${edge.target}`;
}

function changeSeverity(kind: ArchitectureChangeKind, nodeType?: ArchitectureNodeType): ArchitectureChange["severity"] {
    if (kind === "node-removed" || kind === "connection-removed") return "breaking";
    if (kind === "node-updated" && (nodeType === "api" || nodeType === "database" || nodeType === "auth" || nodeType === "payment")) return "breaking";
    if (kind === "node-updated" || kind === "node-moved") return "significant";
    return "non-breaking";
}

type ArchitectureChangeKind = ArchitectureChange["kind"];

export function compareArchitectureVersions(
    from: ArchitectureVersionSnapshot,
    to: ArchitectureVersionSnapshot,
): ArchitectureVersionDiff {
    const fromNodes = new Map(from.nodes.map((node) => [node.id, node]));
    const toNodes = new Map(to.nodes.map((node) => [node.id, node]));
    const changes: ArchitectureChange[] = [];
    const addedNodes: ArchitectureNode[] = [];
    const removedNodes: ArchitectureNode[] = [];
    const updatedNodes: ArchitectureNode[] = [];
    const fromEdges = new Map(from.edges.map((edge) => [edgeKey(edge), edge]));
    const toEdges = new Map(to.edges.map((edge) => [edgeKey(edge), edge]));
    const addedEdges: ArchitectureEdge[] = [];
    const removedEdges: ArchitectureEdge[] = [];

    for (const node of to.nodes) {
        if (!fromNodes.has(node.id)) {
            addedNodes.push(node);
            changes.push({
                id: `add-node-${node.id}`,
                kind: "node-added",
                severity: "non-breaking",
                nodeId: node.id,
                label: `Added ${node.data.label}`,
                details: `${node.data.type} component was introduced.`,
            });
            continue;
        }
        const previous = fromNodes.get(node.id)!;
        if (nodeSignature(previous) !== nodeSignature(node)) {
            updatedNodes.push(node);
            const typeChanged = previous.data.type !== node.data.type;
            changes.push({
                id: `update-node-${node.id}`,
                kind: "node-updated",
                severity: changeSeverity("node-updated", typeChanged ? node.data.type : previous.data.type),
                nodeId: node.id,
                label: `Changed ${node.data.label}`,
                details: typeChanged
                    ? `${previous.data.type} → ${node.data.type}.`
                    : "Label, description, or implementation metadata changed.",
            });
        } else if (positionSignature(previous) !== positionSignature(node)) {
            changes.push({
                id: `move-node-${node.id}`,
                kind: "node-moved",
                severity: "significant",
                nodeId: node.id,
                label: `Moved ${node.data.label}`,
                details: "Canvas position changed; runtime topology is unchanged.",
            });
        }
    }

    for (const node of from.nodes) {
        if (!toNodes.has(node.id)) {
            removedNodes.push(node);
            changes.push({
                id: `remove-node-${node.id}`,
                kind: "node-removed",
                severity: "breaking",
                nodeId: node.id,
                label: `Removed ${node.data.label}`,
                details: `${node.data.type} component no longer exists in the target architecture.`,
            });
        }
    }

    for (const edge of to.edges) {
        if (!fromEdges.has(edgeKey(edge))) {
            addedEdges.push(edge);
            changes.push({
                id: `add-edge-${edgeKey(edge)}`,
                kind: "connection-added",
                severity: "non-breaking",
                sourceId: edge.source,
                targetId: edge.target,
                label: "Added dependency",
                details: `${edge.source} → ${edge.target} is now represented.`,
            });
        }
    }

    for (const edge of from.edges) {
        if (!toEdges.has(edgeKey(edge))) {
            removedEdges.push(edge);
            changes.push({
                id: `remove-edge-${edgeKey(edge)}`,
                kind: "connection-removed",
                severity: "breaking",
                sourceId: edge.source,
                targetId: edge.target,
                label: "Removed dependency",
                details: `${edge.source} → ${edge.target} was removed from the architecture.`,
            });
        }
    }

    const breakingChanges = changes.filter((change) => change.severity === "breaking").length;
    const significantChanges = changes.filter((change) => change.severity === "significant").length;
    const nonBreakingChanges = changes.length - breakingChanges - significantChanges;
    const riskScore = Math.min(100, breakingChanges * 24 + significantChanges * 8 + nonBreakingChanges * 2);

    return {
        fromVersion: from.version,
        toVersion: to.version,
        fromFingerprint: from.fingerprint,
        toFingerprint: to.fingerprint,
        changes,
        addedNodes,
        removedNodes,
        updatedNodes,
        addedEdges,
        removedEdges,
        breakingChanges,
        significantChanges,
        nonBreakingChanges,
        riskScore,
        summary: changes.length === 0
            ? "No architecture changes detected."
            : `${changes.length} change(s): ${breakingChanges} breaking, ${significantChanges} significant, ${nonBreakingChanges} non-breaking.`,
    };
}

function migrationRisk(score: number): ArchitectureMigrationPlan["risk"] {
    if (score >= 75) return "critical";
    if (score >= 45) return "high";
    if (score >= 20) return "medium";
    return "low";
}

function step(
    order: number,
    kind: ArchitectureMigrationStep["kind"],
    title: string,
    description: string,
    risk: ArchitectureMigrationStep["risk"],
    reversible: boolean,
    affectedNodeIds: string[],
): ArchitectureMigrationStep {
    return {
        id: `migration-${order}-${kind}`,
        order,
        kind,
        title,
        description,
        risk,
        reversible,
        affectedNodeIds: [...new Set(affectedNodeIds)],
    };
}

export function planArchitectureMigration(
    diff: ArchitectureVersionDiff,
): ArchitectureMigrationPlan {
    const steps: ArchitectureMigrationStep[] = [];
    const databaseChanges = [
        ...diff.removedNodes.filter((node) => node.data.type === "database"),
        ...diff.updatedNodes.filter((node) => node.data.type === "database"),
    ];
    const apiChanges = diff.changes.filter(
        (change) =>
            change.nodeId !== undefined &&
            diff.updatedNodes.some((node) => node.id === change.nodeId && ["api", "backend", "gateway"].includes(node.data.type)),
    );

    let order = 1;
    if (databaseChanges.length > 0) {
        const ids = databaseChanges.map((node) => node.id);
        steps.push(step(order++, "database", "Prepare database compatibility", "Introduce additive schema changes before switching application traffic. Keep old fields/paths readable during the transition.", "critical", false, ids));
        steps.push(step(order++, "data-backfill", "Backfill and verify data", "Backfill affected records in bounded batches, validate counts/checksums, then monitor error and latency signals.", "high", true, ids));
    }
    if (apiChanges.length > 0 || diff.removedEdges.length > 0) {
        const ids = apiChanges.map((change) => change.nodeId!).concat(diff.removedEdges.flatMap((edge) => [edge.source, edge.target]));
        steps.push(step(order++, "api-contract", "Preserve contract compatibility", "Deploy backward-compatible API/event contracts first, migrate consumers, then remove the old contract only after dependency usage reaches zero.", "high", true, ids));
    }
    if (diff.addedNodes.length > 0 || diff.addedEdges.length > 0 || diff.updatedNodes.length > 0) {
        const ids = diff.addedNodes.map((node) => node.id).concat(diff.addedEdges.flatMap((edge) => [edge.source, edge.target]), diff.updatedNodes.map((node) => node.id));
        steps.push(step(order++, "infrastructure", "Provision target topology", "Create new components and dependencies before cutover. Validate health, capacity, permissions, and observability before routing production traffic.", "medium", true, ids));
    }
    if (diff.changes.length > 0) {
        steps.push(step(order++, "application", "Roll out application changes", "Deploy the target implementation behind a feature flag or controlled rollout. Compare key health signals against the previous version.", diff.breakingChanges > 0 ? "high" : "medium", true, diff.changes.flatMap((change) => change.nodeId ? [change.nodeId] : [])));
    }
    steps.push(step(order++, "rollback", "Keep rollback ready", "Retain the previous architecture and compatible data path until verification completes. Roll back traffic first, then revert application changes.", diff.breakingChanges > 0 ? "critical" : "medium", true, []));

    const requiresDataMigration = databaseChanges.length > 0;
    const requiresApiCompatibility = apiChanges.length > 0 || diff.removedEdges.length > 0;
    const requiresDowntime = databaseChanges.some((node) => node.data.type === "database") && diff.breakingChanges > 2;
    const riskScore = Math.min(100, Math.max(diff.riskScore, (requiresDataMigration ? 30 : 0) + (requiresApiCompatibility ? 20 : 0)));

    return {
        id: `migration-${diff.fromVersion}-${diff.toVersion}-${diff.toFingerprint.slice(-8)}`,
        fromVersion: diff.fromVersion,
        toVersion: diff.toVersion,
        generatedAt: Date.now(),
        risk: migrationRisk(riskScore),
        riskScore,
        requiresDowntime,
        requiresDataMigration,
        requiresApiCompatibility,
        steps,
        preflightChecks: [
            "Target architecture passes structural audit.",
            "All changed services have deployment and observability coverage.",
            "Database backups and restore validation are available before destructive data changes.",
            "Backward-compatible contracts are deployed before consumer migration.",
            "Rollback owner, trigger, and previous-version artifacts are confirmed.",
        ],
        rollbackPlan: [
            `Route traffic back to architecture v${diff.fromVersion}.`,
            "Restore application version and compatible configuration.",
            requiresDataMigration ? "Stop destructive cleanup and restore or reconcile affected data before retrying." : "No destructive data rollback is expected.",
            "Keep the target version isolated until post-rollback health checks pass.",
        ],
        summary: `Migration v${diff.fromVersion} → v${diff.toVersion} is ${migrationRisk(riskScore)} risk with ${steps.length} controlled step(s).`,
    };
}

export function keepVersionHistory(
    versions: ArchitectureVersionSnapshot[],
): ArchitectureVersionSnapshot[] {
    return versions.slice(-MAX_VERSIONS);
}

export function versionSummary(version: ArchitectureVersionSnapshot): string {
    return `v${version.version} · ${version.nodeCount} nodes · ${version.connectionCount} connections · ${version.fingerprint}`;
}
