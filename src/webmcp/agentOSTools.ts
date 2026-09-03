import { auditArchitecture } from "../lib/architectureAudit";
import {
    buildHardeningOperations,
    runDigitalTwin,
    simulateFailure,
    simulateLoad,
} from "../lib/digitalTwin";
import {
    buildAgentArchitectureBlueprint,
    explainArchitecture,
    getArchitectureMetrics,
    recommendArchitecture,
    simulateArchitectureScale,
    type AgentPlannedComponent,
    type AgentPlannedConnection,
} from "../lib/architectureAgentOS";
import {
    buildFixOperations,
    buildScaleOperations,
    validateTransformOperations,
} from "../lib/architectureIntelligence";
import { analyzeImplementationIntelligence, generateImplementationContracts } from "../lib/implementationIntelligence";
import {
    generateProjectFromArchitecture,
    validateGeneratedProject,
} from "../lib/codeGeneration";
import { useCanvasStore } from "../store/useCanvasStore";
import { reviewGeneratedProject } from "../lib/codeIntelligence";
import { exportProjectWorkspace, createProjectWorkspace } from "../lib/projectWorkspace";
import { runFinalDemo } from "../lib/finalDemo";
import { executeProject } from "../lib/executionEngine";
import { runProductionQA } from "../lib/productionQA";
import { runFinalWowDemo } from "../lib/finalWow";
import {
    compareArchitectureVersions,
    createArchitectureVersion,
    planArchitectureMigration,
} from "../lib/architectureVersioning";
import type { ArchitectureNodeType } from "../types";
import {
    analyzeArchitectureIntelligence,
    applyIntelligenceRecommendationOperations,
    runArchitectureStressTest,
} from "../lib/architectureBrain";

const MAX_REQUEST_LENGTH = 2_400;
const MAX_ID_LENGTH = 120;
const MAX_LABEL_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 800;
const MAX_COMPONENTS = 40;
const MAX_CONNECTIONS = 80;
const MAX_RECOMMENDATIONS = 20;

const INTELLIGENCE_ASSESS_SCHEMA = {
    type: "object",
    properties: {
        targetUsers: {
            type: "number",
            minimum: 1,
            maximum: 1_000_000_000,
            description: "Optional target user scale for the stress-readiness assessment.",
        },
    },
    additionalProperties: false,
};

const STRESS_TEST_SCHEMA = {
    type: "object",
    properties: {
        targetUsers: {
            type: "number",
            minimum: 1,
            maximum: 1_000_000_000,
            description: "Projected user population for the heuristic stress scenario.",
        },
    },
    required: ["targetUsers"],
    additionalProperties: false,
};

const APPLY_INTELLIGENCE_SCHEMA = {
    type: "object",
    properties: {
        recommendationIds: {
            type: "array",
            items: { type: "string", maxLength: MAX_ID_LENGTH },
            minItems: 1,
            maxItems: MAX_RECOMMENDATIONS,
            description: "Recommendation ids returned by assess_architecture_intelligence.",
        },
        targetUsers: {
            type: "number",
            minimum: 1,
            maximum: 1_000_000_000,
            description: "Optional scale target used when selecting scale recommendations.",
        },
    },
    required: ["recommendationIds"],
    additionalProperties: false,
};

const ARCHITECTURE_DNA_SCHEMA = {
    type: "object",
    properties: {},
    additionalProperties: false,
};

const ARCHITECTURE_NODE_TYPES = [
    "frontend",
    "backend",
    "api",
    "database",
    "cache",
    "queue",
    "payment",
    "auth",
    "service",
    "external",
    "gateway",
    "worker",
    "cdn",
    "observability",
] as const satisfies readonly ArchitectureNodeType[];

const PLANNED_COMPONENT_SCHEMA = {
    type: "object",
    properties: {
        id: { type: "string", maxLength: MAX_ID_LENGTH, description: "Stable unique component id using lowercase kebab-case when possible." },
        label: { type: "string", maxLength: MAX_LABEL_LENGTH, description: "Human-readable software component name." },
        type: { type: "string", enum: [...ARCHITECTURE_NODE_TYPES] },
        description: { type: "string", maxLength: MAX_DESCRIPTION_LENGTH, description: "Concise responsibility and architectural purpose." },
    },
    required: ["id", "label", "type", "description"],
    additionalProperties: false,
} as const;

const PLANNED_CONNECTION_SCHEMA = {
    type: "object",
    properties: {
        sourceId: { type: "string", maxLength: MAX_ID_LENGTH },
        targetId: { type: "string", maxLength: MAX_ID_LENGTH },
        label: { type: "string", maxLength: MAX_LABEL_LENGTH },
    },
    required: ["sourceId", "targetId"],
    additionalProperties: false,
} as const;

const ARCHITECT_SYSTEM_SCHEMA = {
    type: "object",
    properties: {
        request: {
            type: "string",
            maxLength: MAX_REQUEST_LENGTH,
            description: "The user's complete product/system brief. Preserve important domain, scale, realtime, security, data, AI, media, and integration constraints.",
        },
        targetUsers: {
            type: "number",
            description: "Optional explicit user-scale target. Omit when the brief contains no meaningful scale requirement.",
        },
        replaceCurrent: {
            type: "boolean",
            description: "Replace the current canvas before building. Defaults to true. Set false only when ids are guaranteed not to conflict with existing nodes.",
        },
        autoFix: {
            type: "boolean",
            description: "Automatically repair deterministic structural findings after the initial build. Defaults to true.",
        },
        components: {
            type: "array",
            maxItems: MAX_COMPONENTS,
            items: PLANNED_COMPONENT_SCHEMA,
            description: "Optional agent-authored architecture plan. For arbitrary briefs, provide the components you infer semantically so PromptFlow can apply the whole plan in one tool call. Omit to use PromptFlow's local intent compiler fallback.",
        },
        connections: {
            type: "array",
            maxItems: MAX_CONNECTIONS,
            items: PLANNED_CONNECTION_SCHEMA,
            description: "Relationships between the optional agent-authored components.",
        },
    },
    required: ["request"],
    additionalProperties: false,
} as const;

const TARGET_SCALE_SCHEMA = {
    type: "object",
    properties: {
        targetUsers: { type: "number", description: "Target user/traffic scale to simulate." },
    },
    required: ["targetUsers"],
    additionalProperties: false,
} as const;

const RECOMMEND_SCHEMA = {
    type: "object",
    properties: {
        targetUsers: { type: "number", description: "Optional future scale target used to include capacity recommendations." },
    },
    additionalProperties: false,
} as const;

