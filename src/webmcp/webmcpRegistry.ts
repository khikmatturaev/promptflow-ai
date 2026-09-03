import { auditArchitecture } from "../lib/architectureAudit";
import { buildFixOperations, buildScaleOperations, validateTransformOperations } from "../lib/architectureIntelligence";
import { useCanvasStore } from "../store/useCanvasStore";
import { createAgentOSTools } from "./agentOSTools";
import type {
    AddArchitectureNodeInput,
    ArchitectureNode,
    ArchitectureNodeData,
    ConnectArchitectureNodesInput,
    GenerateNodeBoilerplateInput,
    RemoveArchitectureNodeInput,
    ScaleArchitectureInput,
    TransformArchitectureInput,
    FixArchitectureInput,
    UpdateArchitectureNodeInput,
    ArchitectureNodeType,
} from "../types";

const MAX_ID_LENGTH = 120;
const MAX_LABEL_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 800;
const MAX_REASON_LENGTH = 600;
const MAX_CODE_LENGTH = 50_000;

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
] as const;

const ADD_NODE_SCHEMA = {
    type: "object",
    properties: {
        id: { type: "string", maxLength: MAX_ID_LENGTH, description: "Stable unique node id." },
        label: { type: "string", maxLength: MAX_LABEL_LENGTH, description: "Human-readable architecture component name." },
        type: {
            type: "string",
            enum: [...ARCHITECTURE_NODE_TYPES],
        },
        description: {
            type: "string",
            maxLength: MAX_DESCRIPTION_LENGTH,
            description: "Short explanation of the component's responsibility.",
        },
        x: {
            type: "number",
            description: "Optional canvas X coordinate. Omit to let PromptFlow place the node automatically.",
        },
        y: {
            type: "number",
            description: "Optional canvas Y coordinate. Omit to let PromptFlow place the node automatically.",
        },
    },
    required: ["id", "label", "type", "description"],
    additionalProperties: false,
} as const;

const CONNECT_NODES_SCHEMA = {
    type: "object",
    properties: {
        sourceId: { type: "string", maxLength: MAX_ID_LENGTH, description: "Id of the source node." },
        targetId: { type: "string", maxLength: MAX_ID_LENGTH, description: "Id of the target node." },
        label: { type: "string", maxLength: MAX_LABEL_LENGTH, description: "Optional relationship label." },
    },
    required: ["sourceId", "targetId"],
    additionalProperties: false,
} as const;

const UPDATE_NODE_SCHEMA = {
    type: "object",
    properties: {
        nodeId: { type: "string", maxLength: MAX_ID_LENGTH, description: "Id of the node to update." },
        label: { type: "string", maxLength: MAX_LABEL_LENGTH, description: "Optional replacement component name." },
        type: { type: "string", enum: [...ARCHITECTURE_NODE_TYPES] },
        description: { type: "string", maxLength: MAX_DESCRIPTION_LENGTH, description: "Optional replacement component description." },
    },
    required: ["nodeId"],
    additionalProperties: false,
} as const;

const REMOVE_NODE_SCHEMA = {
    type: "object",
    properties: {
        nodeId: { type: "string", maxLength: MAX_ID_LENGTH, description: "Id of the node to remove." },
    },
    required: ["nodeId"],
    additionalProperties: false,
} as const;

const GENERATE_BOILERPLATE_SCHEMA = {
    type: "object",
    properties: {
        nodeId: {
            type: "string",
            maxLength: MAX_ID_LENGTH,
            description: "Id of the architecture node receiving the code.",
        },
        code: {
            type: "string",
            maxLength: MAX_CODE_LENGTH,
            description: "Generated implementation or configuration code.",
        },
    },
    required: ["nodeId", "code"],
    additionalProperties: false,
} as const;

const TRANSFORM_OPERATION_SCHEMA = {
    type: "object",
    properties: {
        kind: { type: "string", enum: ["add", "update", "remove", "connect", "disconnect"] },
        id: { type: "string", maxLength: MAX_ID_LENGTH },
        nodeId: { type: "string", maxLength: MAX_ID_LENGTH },
        label: { type: "string", maxLength: MAX_LABEL_LENGTH },
        type: { type: "string", enum: [...ARCHITECTURE_NODE_TYPES] },
        description: { type: "string", maxLength: MAX_DESCRIPTION_LENGTH },
        sourceId: { type: "string", maxLength: MAX_ID_LENGTH },
        targetId: { type: "string", maxLength: MAX_ID_LENGTH },
        x: { type: "number" },
        y: { type: "number" },
    },
    required: ["kind"],
    additionalProperties: false,
} as const;

