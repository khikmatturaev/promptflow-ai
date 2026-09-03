import { create } from "zustand";
import { createArchitectureVersion, keepVersionHistory } from "../lib/architectureVersioning";
import type {
    ArchitectureEdge,
    ArchitectureNode,
    ArchitectureNodeData,
    ArchitectureTransformOperation,
    AgentToolCall,
    CanvasState,
} from "../types";

interface CanvasActions {
    addNode: (node: ArchitectureNode) => void;
    removeNode: (nodeId: string) => void;
    connectNodes: (
        sourceId: string,
        targetId: string,
        label?: string,
    ) => void;
    updateNodeData: (
        nodeId: string,
        data: Partial<ArchitectureNodeData>,
    ) => void;
    setNodeBoilerplate: (nodeId: string, code: string) => void;
    setNodes: (nodes: ArchitectureNode[]) => void;
    setNodesFromFlow: (nodes: ArchitectureNode[], invalidateAudit: boolean) => void;
    setEdges: (edges: ArchitectureEdge[]) => void;
    setEdgesFromFlow: (edges: ArchitectureEdge[], invalidateAudit: boolean) => void;
    clearCanvas: () => void;
    setAudit: (audit: CanvasState["audit"]) => void;
    clearAudit: () => void;
    setIntelligence: (report: CanvasState["intelligence"]) => void;
    clearIntelligence: () => void;
    setDigitalTwin: (report: CanvasState["digitalTwin"]) => void;
    clearDigitalTwin: () => void;
    setImplementation: (blueprint: CanvasState["implementation"]) => void;
    clearImplementation: () => void;
    setCodeGeneration: (result: CanvasState["codeGeneration"]) => void;
    clearCodeGeneration: () => void;
    setWorkspace: (workspace: CanvasState["workspace"]) => void;
    clearWorkspace: () => void;
    setFinalDemo: (run: CanvasState["finalDemo"]) => void;
    clearFinalDemo: () => void;
    setCodeReview: (review: CanvasState["codeReview"]) => void;
    clearCodeReview: () => void;
    setExecution: (result: CanvasState["execution"]) => void;
    clearExecution: () => void;
    setProductionQA: (report: CanvasState["productionQA"]) => void;
    clearProductionQA: () => void;
    setFinalWow: (run: CanvasState["finalWow"]) => void;
    clearFinalWow: () => void;
    autoLayout: () => void;
    applyTransform: (operations: ArchitectureTransformOperation[]) => void;
    beginAgentToolCall: (toolName: string, inputSummary: string) => string;
    completeAgentToolCall: (id: string, resultSummary: string) => void;
    failAgentToolCall: (id: string, resultSummary: string) => void;
    createVersion: (message?: string, name?: string) => string | null;
    restoreVersion: (versionId: string) => boolean;
    setVersionDiff: (diff: CanvasState["versioning"]["diff"]) => void;
    setMigrationPlan: (plan: CanvasState["versioning"]["migrationPlan"]) => void;
    clearVersionAnalysis: () => void;
    clearAgentToolCalls: () => void;
}

export type CanvasStore = CanvasState & CanvasActions;