const APPLY_RECOMMENDATIONS_SCHEMA = {
    type: "object",
    properties: {
        fixStructural: {
            type: "boolean",
            description: "Apply deterministic fixes for the latest structural findings. Defaults to true.",
        },
        targetUsers: {
            type: "number",
            description: "Optional target scale. When supplied, apply PromptFlow's deterministic scaling patterns in the same transaction flow.",
        },
    },
    additionalProperties: false,
} as const;

const EXPLAIN_SCHEMA = {
    type: "object",
    properties: {
        nodeId: {
            type: "string",
            maxLength: MAX_ID_LENGTH,
            description: "Optional component id. Omit for a whole-system explanation.",
        },
    },
    additionalProperties: false,
} as const;

const IMPLEMENTATION_ASSESS_SCHEMA = {
    type: "object",
    properties: {},
    additionalProperties: false,
} as const;

const IMPLEMENTATION_CONTRACT_SCHEMA = {
    type: "object",
    properties: {},
    additionalProperties: false,
} as const;

const IMPLEMENTATION_PLAN_SCHEMA = {
    type: "object",
    properties: {
        includeTests: {
            type: "boolean",
            description: "Whether to include the generated test strategy. Defaults to true.",
        },
        includeEnvironment: {
            type: "boolean",
            description: "Whether to include environment and secret requirements. Defaults to true.",
        },
    },
    additionalProperties: false,
} as const;

const CODE_GENERATION_SCHEMA = {
    type: "object",
    properties: {
        includeTests: { type: "boolean", description: "Include executable test scaffolds. Defaults to true." },
    },
    additionalProperties: false,
} as const;

const EMPTY_SCHEMA = {
    type: "object",
    properties: {},
    additionalProperties: false,
} as const;

const VERSION_CREATE_SCHEMA = {
    type: "object",
    properties: {
        name: { type: "string", maxLength: 120, description: "Optional human-readable version name." },
        message: { type: "string", maxLength: 400, description: "Short reason or release note for this architecture checkpoint." },
    },
    additionalProperties: false,
} as const;

const VERSION_COMPARE_SCHEMA = {
    type: "object",
    properties: {
        fromVersion: { type: "number", minimum: 1 },
        toVersion: { type: "number", minimum: 1 },
    },
    required: ["fromVersion", "toVersion"],
    additionalProperties: false,
} as const;

const MIGRATION_SCHEMA = {
    type: "object",
    properties: {
        fromVersion: { type: "number", minimum: 1 },
        toVersion: { type: "number", minimum: 1 },
    },
    required: ["fromVersion", "toVersion"],
    additionalProperties: false,
} as const;

const RESTORE_VERSION_SCHEMA = {
    type: "object",
    properties: {
        version: { type: "number", minimum: 1 },
        versionId: { type: "string", maxLength: MAX_ID_LENGTH },
    },
    additionalProperties: false,
} as const;


const DIGITAL_TWIN_SCHEMA = {
    type: "object",
    properties: {
        targetUsers: { type: "number", minimum: 1, maximum: 1_000_000_000, description: "Optional user scale for the load scenario." },
        scenarios: {
            type: "array",
            minItems: 1,
            maxItems: 8,
            items: {
                type: "object",
                properties: {
                    kind: {
                        type: "string",
                        enum: [
                            "load-spike",
                            "database-failure",
                            "compute-failure",
                            "cache-failure",
                            "queue-failure",
                            "external-dependency-failure",
                            "region-outage",
                        ],
                    },
                    label: { type: "string", maxLength: MAX_LABEL_LENGTH },
                    targetUsers: { type: "number", minimum: 1, maximum: 1_000_000_000 },
                    targetNodeId: { type: "string", maxLength: MAX_ID_LENGTH },
                },
                required: ["kind", "label"],
                additionalProperties: false,
            },
        },
    },
    additionalProperties: false,
} as const;

const FAILURE_SCHEMA = {
    type: "object",
    properties: {
        kind: {
            type: "string",
            enum: [
                "database-failure",
                "compute-failure",
                "cache-failure",
                "queue-failure",
                "external-dependency-failure",
                "region-outage",
            ],
        },
        targetNodeId: { type: "string", maxLength: MAX_ID_LENGTH },
    },
    required: ["kind"],
    additionalProperties: false,
} as const;

const LOAD_SCHEMA = {
    type: "object",
    properties: {
        targetUsers: { type: "number", minimum: 1, maximum: 1_000_000_000 },
    },
    required: ["targetUsers"],
    additionalProperties: false,
} as const;

const HARDENING_SCHEMA = {
    type: "object",
    properties: {
        targetUsers: { type: "number", minimum: 1, maximum: 1_000_000_000 },
    },
    additionalProperties: false,
} as const;

interface ArchitectSystemInput {
    request: string;
    targetUsers?: number;
    replaceCurrent: boolean;
    autoFix: boolean;
    components?: AgentPlannedComponent[];
    connections?: AgentPlannedConnection[];
}

interface ApplyRecommendationsInput {
    fixStructural: boolean;
    targetUsers?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
    return typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
    return typeof value === "boolean";
}

function isNonEmptyString(value: unknown, maxLength: number): value is string {
    return isString(value) && value.trim().length > 0 && value.length <= maxLength;
}

function isArchitectureNodeType(value: unknown): value is ArchitectureNodeType {
    return ARCHITECTURE_NODE_TYPES.some((type) => type === value);
}

function parseComponents(value: unknown): AgentPlannedComponent[] | undefined {
    if (value === undefined) return undefined;
    if (!Array.isArray(value) || value.length === 0 || value.length > MAX_COMPONENTS) {
        throw new Error("components must contain between 1 and 40 architecture components.");
    }

    const ids = new Set<string>();
    return value.map((item) => {
        if (
            !isRecord(item) ||
            !isNonEmptyString(item.id, MAX_ID_LENGTH) ||
            !isNonEmptyString(item.label, MAX_LABEL_LENGTH) ||
            !isArchitectureNodeType(item.type) ||
            !isNonEmptyString(item.description, MAX_DESCRIPTION_LENGTH)
        ) {
            throw new Error("Invalid architect_system component.");
        }
        if (ids.has(item.id)) throw new Error(`Duplicate planned component id: ${item.id}`);
        ids.add(item.id);
        return {
            id: item.id,
            label: item.label,
            type: item.type,
            description: item.description,
        };
    });
}