const TRANSFORM_ARCHITECTURE_SCHEMA = {
    type: "object",
    properties: {
        reason: { type: "string", maxLength: MAX_REASON_LENGTH, description: "Why the architecture should be transformed. Prefer this batched tool for multi-step architecture changes instead of many individual mutations." },
        operations: {
            type: "array",
            items: TRANSFORM_OPERATION_SCHEMA,
            minItems: 1,
            maxItems: 50,
        },
    },
    required: ["reason", "operations"],
    additionalProperties: false,
} as const;

const SCALE_ARCHITECTURE_SCHEMA = {
    type: "object",
    properties: {
        targetUsers: { type: "number", description: "Expected peak active users or equivalent scale target." },
        reason: { type: "string", maxLength: MAX_REASON_LENGTH, description: "Why the system needs to scale." },
    },
    required: ["targetUsers", "reason"],
    additionalProperties: false,
} as const;

const FIX_ARCHITECTURE_SCHEMA = {
    type: "object",
    properties: {
        findingIds: {
            type: "array",
            items: { type: "string", maxLength: MAX_ID_LENGTH },
            description: "Optional audit finding ids to address. Omit to address all fixable findings.",
        },
    },
    additionalProperties: false,
} as const;

const EMPTY_SCHEMA = {
    type: "object",
    properties: {},
    additionalProperties: false,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
    return typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function isBoundedString(value: unknown, maxLength: number): value is string {
    return isString(value) && value.length <= maxLength;
}

function isNonEmptyBoundedString(value: unknown, maxLength: number): value is string {
    return isBoundedString(value, maxLength) && value.trim().length > 0;
}

function isArchitectureNodeType(
    value: unknown,
): value is ArchitectureNodeData["type"] {
    return ARCHITECTURE_NODE_TYPES.some((type) => type === value);
}

function parseAddNodeInput(input: unknown): AddArchitectureNodeInput {
    if (!isRecord(input)) {
        throw new Error("Invalid add_architecture_node input.");
    }

    const id = input.id;
    const label = input.label;
    const type = input.type;
    const description = input.description;
    const x = input.x;
    const y = input.y;

    if (!isNonEmptyBoundedString(id, MAX_ID_LENGTH) || !isNonEmptyBoundedString(label, MAX_LABEL_LENGTH) || !isArchitectureNodeType(type) || !isNonEmptyBoundedString(description, MAX_DESCRIPTION_LENGTH)) {
        throw new Error("Invalid add_architecture_node input.");
    }

    if (x !== undefined && !isFiniteNumber(x)) {
        throw new Error("Invalid X coordinate.");
    }

    if (y !== undefined && !isFiniteNumber(y)) {
        throw new Error("Invalid Y coordinate.");
    }

    return {
        id,
        label,
        type,
        description,
        x: x === undefined ? undefined : (x as number),
        y: y === undefined ? undefined : (y as number),
    };
}

function parseConnectInput(input: unknown): ConnectArchitectureNodesInput {
    if (!isRecord(input)) {
        throw new Error("Invalid connect_architecture_nodes input.");
    }

    const sourceId = input.sourceId;
    const targetId = input.targetId;
    const label = input.label;

    if (!isNonEmptyBoundedString(sourceId, MAX_ID_LENGTH) || !isNonEmptyBoundedString(targetId, MAX_ID_LENGTH)) {
        throw new Error("Invalid connect_architecture_nodes input.");
    }

    if (label !== undefined && !isBoundedString(label, MAX_LABEL_LENGTH)) {
        throw new Error("Invalid connection label.");
    }

    return {
        sourceId,
        targetId,
        label: label === undefined ? undefined : (label as string),
    };
}

function parseUpdateNodeInput(input: unknown): UpdateArchitectureNodeInput {
    if (!isRecord(input) || !isString(input.nodeId)) {
        throw new Error("Invalid update_architecture_node input.");
    }

    const nodeId = input.nodeId;
    const label = input.label;
    const type = input.type;
    const description = input.description;

    if (label !== undefined && !isBoundedString(label, MAX_LABEL_LENGTH)) {
        throw new Error("Invalid node label.");
    }

    if (description !== undefined && !isBoundedString(description, MAX_DESCRIPTION_LENGTH)) {
        throw new Error("Invalid node description.");
    }

    if (type !== undefined && !isArchitectureNodeType(type)) {
        throw new Error("Invalid architecture node type.");
    }

    return {
        nodeId,
        label: label === undefined ? undefined : (label as string),
        type: type === undefined ? undefined : (type as ArchitectureNodeData["type"]),
        description: description === undefined ? undefined : (description as string),
    };
}

function parseRemoveNodeInput(input: unknown): RemoveArchitectureNodeInput {
    if (!isRecord(input) || !isNonEmptyBoundedString(input.nodeId, MAX_ID_LENGTH)) {
        throw new Error("Invalid remove_architecture_node input.");
    }

    return { nodeId: input.nodeId };
}

function parseBoilerplateInput(input: unknown): GenerateNodeBoilerplateInput {
    if (
        !isRecord(input) ||
        !isNonEmptyBoundedString(input.nodeId, MAX_ID_LENGTH) ||
        !isNonEmptyBoundedString(input.code, MAX_CODE_LENGTH)
    ) {
        throw new Error("Invalid generate_node_boilerplate input.");
    }

    return {
        nodeId: input.nodeId,
        code: input.code,
    };
}

function parseTransformInput(input: unknown): TransformArchitectureInput {
    if (!isRecord(input) || !isNonEmptyBoundedString(input.reason, MAX_REASON_LENGTH) || !Array.isArray(input.operations) || input.operations.length === 0 || input.operations.length > 50) {
        throw new Error("Invalid transform_architecture input.");
    }

    const operations = input.operations.map((rawOperation): TransformArchitectureInput["operations"][number] => {
        if (!isRecord(rawOperation) || !isString(rawOperation.kind)) {
            throw new Error("Invalid transform operation.");
        }
        const kind = rawOperation.kind;
        if (kind === "add") {
            if (!isNonEmptyBoundedString(rawOperation.id, MAX_ID_LENGTH) || !isNonEmptyBoundedString(rawOperation.label, MAX_LABEL_LENGTH) || !isArchitectureNodeType(rawOperation.type) || !isNonEmptyBoundedString(rawOperation.description, MAX_DESCRIPTION_LENGTH)) {
                throw new Error("Invalid add transform operation.");
            }
            if (rawOperation.x !== undefined && !isFiniteNumber(rawOperation.x)) throw new Error("Invalid add transform X coordinate.");
            if (rawOperation.y !== undefined && !isFiniteNumber(rawOperation.y)) throw new Error("Invalid add transform Y coordinate.");
            return { kind, id: rawOperation.id, label: rawOperation.label, type: rawOperation.type, description: rawOperation.description, x: rawOperation.x as number, y: rawOperation.y as number };
        }
        if (kind === "update") {
            if (!isNonEmptyBoundedString(rawOperation.nodeId, MAX_ID_LENGTH)) throw new Error("Invalid update transform nodeId.");
            if (rawOperation.label !== undefined && !isBoundedString(rawOperation.label, MAX_LABEL_LENGTH)) throw new Error("Invalid update transform label.");
            if (rawOperation.description !== undefined && !isBoundedString(rawOperation.description, MAX_DESCRIPTION_LENGTH)) throw new Error("Invalid update transform description.");
            if (rawOperation.type !== undefined && !isArchitectureNodeType(rawOperation.type)) throw new Error("Invalid update transform type.");
            return { kind, nodeId: rawOperation.nodeId, label: rawOperation.label as string, type: rawOperation.type as ArchitectureNodeType, description: rawOperation.description as string };
        }
        if (kind === "remove") {
            if (!isNonEmptyBoundedString(rawOperation.nodeId, MAX_ID_LENGTH)) throw new Error("Invalid remove transform nodeId.");
            return { kind, nodeId: rawOperation.nodeId };
        }
        if (kind === "connect") {
            if (!isNonEmptyBoundedString(rawOperation.sourceId, MAX_ID_LENGTH) || !isNonEmptyBoundedString(rawOperation.targetId, MAX_ID_LENGTH)) throw new Error("Invalid connect transform operation.");
            if (rawOperation.label !== undefined && !isBoundedString(rawOperation.label, MAX_LABEL_LENGTH)) throw new Error("Invalid transform connection label.");
            return { kind, sourceId: rawOperation.sourceId, targetId: rawOperation.targetId, label: rawOperation.label as string };
        }
        if (kind === "disconnect") {
            if (!isNonEmptyBoundedString(rawOperation.sourceId, MAX_ID_LENGTH) || !isNonEmptyBoundedString(rawOperation.targetId, MAX_ID_LENGTH)) throw new Error("Invalid disconnect transform operation.");
            return { kind, sourceId: rawOperation.sourceId, targetId: rawOperation.targetId };
        }
        throw new Error(`Unsupported transform operation: ${kind}`);
    });

    return { reason: input.reason, operations };
}

function parseScaleInput(input: unknown): ScaleArchitectureInput {
    if (!isRecord(input) || !isFiniteNumber(input.targetUsers) || input.targetUsers <= 0 || !isNonEmptyBoundedString(input.reason, MAX_REASON_LENGTH)) {
        throw new Error("Invalid scale_architecture input.");
    }
    return { targetUsers: input.targetUsers, reason: input.reason };
}

function parseFixInput(input: unknown): FixArchitectureInput {
    if (input === undefined || input === null) return {};
    if (!isRecord(input)) throw new Error("Invalid fix_architecture input.");
    if (input.findingIds !== undefined && (!Array.isArray(input.findingIds) || input.findingIds.length > 50 || input.findingIds.some((id) => !isBoundedString(id, MAX_ID_LENGTH)))) {
        throw new Error("Invalid findingIds.");
    }
    return { findingIds: input.findingIds as string[] | undefined };
}

function getAutoPosition(nodes: ArchitectureNode[]): { x: number; y: number } {
    const column = nodes.length % 3;
    const row = Math.floor(nodes.length / 3);

    return {
        x: 80 + column * 340,
        y: 120 + row * 240,
    };
}

function positionIsOccupied(
    nodes: ArchitectureNode[],
    position: { x: number; y: number },
): boolean {
    return nodes.some(
        (node) =>
            Math.abs(node.position.x - position.x) < 80 &&
            Math.abs(node.position.y - position.y) < 80,
    );
}

function resolveNodePosition(
    input: AddArchitectureNodeInput,
    nodes: ArchitectureNode[],
): { x: number; y: number } {
    const requestedPosition =
        input.x !== undefined && input.y !== undefined
            ? { x: input.x, y: input.y }
            : getAutoPosition(nodes);

    if (!positionIsOccupied(nodes, requestedPosition)) {
        return requestedPosition;
    }

    const fallback = getAutoPosition(nodes);
    if (!positionIsOccupied(nodes, fallback)) {
        return fallback;
    }

    return {
        x: requestedPosition.x + 320,
        y: requestedPosition.y + 180,
    };
}

function createArchitectureNode(
    input: AddArchitectureNodeInput,
    position: { x: number; y: number },
): ArchitectureNode {
    return {
        id: input.id,
        type: "architecture",
        position,
        selected: true,
        data: {
            label: input.label,
            type: input.type,
            description: input.description,
            boilerplate: "",
        },
    };
}

function success(message: string, data?: Record<string, unknown>): string {
    return JSON.stringify({ ok: true, message, ...data });
}

function isDuplicateToolError(error: unknown): boolean {
    return error instanceof DOMException && error.name === "InvalidStateError";
}


function summarizeAgentInput(input: unknown): string {
    if (!isRecord(input)) {
        return "No arguments";
    }

    const keys = Object.keys(input);
    return keys.length === 0 ? "No arguments" : keys.slice(0, 4).join(", ");
}

function summarizeAgentResult(result: string): string {
    try {
        const parsed: unknown = JSON.parse(result);

        if (isRecord(parsed)) {
            if (isFiniteNumber(parsed.score)) {
                return `Completed · score ${parsed.score}`;
            }

            if (isFiniteNumber(parsed.nodeCount) && isFiniteNumber(parsed.connectionCount)) {
                return `Completed · ${parsed.nodeCount} nodes · ${parsed.connectionCount} connections`;
            }

            if (isRecord(parsed.audit) && isFiniteNumber(parsed.audit.score)) {
                return `Completed · audit score ${parsed.audit.score}`;
            }

            if (isString(parsed.message)) {
                return `Completed · ${parsed.message}`;
            }

            return "Completed";
        }
    } catch {
        // Non-JSON tool results are still valid WebMCP results.
    }

    return result.length > 120 ? `${result.slice(0, 117)}...` : result;
}

function instrumentAgentTool(tool: WebMCPToolDefinition): WebMCPToolDefinition {
    return {
        ...tool,
        execute: async (input, context) => {
            // Chrome WebMCP testing builds can invoke execute without the optional
            // execution-options object. Keep the registry compatible with both
            // the current WebMCP contract and that browser behavior.
            const executionContext: WebMCPToolExecutionContext = context ?? {
                signal: new AbortController().signal,
            };

            if (executionContext.signal.aborted) {
                throw new DOMException("Tool execution was aborted.", "AbortError");
            }

            const store = useCanvasStore.getState();
            const callId = store.beginAgentToolCall(
                tool.name,
                summarizeAgentInput(input),
            );

            try {
                const result = await tool.execute(input, executionContext);
                useCanvasStore.getState().completeAgentToolCall(
                    callId,
                    summarizeAgentResult(result),
                );
                return result;
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : "Unknown tool error";
                useCanvasStore.getState().failAgentToolCall(callId, message);
                throw error;
            }
        },
    };
}

const TOOL_NAMES = [
    "add_architecture_node",
    "connect_architecture_nodes",
    "update_architecture_node",
    "remove_architecture_node",
    "clear_architecture_canvas",
    "generate_node_boilerplate",
    "get_architecture_snapshot",
    "audit_architecture",
    "auto_layout_architecture",
    "transform_architecture",
    "scale_architecture",
    "fix_architecture",
] as const;

let registryPromise: Promise<(() => void) | null> | null = null;

async function waitForModelContext(timeoutMs = 10000): Promise<ModelContext | null> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        if (document.modelContext) {
            return document.modelContext;
        }

        await new Promise<void>((resolve) => {
            window.setTimeout(resolve, 100);
        });
    }

    return document.modelContext ?? null;
}