export const useCanvasStore = create<CanvasStore>((set) => ({
    nodes: [],
    edges: [],
    audit: null,
    intelligence: null,
    digitalTwin: null,
    implementation: null,
    codeGeneration: null,
    workspace: null,
    finalDemo: null,
    codeReview: null,
    execution: null,
    productionQA: null,
    finalWow: null,
    versioning: { versions: [], activeVersionId: null, diff: null, migrationPlan: null },
    layoutRevision: 0,
    agentToolCalls: [] as AgentToolCall[],

    addNode: (node) =>
        set((state) => {
            const existingIndex = state.nodes.findIndex(
                (existing) => existing.id === node.id,
            );

            if (existingIndex !== -1) {
                return {
                    audit: null,
                    intelligence: null,
                    digitalTwin: null,
                    implementation: null,
                    codeGeneration: null,
                    workspace: null,
                    finalDemo: null, codeReview: null, execution: null, productionQA: null, finalWow: null,
                    versioning: { ...state.versioning, diff: null, migrationPlan: null },
                    nodes: state.nodes.map((existing, index) => ({
                        ...existing,
                        selected: index === existingIndex,
                    })),
                };
            }

            return {
                audit: null,
                intelligence: null,
                digitalTwin: null,
                implementation: null,
                codeGeneration: null,
                workspace: null,
                finalDemo: null,
                codeReview: null, execution: null, productionQA: null, finalWow: null,
                versioning: { ...state.versioning, diff: null, migrationPlan: null },
                nodes: [
                    ...state.nodes.map((existing) => ({
                        ...existing,
                        selected: false,
                    })),
                    {
                        ...node,
                        selected: true,
                    },
                ],
            };
        }),

    removeNode: (nodeId) =>
        set((state) => ({
            audit: null,
            intelligence: null,
            digitalTwin: null,
            implementation: null,
            codeGeneration: null,
            workspace: null,
            finalDemo: null,
            codeReview: null, execution: null, productionQA: null, finalWow: null,
            versioning: { ...state.versioning, diff: null, migrationPlan: null },
            nodes: state.nodes.filter((node) => node.id !== nodeId),
            edges: state.edges.filter(
                (edge) => edge.source !== nodeId && edge.target !== nodeId,
            ),
        })),

    connectNodes: (sourceId, targetId, label) =>
        set((state) => {
            if (
                sourceId === targetId ||
                !state.nodes.some((node) => node.id === sourceId) ||
                !state.nodes.some((node) => node.id === targetId)
            ) {
                return state;
            }

            const connectionExists = state.edges.some(
                (edge) =>
                    edge.source === sourceId && edge.target === targetId,
            );

            if (connectionExists) {
                return state;
            }

            const edge: ArchitectureEdge = {
                id: `${sourceId}-${targetId}`,
                source: sourceId,
                target: targetId,
                animated: true,
                data: {
                    label,
                },
            };

            return {
                audit: null,
                intelligence: null,
                digitalTwin: null,
                implementation: null,
                edges: [...state.edges, edge],
            };
        }),

    updateNodeData: (nodeId, data) =>
        set((state) => ({
            audit: null,
            intelligence: null,
            digitalTwin: null,
            implementation: null,
            codeGeneration: null,
            workspace: null,
            finalDemo: null,
            codeReview: null, execution: null, productionQA: null, finalWow: null,
            versioning: { ...state.versioning, diff: null, migrationPlan: null },
            nodes: state.nodes.map((node) =>
                node.id === nodeId
                    ? {
                        ...node,
                        data: {
                            ...node.data,
                            ...data,
                        },
                    }
                    : node,
            ),
        })),

    setNodeBoilerplate: (nodeId, code) =>
        set((state) => ({
            codeGeneration: null,
            workspace: null,
            finalDemo: null,
            codeReview: null, execution: null, productionQA: null, finalWow: null,
            versioning: { ...state.versioning, diff: null, migrationPlan: null },
            nodes: state.nodes.map((node) =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, boilerplate: code } }
                    : node,
            ),
        })),

    setNodes: (nodes) =>
        set((state) => {
            const nodeIds = new Set(nodes.map((node) => node.id));

            return {
                audit: null,
                intelligence: null,
                digitalTwin: null,
                implementation: null,
                codeGeneration: null,
                workspace: null,
                finalDemo: null,
                codeReview: null, execution: null, productionQA: null, finalWow: null,
                versioning: { ...state.versioning, diff: null, migrationPlan: null },
                nodes,
                edges: state.edges.filter(
                    (edge) =>
                        nodeIds.has(edge.source) && nodeIds.has(edge.target),
                ),
            };
        }),

    setNodesFromFlow: (nodes, invalidateAudit) =>
        set((state) => {
            const nodeIds = new Set(nodes.map((node) => node.id));
            return {
                nodes,
                edges: state.edges.filter(
                    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target),
                ),
                ...(invalidateAudit ? { audit: null, intelligence: null, digitalTwin: null, implementation: null, codeGeneration: null, workspace: null, finalDemo: null, codeReview: null, execution: null, productionQA: null, versioning: { ...state.versioning, diff: null, migrationPlan: null }, finalWow: null } : {}),
            };
        }),

    setEdges: (edges) => set((state) => ({ edges, audit: null, intelligence: null, digitalTwin: null, implementation: null, codeGeneration: null, workspace: null, finalDemo: null, codeReview: null, execution: null, productionQA: null, finalWow: null, versioning: { ...state.versioning, diff: null, migrationPlan: null } })),

    setEdgesFromFlow: (edges, invalidateAudit) =>
        set((state) => ({
            edges,
            ...(invalidateAudit ? { audit: null, intelligence: null, digitalTwin: null, implementation: null, codeGeneration: null, workspace: null, finalDemo: null, codeReview: null, execution: null, productionQA: null, versioning: { ...state.versioning, diff: null, migrationPlan: null }, finalWow: null } : {}),
        })),

    clearCanvas: () =>
        set((state) => ({
            nodes: [],
            edges: [],
            audit: null,
            intelligence: null,
            digitalTwin: null,
            implementation: null,
            codeGeneration: null,
            workspace: null,
            finalDemo: null,
            codeReview: null,
            execution: null, productionQA: null, finalWow: null,
            versioning: { ...state.versioning, diff: null, migrationPlan: null },
        })),

    setAudit: (audit) => set({ audit }),
    setIntelligence: (intelligence) => set({ intelligence }),
    clearAudit: () => set({ audit: null }),
    clearIntelligence: () => set({ intelligence: null }),
    setDigitalTwin: (digitalTwin) => set({ digitalTwin }),
    clearDigitalTwin: () => set({ digitalTwin: null }),
    setImplementation: (implementation) => set({ implementation }),
    clearImplementation: () => set({ implementation: null }),
    setCodeGeneration: (codeGeneration) => set({ codeGeneration, codeReview: null, execution: null, finalWow: null }),
    clearCodeGeneration: () => set((state) => ({ codeGeneration: null, workspace: null, finalDemo: null, codeReview: null, execution: null, productionQA: null, finalWow: null, versioning: { ...state.versioning, diff: null, migrationPlan: null } })),
    setWorkspace: (workspace) => set({ workspace }),
    clearWorkspace: () => set({ workspace: null }),
    setFinalDemo: (finalDemo) => set({ finalDemo }),
    clearFinalDemo: () => set({ finalDemo: null }),
    setCodeReview: (codeReview) => set({ codeReview }),
    clearCodeReview: () => set({ codeReview: null }),
    setExecution: (execution) => set({ execution, finalWow: null }),
    clearExecution: () => set({ execution: null, productionQA: null, finalWow: null }),
    setProductionQA: (productionQA) => set({ productionQA }),
    setFinalWow: (finalWow) => set({ finalWow }),
    clearFinalWow: () => set({ finalWow: null }),
    clearProductionQA: () => set({ productionQA: null }),

    autoLayout: () =>
        set((state) => {
            const nodes = state.nodes.map((node, index) => {
                const position = {
                    x: 80 + (index % 3) * 340,
                    y: 120 + Math.floor(index / 3) * 240,
                };
                return node.position.x === position.x && node.position.y === position.y
                    ? node
                    : { ...node, position };
            });

            const changed = nodes.some((node, index) => node !== state.nodes[index]);
            if (!changed) {
                return state;
            }

            return {
                audit: null,
                intelligence: null,
                digitalTwin: null,
                implementation: null,
                productionQA: null,
                finalWow: null,
                layoutRevision: state.layoutRevision + 1,
                nodes,
            };
        }),

    beginAgentToolCall: (toolName, inputSummary) => {
        const id = crypto.randomUUID();
        set((state) => ({
            agentToolCalls: [
                ...state.agentToolCalls,
                {
                    id,
                    toolName,
                    status: "running" as const,
                    startedAt: Date.now(),
                    inputSummary,
                },
            ].slice(-30),
        }));
        return id;
    },

    completeAgentToolCall: (id, resultSummary) =>
        set((state) => ({
            agentToolCalls: state.agentToolCalls.map((call) =>
                call.id === id
                    ? { ...call, status: "completed", finishedAt: Date.now(), resultSummary }
                    : call,
            ),
        })),

    failAgentToolCall: (id, resultSummary) =>
        set((state) => ({
            agentToolCalls: state.agentToolCalls.map((call) =>
                call.id === id
                    ? { ...call, status: "failed", finishedAt: Date.now(), resultSummary }
                    : call,
            ),
        })),

    createVersion: (message, name) => {
        const state = useCanvasStore.getState();
        if (state.nodes.length === 0) return null;
        const version = createArchitectureVersion(
            state.nodes,
            state.edges,
            { message, name, auditScore: state.audit?.score ?? null },
            state.versioning.versions,
        );
        set((current) => ({
            versioning: {
                ...current.versioning,
                versions: keepVersionHistory([...current.versioning.versions, version]),
                activeVersionId: version.id,
                diff: null,
                migrationPlan: null,
            },
        }));
        return version.id;
    },

    restoreVersion: (versionId) => {
        const state = useCanvasStore.getState();
        const version = state.versioning.versions.find((item) => item.id === versionId);
        if (!version) return false;
        set({
            nodes: version.nodes.map((node) => ({ ...node, selected: false })),
            edges: version.edges.map((edge) => ({ ...edge })),
            audit: null,
            intelligence: null,
            digitalTwin: null,
            implementation: null,
            codeGeneration: null,
            workspace: null,
            finalDemo: null,
            codeReview: null,
            execution: null, productionQA: null, finalWow: null,
            versioning: {
                ...state.versioning,
                activeVersionId: version.id,
                diff: null,
                migrationPlan: null,
            },
            layoutRevision: state.layoutRevision + 1,
        });
        return true;
    },

    setVersionDiff: (diff) => set((state) => ({
        versioning: { ...state.versioning, diff },
    })),

    setMigrationPlan: (migrationPlan) => set((state) => ({
        versioning: { ...state.versioning, migrationPlan },
    })),

    clearVersionAnalysis: () => set((state) => ({
        versioning: { ...state.versioning, diff: null, migrationPlan: null },
    })),

    clearAgentToolCalls: () => set({ agentToolCalls: [] }),

    applyTransform: (operations) =>
        set((state) => {
            let nextNodes = [...state.nodes];
            let nextEdges = [...state.edges];

            const positionFor = (index: number) => ({
                x: 80 + (index % 3) * 340,
                y: 120 + Math.floor(index / 3) * 240,
            });

            for (const operation of operations) {
                if (operation.kind === "add") {
                    if (nextNodes.some((node) => node.id === operation.id)) {
                        continue;
                    }

                    const position =
                        operation.x !== undefined && operation.y !== undefined
                            ? { x: operation.x, y: operation.y }
                            : positionFor(nextNodes.length);

                    nextNodes.push({
                        id: operation.id,
                        type: "architecture",
                        position,
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
                        !nextNodes.some((node) => node.id === operation.sourceId) ||
                        !nextNodes.some((node) => node.id === operation.targetId) ||
                        nextEdges.some(
                            (edge) =>
                                edge.source === operation.sourceId &&
                                edge.target === operation.targetId,
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

            return {
                audit: null,
                intelligence: null,
                digitalTwin: null,
                implementation: null,
                codeGeneration: null,
                workspace: null,
                finalDemo: null,
                codeReview: null, execution: null, productionQA: null, finalWow: null,
                versioning: { ...state.versioning, diff: null, migrationPlan: null },
                nodes: nextNodes.map((node) => ({ ...node, selected: false })),
                edges: nextEdges,
            };
        }),
}));