function parseConnections(
    value: unknown,
    components?: AgentPlannedComponent[],
): AgentPlannedConnection[] | undefined {
    if (value === undefined) return undefined;
    if (!Array.isArray(value) || value.length > MAX_CONNECTIONS) {
        throw new Error("connections must contain at most 80 relationships.");
    }
    if (!components) {
        throw new Error("connections require an explicit components plan.");
    }

    const ids = new Set(components.map((component) => component.id));
    const seen = new Set<string>();
    return value.map((item) => {
        if (
            !isRecord(item) ||
            !isNonEmptyString(item.sourceId, MAX_ID_LENGTH) ||
            !isNonEmptyString(item.targetId, MAX_ID_LENGTH)
        ) {
            throw new Error("Invalid architect_system connection.");
        }
        if (!ids.has(item.sourceId) || !ids.has(item.targetId)) {
            throw new Error(`Planned connection references an unknown component: ${item.sourceId} → ${item.targetId}`);
        }
        if (item.sourceId === item.targetId) throw new Error("A planned component cannot connect to itself.");
        const label = item.label;
        if (label !== undefined && (!isString(label) || label.length > MAX_LABEL_LENGTH)) {
            throw new Error("Invalid architect_system connection label.");
        }
        const key = `${item.sourceId}\u0000${item.targetId}`;
        if (seen.has(key)) throw new Error(`Duplicate planned connection: ${item.sourceId} → ${item.targetId}`);
        seen.add(key);
        return {
            sourceId: item.sourceId,
            targetId: item.targetId,
            ...(isString(label) && label.length > 0 ? { label } : {}),
        };
    });
}

function parseArchitectSystemInput(value: unknown): ArchitectSystemInput {
    if (!isRecord(value) || !isNonEmptyString(value.request, MAX_REQUEST_LENGTH)) {
        throw new Error("Invalid architect_system input.");
    }
    if (value.targetUsers !== undefined && (!isFiniteNumber(value.targetUsers) || value.targetUsers <= 0)) {
        throw new Error("targetUsers must be a positive finite number.");
    }
    if (value.replaceCurrent !== undefined && !isBoolean(value.replaceCurrent)) {
        throw new Error("replaceCurrent must be boolean.");
    }
    if (value.autoFix !== undefined && !isBoolean(value.autoFix)) {
        throw new Error("autoFix must be boolean.");
    }

    const components = parseComponents(value.components);
    const connections = parseConnections(value.connections, components);

    return {
        request: value.request,
        targetUsers: value.targetUsers as number | undefined,
        replaceCurrent: value.replaceCurrent === undefined ? true : value.replaceCurrent as boolean,
        autoFix: value.autoFix === undefined ? true : value.autoFix as boolean,
        components,
        connections,
    };
}

function parseTargetUsers(value: unknown): number {
    if (!isRecord(value) || !isFiniteNumber(value.targetUsers) || value.targetUsers <= 0) {
        throw new Error("targetUsers must be a positive finite number.");
    }
    return value.targetUsers;
}

function parseOptionalTargetUsers(value: unknown): number | undefined {
    if (value === undefined || value === null) return undefined;
    if (!isRecord(value)) throw new Error("Invalid recommendation input.");
    if (value.targetUsers === undefined) return undefined;
    if (!isFiniteNumber(value.targetUsers) || value.targetUsers <= 0) {
        throw new Error("targetUsers must be a positive finite number.");
    }
    return value.targetUsers;
}

function parseStressTestInput(value: unknown): { targetUsers: number } {
    const targetUsers = parseTargetUsers(value);
    if (targetUsers > 1_000_000_000) {
        throw new Error("targetUsers must not exceed 1 billion.");
    }
    return { targetUsers };
}

function parseApplyIntelligenceInput(value: unknown): { recommendationIds: string[]; targetUsers?: number } {
    if (!isRecord(value) || !Array.isArray(value.recommendationIds) || value.recommendationIds.length === 0 || value.recommendationIds.length > MAX_RECOMMENDATIONS) {
        throw new Error("recommendationIds must contain between 1 and 20 ids.");
    }
    if (value.recommendationIds.some((id) => !isNonEmptyString(id, MAX_ID_LENGTH))) {
        throw new Error("Invalid recommendation id.");
    }
    return {
        recommendationIds: value.recommendationIds as string[],
        targetUsers: parseOptionalTargetUsers(value),
    };
}

function parseApplyRecommendations(value: unknown): ApplyRecommendationsInput {
    if (value === undefined || value === null) return { fixStructural: true };
    if (!isRecord(value)) throw new Error("Invalid apply_architecture_recommendations input.");
    if (value.fixStructural !== undefined && !isBoolean(value.fixStructural)) {
        throw new Error("fixStructural must be boolean.");
    }
    if (value.targetUsers !== undefined && (!isFiniteNumber(value.targetUsers) || value.targetUsers <= 0)) {
        throw new Error("targetUsers must be a positive finite number.");
    }
    return {
        fixStructural: value.fixStructural === undefined ? true : value.fixStructural as boolean,
        targetUsers: value.targetUsers as number | undefined,
    };
}

function parseNodeId(value: unknown): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (!isRecord(value)) throw new Error("Invalid explain_architecture input.");
    if (value.nodeId === undefined) return undefined;
    if (!isNonEmptyString(value.nodeId, MAX_ID_LENGTH)) throw new Error("Invalid nodeId.");
    return value.nodeId;
}


type FailureKind = Exclude<import("../types/digitalTwin").DigitalTwinScenarioKind, "load-spike">;

function parseDigitalTwinInput(value: unknown): {
    targetUsers?: number;
    scenarios: import("../types/digitalTwin").DigitalTwinEvent[];
} {
    if (!isRecord(value)) throw new Error("Invalid digital twin input.");
    const targetUsers = value.targetUsers === undefined ? undefined : parsePositiveScale(value.targetUsers);
    if (!Array.isArray(value.scenarios) || value.scenarios.length === 0 || value.scenarios.length > 8) {
        throw new Error("scenarios must contain between 1 and 8 events.");
    }
    const scenarios = value.scenarios.map((item) => {
        if (!isRecord(item) || !isNonEmptyString(item.label, MAX_LABEL_LENGTH) || !isNonEmptyString(item.kind, 80)) {
            throw new Error("Invalid digital twin scenario.");
        }
        const allowed = [
            "load-spike",
            "database-failure",
            "compute-failure",
            "cache-failure",
            "queue-failure",
            "external-dependency-failure",
            "region-outage",
        ] as const;
        if (!allowed.includes(item.kind as typeof allowed[number])) throw new Error("Invalid digital twin scenario kind.");
        const nodeId = item.targetNodeId === undefined ? undefined : parseBoundedNodeId(item.targetNodeId);
        const eventTargetUsers = item.targetUsers === undefined ? undefined : parsePositiveScale(item.targetUsers);
        return {
            kind: item.kind as import("../types/digitalTwin").DigitalTwinScenarioKind,
            label: item.label,
            ...(eventTargetUsers !== undefined ? { targetUsers: eventTargetUsers } : {}),
            ...(nodeId !== undefined ? { targetNodeId: nodeId } : {}),
        };
    });
    return { targetUsers, scenarios };
}