async function createRegistry(): Promise<(() => void) | null> {
    const modelContext = await waitForModelContext();

    if (!modelContext) {
        console.warn("PromptFlow WebMCP: document.modelContext is unavailable after waiting for WebMCP.");
        return null;
    }

    const controller = new AbortController();

    const tools: WebMCPToolDefinition[] = [
        ...createAgentOSTools(),
        {
            name: TOOL_NAMES[0],
            title: "Add architecture node",
            description: "Atomic tool: add one software architecture component to the live PromptFlow canvas. For a complete product brief, prefer architect_system; for model-planned batches, prefer transform_architecture.",
            inputSchema: ADD_NODE_SCHEMA,
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
            execute: async (rawInput) => {
                const input = parseAddNodeInput(rawInput);
                const store = useCanvasStore.getState();
                const existingNode = store.nodes.find((node) => node.id === input.id);

                if (existingNode) {
                    store.addNode(existingNode);
                    return success("Node already exists; it was focused.", { nodeId: input.id });
                }

                const position = resolveNodePosition(input, store.nodes);
                store.addNode(createArchitectureNode(input, position));
                return success("Architecture node added.", { nodeId: input.id, position });
            },
        },
        {
            name: TOOL_NAMES[1],
            title: "Connect architecture nodes",
            description: "Atomic tool: create one directed relationship between existing architecture nodes. Prefer architect_system for complete briefs or transform_architecture for multi-step changes.",
            inputSchema: CONNECT_NODES_SCHEMA,
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
            execute: async (rawInput) => {
                const input = parseConnectInput(rawInput);
                const store = useCanvasStore.getState();

                if (!store.nodes.some((node) => node.id === input.sourceId)) {
                    throw new Error(`Source node not found: ${input.sourceId}`);
                }
                if (!store.nodes.some((node) => node.id === input.targetId)) {
                    throw new Error(`Target node not found: ${input.targetId}`);
                }
                if (input.sourceId === input.targetId) {
                    throw new Error("A node cannot connect to itself.");
                }

                store.connectNodes(input.sourceId, input.targetId, input.label);
                return success("Architecture nodes connected.", {
                    sourceId: input.sourceId,
                    targetId: input.targetId,
                });
            },
        },
        {
            name: TOOL_NAMES[2],
            title: "Update architecture node",
            description: "Atomic tool: update one architecture component. Prefer architect_system for complete briefs or transform_architecture for multi-step changes.",
            inputSchema: UPDATE_NODE_SCHEMA,
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
            execute: async (rawInput) => {
                const input = parseUpdateNodeInput(rawInput);
                const store = useCanvasStore.getState();
                const node = store.nodes.find((item) => item.id === input.nodeId);

                if (!node) {
                    throw new Error(`Node not found: ${input.nodeId}`);
                }

                store.updateNodeData(input.nodeId, {
                    ...(input.label !== undefined ? { label: input.label } : {}),
                    ...(input.type !== undefined ? { type: input.type } : {}),
                    ...(input.description !== undefined ? { description: input.description } : {}),
                });

                return success("Architecture node updated.", { nodeId: input.nodeId });
            },
        },
        {
            name: TOOL_NAMES[3],
            title: "Remove architecture node",
            description: "Remove one architecture component and its relationships. For multi-step changes, prefer transform_architecture.",
            inputSchema: REMOVE_NODE_SCHEMA,
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
            execute: async (rawInput) => {
                const input = parseRemoveNodeInput(rawInput);
                const store = useCanvasStore.getState();
                if (!store.nodes.some((node) => node.id === input.nodeId)) {
                    throw new Error(`Node not found: ${input.nodeId}`);
                }
                store.removeNode(input.nodeId);
                return success("Architecture node removed.", { nodeId: input.nodeId });
            },
        },
        {
            name: TOOL_NAMES[4],
            title: "Clear architecture canvas",
            description: "Remove every node and connection from the PromptFlow architecture canvas.",
            inputSchema: EMPTY_SCHEMA,
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
            execute: async () => {
                useCanvasStore.getState().clearCanvas();
                return success("Architecture canvas cleared.");
            },
        },
        {
            name: TOOL_NAMES[5],
            title: "Attach node boilerplate",
            description: "Attach generated implementation code to an existing architecture node so it can be inspected in PromptFlow.",
            inputSchema: GENERATE_BOILERPLATE_SCHEMA,
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
            execute: async (rawInput) => {
                const input = parseBoilerplateInput(rawInput);
                const store = useCanvasStore.getState();
                if (!store.nodes.some((node) => node.id === input.nodeId)) {
                    throw new Error(`Node not found: ${input.nodeId}`);
                }
                store.updateNodeData(input.nodeId, { boilerplate: input.code });
                return success("Boilerplate attached to architecture node.", { nodeId: input.nodeId });
            },
        },
        {
            name: TOOL_NAMES[6],
            title: "Get architecture snapshot",
            description: "Read the current architecture graph, including components, relationships, positions, and attached code metadata.",
            inputSchema: EMPTY_SCHEMA,
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
            execute: async () => {
                const { nodes, edges, audit } = useCanvasStore.getState();
                return JSON.stringify({
                    ok: true,
                    nodeCount: nodes.length,
                    connectionCount: edges.length,
                    nodes: nodes.map((node) => ({
                        id: node.id,
                        label: node.data.label,
                        type: node.data.type,
                        description: node.data.description,
                        position: node.position,
                        hasCode: Boolean(node.data.boilerplate),
                    })),
                    edges: edges.map((edge) => ({
                        id: edge.id,
                        sourceId: edge.source,
                        targetId: edge.target,
                        label: edge.data?.label ?? "",
                    })),
                    audit,
                });
            },
        },
        {
            name: TOOL_NAMES[7],
            title: "Audit architecture",
            description: "Run a structural preflight audit of the current architecture and expose the findings in the PromptFlow canvas.",
            inputSchema: EMPTY_SCHEMA,
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
            execute: async () => {
                const { nodes, edges } = useCanvasStore.getState();
                const audit = auditArchitecture(nodes, edges);
                useCanvasStore.getState().setAudit(audit);
                return JSON.stringify({ ok: true, ...audit });
            },
        },
        {
            name: TOOL_NAMES[8],
            title: "Auto layout architecture",
            description: "Arrange all architecture components into a clean deterministic grid and refocus the canvas.",
            inputSchema: EMPTY_SCHEMA,
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
            execute: async () => {
                useCanvasStore.getState().autoLayout();
                return success("Architecture auto-layout applied.");
            },
        },
        {
            name: TOOL_NAMES[9],
            title: "Transform architecture",
            description: "Apply a model-planned batch of atomic architecture changes. Inspect the current graph first and prefer this tool for multi-step changes to minimize agent round-trips.",
            inputSchema: TRANSFORM_ARCHITECTURE_SCHEMA,
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
            execute: async (rawInput) => {
                const input = parseTransformInput(rawInput);
                const store = useCanvasStore.getState();
                validateTransformOperations(store.nodes, store.edges, input.operations);
                store.applyTransform(input.operations);
                if (input.operations.some((operation) => operation.kind !== "update")) {
                    store.autoLayout();
                }
                return success("Architecture transformed.", { reason: input.reason, operationsApplied: input.operations.length });
            },
        },
        {
            name: TOOL_NAMES[10],
            title: "Scale architecture",
            description: "Apply deterministic production scaling patterns for the requested user scale. Use the current graph as the source of truth.",
            inputSchema: SCALE_ARCHITECTURE_SCHEMA,
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
            execute: async (rawInput) => {
                const input = parseScaleInput(rawInput);
                const store = useCanvasStore.getState();
                const operations = buildScaleOperations(store.nodes, store.edges, input.targetUsers);
                validateTransformOperations(store.nodes, store.edges, operations);
                store.applyTransform(operations);
                if (operations.length > 0) {
                    store.autoLayout();
                }
                return success("Architecture scaling plan applied.", { targetUsers: input.targetUsers, reason: input.reason, operationsApplied: operations.length });
            },
        },
        {
            name: TOOL_NAMES[11],
            title: "Fix architecture",
            description: "Address fixable findings from the latest structural audit without changing unrelated components.",
            inputSchema: FIX_ARCHITECTURE_SCHEMA,
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
            execute: async (rawInput) => {
                const input = parseFixInput(rawInput);
                const store = useCanvasStore.getState();
                const audit = store.audit ?? auditArchitecture(store.nodes, store.edges);
                const operations = buildFixOperations(store.nodes, store.edges, audit, input.findingIds);
                validateTransformOperations(store.nodes, store.edges, operations);
                store.applyTransform(operations);
                if (operations.length > 0) {
                    store.autoLayout();
                }
                const nextAudit = auditArchitecture(useCanvasStore.getState().nodes, useCanvasStore.getState().edges);
                useCanvasStore.getState().setAudit(nextAudit);
                return JSON.stringify({ ok: true, message: "Fixable architecture issues addressed.", operationsApplied: operations.length, audit: nextAudit });
            },
        },
    ];

    const instrumentedTools = tools.map(instrumentAgentTool);
    const existingTools = modelContext.getTools ? await modelContext.getTools() : [];
    const existingNames = new Set(existingTools.map((tool) => tool.name));

    try {
        for (const tool of instrumentedTools) {
            if (existingNames.has(tool.name)) {
                continue;
            }

            try {
                await modelContext.registerTool(tool, { signal: controller.signal });
                existingNames.add(tool.name);
            } catch (error: unknown) {
                if (isDuplicateToolError(error)) {
                    existingNames.add(tool.name);
                    continue;
                }

                console.error(`PromptFlow WebMCP: failed to register tool \"${tool.name}\".`, error);
                controller.abort();
                throw error;
            }
        }
    } catch (error: unknown) {
        controller.abort();
        throw error;
    }

    return () => controller.abort();
}


export async function registerWebMCPTools(): Promise<(() => void) | null> {
    if (!registryPromise) {
        registryPromise = createRegistry().catch((error: unknown) => {
            registryPromise = null;
            throw error;
        });
    }

    return registryPromise;
}

if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        void registryPromise?.then((cleanup) => cleanup?.());
        registryPromise = null;
    });
}