function parseBoundedNodeId(value: unknown): string {
    if (!isNonEmptyString(value, MAX_ID_LENGTH)) throw new Error("Invalid targetNodeId.");
    return value;
}

function parsePositiveScale(value: unknown): number {
    if (!isFiniteNumber(value) || value <= 0 || value > 1_000_000_000) {
        throw new Error("Scale must be between 1 and 1 billion.");
    }
    return value;
}

function parseFailureInput(value: unknown): { kind: FailureKind; targetNodeId?: string } {
    if (!isRecord(value) || !isNonEmptyString(value.kind, 80)) throw new Error("Invalid failure simulation input.");
    const kinds: FailureKind[] = [
        "database-failure",
        "compute-failure",
        "cache-failure",
        "queue-failure",
        "external-dependency-failure",
        "region-outage",
    ];
    if (!kinds.includes(value.kind as FailureKind)) throw new Error("Unsupported failure scenario.");
    if (value.targetNodeId !== undefined && !isNonEmptyString(value.targetNodeId, MAX_ID_LENGTH)) {
        throw new Error("Invalid targetNodeId.");
    }
    return { kind: value.kind as FailureKind, targetNodeId: value.targetNodeId as string | undefined };
}

function json(data: Record<string, unknown>): string {
    return JSON.stringify({ ok: true, ...data });
}

export const AGENT_OS_TOOL_NAMES = [
    "architect_system",
    "analyze_architecture",
    "recommend_architecture",
    "simulate_architecture_scale",
    "apply_architecture_recommendations",
    "explain_architecture",
    "generate_implementation_plan",
    "assess_architecture_intelligence",
    "stress_test_architecture",
    "get_architecture_dna",
    "apply_intelligence_recommendations",
    "run_digital_twin",
    "simulate_failure",
    "simulate_load",
    "apply_digital_twin_hardening",
    "assess_implementation_readiness",
    "generate_project_blueprint",
    "generate_implementation_contracts",
    "generate_project_code",
    "validate_generated_project",
    "run_project_execution_preflight",
    "review_generated_project",
    "prepare_build_workspace",
    "export_project_artifacts",
    "run_final_hackathon_demo",
    "run_project_execution_loop",
    "diagnose_execution_failure",
    "create_architecture_version",
    "list_architecture_versions",
    "compare_architecture_versions",
    "plan_architecture_migration",
    "restore_architecture_version",
    "clear_version_analysis",
    "run_production_qa",
    "run_judge_mode",
] as const;

export function createAgentOSTools(): WebMCPToolDefinition[] {
    return [
        {
            name: AGENT_OS_TOOL_NAMES[0],
            title: "Architect a complete system",
            description: "PRIMARY PromptFlow Agent OS tool. Turn an arbitrary product/system brief into a complete live architecture in one round-trip. For best semantic fidelity, the AI agent should provide its inferred components and connections; PromptFlow validates, applies, scales, structurally repairs, lays out, and verifies the graph atomically. If components are omitted, PromptFlow falls back to its fast local intent compiler.",
            inputSchema: ARCHITECT_SYSTEM_SCHEMA,
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
            execute: async (rawInput) => {
                const input = parseArchitectSystemInput(rawInput);
                const blueprint = buildAgentArchitectureBlueprint(
                    input.request,
                    input.components,
                    input.connections,
                    input.targetUsers,
                );
                const store = useCanvasStore.getState();
                const validationNodes = input.replaceCurrent ? [] : store.nodes;
                const validationEdges = input.replaceCurrent ? [] : store.edges;
                validateTransformOperations(validationNodes, validationEdges, blueprint.operations);

                if (input.replaceCurrent) store.clearCanvas();
                useCanvasStore.getState().applyTransform(blueprint.operations);

                let operationsApplied = blueprint.operations.length;
                const scaleTarget = blueprint.targetUsers;
                if (scaleTarget >= 100_000) {
                    const current = useCanvasStore.getState();
                    const scaleOperations = buildScaleOperations(current.nodes, current.edges, scaleTarget);
                    validateTransformOperations(current.nodes, current.edges, scaleOperations);
                    if (scaleOperations.length > 0) {
                        current.applyTransform(scaleOperations);
                        operationsApplied += scaleOperations.length;
                    }
                }

                if (input.autoFix) {
                    const current = useCanvasStore.getState();
                    const initialAudit = auditArchitecture(current.nodes, current.edges);
                    const fixOperations = buildFixOperations(current.nodes, current.edges, initialAudit);
                    validateTransformOperations(current.nodes, current.edges, fixOperations);
                    if (fixOperations.length > 0) {
                        current.applyTransform(fixOperations);
                        operationsApplied += fixOperations.length;
                    }
                }

                useCanvasStore.getState().autoLayout();
                const finalState = useCanvasStore.getState();
                const audit = auditArchitecture(finalState.nodes, finalState.edges);
                finalState.setAudit(audit);

                return json({
                    message: "Agent OS architecture completed and verified.",
                    planSource: blueprint.source,
                    request: blueprint.request,
                    domain: blueprint.domain,
                    targetUsers: scaleTarget,
                    technologies: blueprint.technologies,
                    requirements: blueprint.requirements,
                    operationsApplied,
                    nodeCount: finalState.nodes.length,
                    connectionCount: finalState.edges.length,
                    audit,
                });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[1],
            title: "Analyze architecture",
            description: "Read the live PromptFlow graph and return structural audit, architecture metrics, represented capabilities, and graph counts without mutating the canvas.",
            inputSchema: EMPTY_SCHEMA,
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
            execute: async () => {
                const { nodes, edges } = useCanvasStore.getState();
                return json({
                    audit: auditArchitecture(nodes, edges),
                    metrics: getArchitectureMetrics(nodes, edges),
                    recommendations: recommendArchitecture(nodes, edges),
                });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[2],
            title: "Recommend architecture changes",
            description: "Act like a senior architecture reviewer. Return prioritized structural, scale, security-boundary, and observability recommendations. Recommendations are explicit and do not mutate the graph.",
            inputSchema: RECOMMEND_SCHEMA,
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
            execute: async (rawInput) => {
                const targetUsers = parseOptionalTargetUsers(rawInput);
                const { nodes, edges } = useCanvasStore.getState();
                return json({
                    targetUsers: targetUsers ?? null,
                    audit: auditArchitecture(nodes, edges),
                    recommendations: recommendArchitecture(nodes, edges, targetUsers),
                });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[3],
            title: "Simulate architecture scale",
            description: "Run a non-destructive what-if simulation for a target scale. Return the exact projected operations plus before/after metrics and audits so the agent can reason before changing the live architecture.",
            inputSchema: TARGET_SCALE_SCHEMA,
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
            execute: async (rawInput) => {
                const targetUsers = parseTargetUsers(rawInput);
                const { nodes, edges } = useCanvasStore.getState();
                const simulation = simulateArchitectureScale(nodes, edges, targetUsers);
                validateTransformOperations(nodes, edges, simulation.operations);
                return json({ simulation });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[4],
            title: "Apply architecture recommendations",
            description: "Apply deterministic structural fixes and/or a requested scale plan in one agent round-trip, then auto-layout and verify the resulting architecture.",
            inputSchema: APPLY_RECOMMENDATIONS_SCHEMA,
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
            execute: async (rawInput) => {
                const input = parseApplyRecommendations(rawInput);
                let operationsApplied = 0;

                if (input.fixStructural) {
                    const current = useCanvasStore.getState();
                    const audit = auditArchitecture(current.nodes, current.edges);
                    const fixOperations = buildFixOperations(current.nodes, current.edges, audit);
                    validateTransformOperations(current.nodes, current.edges, fixOperations);
                    if (fixOperations.length > 0) {
                        current.applyTransform(fixOperations);
                        operationsApplied += fixOperations.length;
                    }
                }

                if (input.targetUsers !== undefined) {
                    const current = useCanvasStore.getState();
                    const scaleOperations = buildScaleOperations(current.nodes, current.edges, input.targetUsers);
                    validateTransformOperations(current.nodes, current.edges, scaleOperations);
                    if (scaleOperations.length > 0) {
                        current.applyTransform(scaleOperations);
                        operationsApplied += scaleOperations.length;
                    }
                }

                if (operationsApplied > 0) useCanvasStore.getState().autoLayout();
                const finalState = useCanvasStore.getState();
                const audit = auditArchitecture(finalState.nodes, finalState.edges);
                finalState.setAudit(audit);
                return json({
                    message: "Architecture recommendations applied and verified.",
                    targetUsers: input.targetUsers ?? null,
                    operationsApplied,
                    nodeCount: finalState.nodes.length,
                    connectionCount: finalState.edges.length,
                    audit,
                });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[5],
            title: "Explain architecture",
            description: "Explain the whole architecture or one component using the live graph as source of truth, including upstream/downstream dependencies and represented capabilities.",
            inputSchema: EXPLAIN_SCHEMA,
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
            execute: async (rawInput) => {
                const nodeId = parseNodeId(rawInput);
                const { nodes, edges } = useCanvasStore.getState();
                return json({ explanation: explainArchitecture(nodes, edges, nodeId) });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[6],
            title: "Generate implementation plan",
            description: "Convert the live architecture into an ordered implementation plan with foundation, core services, delivery, integrations, and recommended first code targets. This is planning metadata; it does not fabricate source code.",
            inputSchema: EMPTY_SCHEMA,
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
            execute: async () => {
                const { nodes, edges } = useCanvasStore.getState();
                const blueprint = analyzeImplementationIntelligence(nodes, edges);
                useCanvasStore.getState().setImplementation(blueprint);
                return json({ implementationPlan: blueprint });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[7],
            title: "Assess architecture intelligence",
            description: "Run the full architecture-intelligence review across reliability, scalability, performance, security, resilience, observability, stress readiness, findings, recommendations, and Architecture DNA. This is a deterministic heuristic preflight, not a security certification or capacity guarantee.",
            inputSchema: INTELLIGENCE_ASSESS_SCHEMA,
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
            execute: async (rawInput) => {
                const targetUsers = parseOptionalTargetUsers(rawInput);
                const { nodes, edges } = useCanvasStore.getState();
                const report = analyzeArchitectureIntelligence(nodes, edges, targetUsers);
                useCanvasStore.getState().clearAudit();
                useCanvasStore.getState().setIntelligence(report);
                return json({ intelligence: report });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[8],
            title: "Stress test architecture",
            description: "Run a non-destructive heuristic scale and failure-pressure simulation for a concrete target population. Returns modelled RPS pressure, bottlenecks, failure modes, and projected intelligence.",
            inputSchema: STRESS_TEST_SCHEMA,
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
            execute: async (rawInput) => {
                const { targetUsers } = parseStressTestInput(rawInput);
                const { nodes, edges } = useCanvasStore.getState();
                const stressTest = runArchitectureStressTest(nodes, edges, targetUsers);
                const report = analyzeArchitectureIntelligence(nodes, edges, targetUsers);
                useCanvasStore.getState().clearAudit();
                useCanvasStore.getState().setIntelligence({ ...report, stressTest });
                return json({ stressTest });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[9],
            title: "Get architecture DNA",
            description: "Return the architecture's deterministic DNA: archetype, structural fingerprint, traits, strengths, and likely bottlenecks.",
            inputSchema: ARCHITECTURE_DNA_SCHEMA,
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
            execute: async () => {
                const { nodes, edges } = useCanvasStore.getState();
                const report = analyzeArchitectureIntelligence(nodes, edges);
                useCanvasStore.getState().clearAudit();
                useCanvasStore.getState().setIntelligence(report);
                return json({ dna: report.dna });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[10],
            title: "Apply intelligence recommendations",
            description: "Apply selected safe architecture-intelligence recommendations as a validated batch, then re-assess the live graph. Review-only recommendations intentionally produce no mutation.",
            inputSchema: APPLY_INTELLIGENCE_SCHEMA,
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
            execute: async (rawInput) => {
                const input = parseApplyIntelligenceInput(rawInput);
                const store = useCanvasStore.getState();
                const operations = applyIntelligenceRecommendationOperations(
                    store.nodes,
                    store.edges,
                    input.recommendationIds,
                    input.targetUsers,
                );
                validateTransformOperations(store.nodes, store.edges, operations);
                if (operations.length > 0) {
                    store.applyTransform(operations);
                    store.autoLayout();
                }
                const finalState = useCanvasStore.getState();
                const report = analyzeArchitectureIntelligence(
                    finalState.nodes,
                    finalState.edges,
                    input.targetUsers,
                );
                finalState.clearAudit();
                finalState.setIntelligence(report);
                return json({
                    operationsApplied: operations.length,
                    recommendationIds: input.recommendationIds,
                    intelligence: report,
                });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[11],
            title: "Run digital twin",
            description: "Run a non-destructive multi-scenario digital-twin simulation against the live architecture. Model load spikes, component failures, dependency failures, and regional outages, including failure propagation, survivability, recovery strategy, and critical paths.",
            inputSchema: DIGITAL_TWIN_SCHEMA,
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
            execute: async (rawInput) => {
                const input = parseDigitalTwinInput(rawInput);
                const { nodes, edges } = useCanvasStore.getState();
                const report = runDigitalTwin(nodes, edges, input.scenarios, input.targetUsers);
                useCanvasStore.getState().setDigitalTwin(report);
                return json({ digitalTwin: report });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[12],
            title: "Simulate failure",
            description: "Inject a named failure into the architecture model without changing the live canvas. Return affected components, propagation depth, failure modes, survivability, and recovery strategy.",
            inputSchema: FAILURE_SCHEMA,
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
            execute: async (rawInput) => {
                const input = parseFailureInput(rawInput);
                const { nodes, edges } = useCanvasStore.getState();
                const report = simulateFailure(nodes, edges, input.kind, input.targetNodeId);
                useCanvasStore.getState().setDigitalTwin(report);
                return json({ scenario: report.scenarios[0] ?? null, digitalTwin: report });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[13],
            title: "Simulate load",
            description: "Model a production traffic spike for a target population without mutating the architecture. Return estimated sustained/burst RPS, bottlenecks, survivability, and hardening priorities.",
            inputSchema: LOAD_SCHEMA,
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
            execute: async (rawInput) => {
                if (!isRecord(rawInput)) throw new Error("Invalid load simulation input.");
                const targetUsers = parsePositiveScale(rawInput.targetUsers);
                const { nodes, edges } = useCanvasStore.getState();
                const report = simulateLoad(nodes, edges, targetUsers);
                useCanvasStore.getState().setDigitalTwin(report);
                return json({ loadProfile: report.loadProfile, scenario: report.scenarios[0] ?? null, digitalTwin: report });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[14],
            title: "Apply digital twin hardening",
            description: "Apply safe, deterministic hardening derived from the digital-twin model: scale patterns, observability, and cache where appropriate. Validate the batch, re-layout, then return the post-hardening simulation and audit.",
            inputSchema: HARDENING_SCHEMA,
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
            execute: async (rawInput) => {
                const targetUsers = isRecord(rawInput) && rawInput.targetUsers !== undefined
                    ? parsePositiveScale(rawInput.targetUsers)
                    : undefined;
                const store = useCanvasStore.getState();
                const operations = buildHardeningOperations(store.nodes, store.edges, targetUsers);
                validateTransformOperations(store.nodes, store.edges, operations);
                if (operations.length > 0) {
                    store.applyTransform(operations);
                    store.autoLayout();
                }
                const finalState = useCanvasStore.getState();
                const report = runDigitalTwin(
                    finalState.nodes,
                    finalState.edges,
                    [{ kind: "load-spike", label: "Post-hardening load validation", ...(targetUsers !== undefined ? { targetUsers } : {}) }],
                    targetUsers,
                );
                finalState.setDigitalTwin(report);
                finalState.setAudit(auditArchitecture(finalState.nodes, finalState.edges));
                return json({
                    operationsApplied: operations.length,
                    digitalTwin: report,
                    audit: auditArchitecture(finalState.nodes, finalState.edges),
                });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[15],
            title: "Assess implementation readiness",
            description: "Review the live architecture as an implementation lead. Return a deterministic readiness score, component work map, risks, missing code artifacts, and production-oriented test targets. This is planning intelligence, not generated source code.",
            inputSchema: IMPLEMENTATION_ASSESS_SCHEMA,
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
            execute: async () => {
                const { nodes, edges } = useCanvasStore.getState();
                const blueprint = analyzeImplementationIntelligence(nodes, edges);
                useCanvasStore.getState().setImplementation(blueprint);
                return json({ implementationReadiness: blueprint });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[16],
            title: "Generate project blueprint",
            description: "Translate the live architecture into a concrete implementation blueprint: project structure, ordered delivery phases, component files, environment contract, risks, tests, and recommended first files. Does not mutate the canvas or pretend to generate source code.",
            inputSchema: IMPLEMENTATION_PLAN_SCHEMA,
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
            execute: async (rawInput) => {
                const input = isRecord(rawInput) ? rawInput : {};
                const includeTests = input.includeTests !== false;
                const includeEnvironment = input.includeEnvironment !== false;
                const { nodes, edges } = useCanvasStore.getState();
                const blueprint = analyzeImplementationIntelligence(nodes, edges);
                useCanvasStore.getState().setImplementation(blueprint);
                return json({
                    projectBlueprint: {
                        ...blueprint,
                        ...(includeTests ? {} : { tests: undefined }),
                        ...(includeEnvironment ? {} : { environment: undefined }),
                    },
                });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[17],
            title: "Generate implementation contracts",
            description: "Map every represented architecture relationship into an implementation contract with boundary kind, inputs, outputs, and reliability requirements. Use this before writing service-to-service, event, data, or external integration code.",
            inputSchema: IMPLEMENTATION_CONTRACT_SCHEMA,
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
            execute: async () => {
                const { nodes, edges } = useCanvasStore.getState();
                const contracts = generateImplementationContracts(nodes, edges);
                return json({
                    contractCount: contracts.length,
                    contracts,
                });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[18],
            title: "Generate project code",
            description: "Generate a bounded, inspectable project scaffold from the live architecture: manifest, runtime configuration, source boundaries, tests, contracts documentation, and architecture documentation. This mutates only the generated artifact workspace, not the architecture graph.",
            inputSchema: CODE_GENERATION_SCHEMA,
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
            execute: async () => {
                const { nodes, edges } = useCanvasStore.getState();
                const project = generateProjectFromArchitecture(nodes, edges);
                useCanvasStore.getState().setCodeGeneration(project);
                return json({ project });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[19],
            title: "Validate generated project",
            description: "Validate the current generated project artifact set for manifest, executable source, tests, path integrity, and execution readiness without changing files or the canvas.",
            inputSchema: EMPTY_SCHEMA,
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
            execute: async () => {
                const project = useCanvasStore.getState().codeGeneration;
                if (!project) throw new Error("No generated project exists. Run generate_project_code first.");
                const execution = validateGeneratedProject(project);
                useCanvasStore.getState().setCodeGeneration({ ...project, execution });
                return json({ execution });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[20],
            title: "Run project execution preflight",
            description: "Evaluate whether the generated project is ready for install, test, build, and local execution. This is a static browser-side preflight; it does not execute arbitrary generated code.",
            inputSchema: EMPTY_SCHEMA,
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
            execute: async () => {
                const project = useCanvasStore.getState().codeGeneration;
                if (!project) throw new Error("No generated project exists. Run generate_project_code first.");
                const execution = validateGeneratedProject(project);
                useCanvasStore.getState().setCodeGeneration({ ...project, execution });
                return json({
                    execution,
                    note: "PromptFlow performs a static execution preflight in-browser. Arbitrary generated code is not executed inside the host page.",
                });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[21],
            title: "Review generated project",
            description: "Run a deterministic production-code review over generated artifacts for secrets, unfinished markers, missing contracts, tests, manifests, and entrypoints. This is a heuristic review, not a security certification.",
            inputSchema: EMPTY_SCHEMA,
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
            execute: async () => {
                const project = useCanvasStore.getState().codeGeneration;
                if (!project) throw new Error("No generated project exists. Run generate_project_code first.");
                const review = reviewGeneratedProject(project);
                useCanvasStore.getState().setCodeReview(review);
                return json({ review });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[22],
            title: "Prepare build workspace",
            description: "Materialize the current generated artifacts as an inspectable browser-side build workspace with a manifest and execution preflight. No arbitrary code is executed.",
            inputSchema: EMPTY_SCHEMA,
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
            execute: async () => {
                const project = useCanvasStore.getState().codeGeneration;
                if (!project) throw new Error("No generated project exists. Run generate_project_code first.");
                const workspace = createProjectWorkspace(project);
                useCanvasStore.getState().setWorkspace(workspace);
                return json({ workspace: { projectName: workspace.projectName, fileCount: workspace.files.length, fingerprint: workspace.fingerprint, execution: workspace.execution } });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[23],
            title: "Export project artifacts",
            description: "Export the current generated project and PromptFlow workspace manifest as a standards-compatible ZIP directly from the browser. No server upload is performed.",
            inputSchema: EMPTY_SCHEMA,
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
            execute: async () => {
                const project = useCanvasStore.getState().codeGeneration;
                if (!project) throw new Error("No generated project exists. Run generate_project_code first.");
                const workspace = createProjectWorkspace(project);
                useCanvasStore.getState().setWorkspace(workspace);
                const exported = exportProjectWorkspace(project);
                return json({ exported, note: "The ZIP was generated locally in the browser; PromptFlow does not upload project source." });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[25],
            title: "Run real project execution loop",
            description: "Execute the generated Node.js/React project inside an isolated browser-native WebContainer: mount artifacts, install dependencies, run tests, run the production build, diagnose failures, and apply a bounded deterministic self-healing patch before retrying. Host-page code is never executed.",
            inputSchema: {
                type: "object",
                properties: {
                    maxHealingAttempts: { type: "number", minimum: 0, maximum: 3 },
                    installTimeoutMs: { type: "number", minimum: 10_000, maximum: 180_000 },
                    commandTimeoutMs: { type: "number", minimum: 10_000, maximum: 120_000 },
                    enableSelfHealing: { type: "boolean" },
                },
                additionalProperties: false,
            },
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
            execute: async (rawInput) => {
                const input = isRecord(rawInput) ? rawInput : {};
                const project = useCanvasStore.getState().codeGeneration;
                if (!project) throw new Error("No generated project exists. Run generate_project_code first.");
                const maxHealingAttempts = typeof input.maxHealingAttempts === "number" ? Math.floor(input.maxHealingAttempts) : undefined;
                const installTimeoutMs = typeof input.installTimeoutMs === "number" ? Math.floor(input.installTimeoutMs) : undefined;
                const commandTimeoutMs = typeof input.commandTimeoutMs === "number" ? Math.floor(input.commandTimeoutMs) : undefined;
                const enableSelfHealing = typeof input.enableSelfHealing === "boolean" ? input.enableSelfHealing : undefined;
                const result = await executeProject(project, {
                    ...(maxHealingAttempts !== undefined ? { maxHealingAttempts } : {}),
                    ...(installTimeoutMs !== undefined ? { installTimeoutMs } : {}),
                    ...(commandTimeoutMs !== undefined ? { commandTimeoutMs } : {}),
                    ...(enableSelfHealing !== undefined ? { enableSelfHealing } : {}),
                });
                if (result.artifacts !== project.artifacts) {
                    useCanvasStore.getState().setCodeGeneration({
                        ...project,
                        generatedAt: Date.now(),
                        artifacts: result.artifacts,
                        execution: {
                            ...project.execution,
                            generatedAt: Date.now(),
                            buildReady: result.status === "passed",
                            runReady: result.status === "passed",
                        },
                    });
                }
                useCanvasStore.getState().setExecution(result);
                return json({ execution: result });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[26],
            title: "Diagnose execution failure",
            description: "Classify the latest execution failure into a bounded diagnostic category with evidence and confidence. This tool never mutates the project.",
            inputSchema: {
                type: "object",
                properties: {},
                additionalProperties: false,
            },
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
            execute: async () => {
                const execution = useCanvasStore.getState().execution;
                if (!execution) throw new Error("No execution result exists. Run run_project_execution_loop first.");
                return json({
                    diagnostic: execution.diagnostics[0] ?? null,
                    status: execution.status,
                    healingAttempts: execution.healingAttempts.length,
                });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[24],
            title: "Run final hackathon demo",
            description: "Run the deterministic end-to-end showcase over the current architecture: structural audit, architecture intelligence, load simulation, severe traffic digital twin, implementation intelligence, project generation, execution preflight, and Architecture DNA. Results are stored without mutating the architecture.",
            inputSchema: {
                type: "object",
                properties: { targetUsers: { type: "number", minimum: 1, maximum: 1000000000 } },
                additionalProperties: false,
            },
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
            execute: async (rawInput) => {
                const targetUsers = parseOptionalTargetUsers(rawInput) ?? 10_000_000;
                const { nodes, edges } = useCanvasStore.getState();
                const run = runFinalDemo(nodes, edges, targetUsers);
                useCanvasStore.getState().setFinalDemo(run);
                if (run.project) {
                    useCanvasStore.getState().setCodeGeneration(run.project);
                    useCanvasStore.getState().setWorkspace(createProjectWorkspace(run.project));
                }
                return json({ run });
            },
        },

        {
            name: AGENT_OS_TOOL_NAMES[27],
            title: "Create architecture version",
            description: "Create an immutable architecture checkpoint containing the full graph, fingerprint, audit score, and Architecture DNA. Version history stays local to the current browser session.",
            inputSchema: VERSION_CREATE_SCHEMA,
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
            execute: async (rawInput) => {
                const input = isRecord(rawInput) ? rawInput : {};
                const name = typeof input.name === "string" ? input.name.trim().slice(0, 120) : undefined;
                const message = typeof input.message === "string" ? input.message.trim().slice(0, 400) : undefined;
                const state = useCanvasStore.getState();
                if (state.nodes.length === 0) throw new Error("Cannot version an empty architecture.");
                const version = createArchitectureVersion(
                    state.nodes,
                    state.edges,
                    { name, message, auditScore: state.audit?.score ?? null },
                    state.versioning.versions,
                );
                useCanvasStore.setState((current) => ({
                    versioning: {
                        ...current.versioning,
                        versions: [...current.versioning.versions, version].slice(-50),
                        activeVersionId: version.id,
                        diff: null,
                        migrationPlan: null,
                    },
                }));
                return json({ version });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[28],
            title: "List architecture versions",
            description: "Return the local architecture release history with version number, fingerprint, graph size, audit score, and release message.",
            inputSchema: EMPTY_SCHEMA,
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
            execute: async () => {
                const { versioning } = useCanvasStore.getState();
                return json({
                    activeVersionId: versioning.activeVersionId,
                    versions: versioning.versions.map((version) => ({
                        id: version.id,
                        version: version.version,
                        name: version.name,
                        message: version.message,
                        createdAt: version.createdAt,
                        fingerprint: version.fingerprint,
                        nodeCount: version.nodeCount,
                        connectionCount: version.connectionCount,
                        auditScore: version.auditScore,
                    })),
                });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[29],
            title: "Compare architecture versions",
            description: "Diff two immutable architecture checkpoints by component identity and dependency topology. Classify breaking, significant, and non-breaking changes without mutating the canvas.",
            inputSchema: VERSION_COMPARE_SCHEMA,
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
            execute: async (rawInput) => {
                if (!isRecord(rawInput) || typeof rawInput.fromVersion !== "number" || typeof rawInput.toVersion !== "number") {
                    throw new Error("fromVersion and toVersion are required.");
                }
                const { versions } = useCanvasStore.getState().versioning;
                const from = versions.find((version) => version.version === rawInput.fromVersion);
                const to = versions.find((version) => version.version === rawInput.toVersion);
                if (!from || !to) throw new Error("Requested architecture version was not found.");
                const diff = compareArchitectureVersions(from, to);
                useCanvasStore.getState().setVersionDiff(diff);
                return json({ diff });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[30],
            title: "Plan architecture migration",
            description: "Turn a version diff into an ordered production migration plan covering database compatibility, data backfills, API contracts, infrastructure rollout, application cutover, preflight checks, and rollback.",
            inputSchema: MIGRATION_SCHEMA,
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
            execute: async (rawInput) => {
                if (!isRecord(rawInput) || typeof rawInput.fromVersion !== "number" || typeof rawInput.toVersion !== "number") {
                    throw new Error("fromVersion and toVersion are required.");
                }
                const { versions } = useCanvasStore.getState().versioning;
                const from = versions.find((version) => version.version === rawInput.fromVersion);
                const to = versions.find((version) => version.version === rawInput.toVersion);
                if (!from || !to) throw new Error("Requested architecture version was not found.");
                const diff = compareArchitectureVersions(from, to);
                const plan = planArchitectureMigration(diff);
                useCanvasStore.getState().setVersionDiff(diff);
                useCanvasStore.getState().setMigrationPlan(plan);
                return json({ diff, migrationPlan: plan });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[31],
            title: "Restore architecture version",
            description: "Restore a previous immutable architecture checkpoint into the live canvas. All downstream audit, intelligence, simulation, implementation, code, workspace, and execution artifacts are invalidated.",
            inputSchema: RESTORE_VERSION_SCHEMA,
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
            execute: async (rawInput) => {
                if (!isRecord(rawInput)) throw new Error("A version number or versionId is required.");
                const versionId = typeof rawInput.versionId === "string" ? rawInput.versionId : undefined;
                const versionNumber = typeof rawInput.version === "number" ? rawInput.version : undefined;
                const version = useCanvasStore.getState().versioning.versions.find((item) =>
                    versionId !== undefined ? item.id === versionId : item.version === versionNumber,
                );
                if (!version) throw new Error("Requested architecture version was not found.");
                const restored = useCanvasStore.getState().restoreVersion(version.id);
                if (!restored) throw new Error("Architecture version could not be restored.");
                return json({
                    restoredVersion: version.version,
                    nodeCount: version.nodeCount,
                    connectionCount: version.connectionCount,
                    fingerprint: version.fingerprint,
                });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[32],
            title: "Clear version analysis",
            description: "Clear the currently displayed version diff and migration plan while preserving immutable architecture history.",
            inputSchema: EMPTY_SCHEMA,
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
            execute: async () => {
                useCanvasStore.getState().clearVersionAnalysis();
                return json({ cleared: true, historyPreserved: true });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[33],
            title: "Run production QA",
            description: "Run the final deterministic release gate across architecture integrity, generated artifacts, security boundaries, performance budgets, WebMCP coverage, real execution, code review, and architecture version integrity.",
            inputSchema: EMPTY_SCHEMA,
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
            execute: async () => {
                const state = useCanvasStore.getState();
                let toolNames: readonly string[] = [];
                let headers: Record<string, string> = {};
                const modelContext = document.modelContext;
                if (modelContext?.getTools) {
                    try {
                        toolNames = (await modelContext.getTools()).map((tool) => tool.name);
                    } catch {
                        toolNames = [];
                    }
                }
                try {
                    const response = await fetch(window.location.href, { method: "HEAD", cache: "no-store" });
                    response.headers.forEach((value, key) => {
                        headers[key] = value;
                    });
                } catch {
                    headers = {};
                }
                const report = runProductionQA({
                    nodes: state.nodes,
                    edges: state.edges,
                    project: state.codeGeneration,
                    execution: state.execution,
                    codeReview: state.codeReview,
                    versioning: state.versioning,
                    webmcpToolNames: toolNames,
                    headers,
                });
                state.setProductionQA(report);
                return json({ report });
            },
        },
        {
            name: AGENT_OS_TOOL_NAMES[34],
            title: "Run Judge Mode",
            description: "Run PromptFlow's cinematic end-to-end hackathon flow: reason about the live architecture, break it with load and compute failure, diagnose the impact, apply bounded hardening, re-test, generate and execute the project, then run the production release gate and return a judge-facing before/after scorecard.",
            inputSchema: {
                type: "object",
                properties: {
                    targetUsers: { type: "number", minimum: 100_000, maximum: 1_000_000_000 },
                },
                additionalProperties: false,
            },
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
            execute: async (rawInput) => {
                const targetUsers = isRecord(rawInput) && typeof rawInput.targetUsers === "number"
                    ? Math.min(Math.max(rawInput.targetUsers, 100_000), 1_000_000_000)
                    : 10_000_000;
                const state = useCanvasStore.getState();
                const run = await runFinalWowDemo(state.nodes, state.edges, targetUsers);
                useCanvasStore.getState().setFinalWow(run);
                return json({ run });
            },
        },
    ];

}

