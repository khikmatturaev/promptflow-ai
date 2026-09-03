import {
    Background,
    Controls,
    MiniMap,
    ReactFlow,
    applyEdgeChanges,
    applyNodeChanges,
    useReactFlow,
    type Connection,
    type EdgeChange,
    type NodeChange,
} from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { auditArchitecture } from "../lib/architectureAudit";
import { simulateLoad } from "../lib/digitalTwin";
import { analyzeArchitectureIntelligence } from "../lib/architectureBrain";
import { analyzeImplementationIntelligence } from "../lib/implementationIntelligence";
import { generateProjectFromArchitecture } from "../lib/codeGeneration";
import { useCanvasStore } from "../store/useCanvasStore";
import type { ArchitectureEdge, ArchitectureNode, ArchitectureTransformOperation } from "../types";
import { ArchitectureAuditPanel } from "./ArchitectureAuditPanel";
import { ArchitectureIntelligencePanel } from "./ArchitectureIntelligencePanel";
import { ArchitectureSimulationPanel } from "./ArchitectureSimulationPanel";
import { ImplementationIntelligencePanel } from "./ImplementationIntelligencePanel";
import { CodeGenerationPanel } from "./CodeGenerationPanel";
import { ArchitectureInspector } from "./ArchitectureInspector";
import { ArchitectureNode as ArchitectureNodeComponent } from "./ArchitectureNode";
import { AgentDemoPanel } from "./AgentDemoPanel";
import { ArchitectExperience } from "./ArchitectExperience";
import { ArchitectureVersioningPanel } from "./ArchitectureVersioningPanel";
import { ProductionQAPanel } from "./ProductionQAPanel";
import { FinalWowPanel } from "./FinalWowPanel";

import "@xyflow/react/dist/style.css";

const nodeTypes = {
    architecture: ArchitectureNodeComponent,
};

function CanvasViewportController({
    nodes,
    layoutRevision,
}: {
    nodes: ArchitectureNode[];
    layoutRevision: number;
}) {
    const { fitView } = useReactFlow<ArchitectureNode, ArchitectureEdge>();
    const hadNodes = useRef(false);

    useEffect(() => {
        if (nodes.length === 0) {
            hadNodes.current = false;
            return;
        }

        if (hadNodes.current) {
            return;
        }

        hadNodes.current = true;
        const frame = window.requestAnimationFrame(() => {
            void fitView({
                padding: 0.35,
                duration: 180,
                minZoom: 0.45,
                maxZoom: 1.1,
            });
        });

        return () => window.cancelAnimationFrame(frame);
    }, [fitView, nodes.length]);

    useEffect(() => {
        if (layoutRevision === 0 || nodes.length === 0) {
            return;
        }

        const frame = window.requestAnimationFrame(() => {
            void fitView({
                padding: 0.3,
                duration: 350,
                minZoom: 0.45,
                maxZoom: 1.1,
            });
        });

        return () => window.cancelAnimationFrame(frame);
    }, [fitView, layoutRevision, nodes.length]);

    return null;
}

export function ArchitectureCanvas() {
    const nodes = useCanvasStore((state) => state.nodes);
    const edges = useCanvasStore((state) => state.edges);
    const setNodesFromFlow = useCanvasStore((state) => state.setNodesFromFlow);
    const setEdgesFromFlow = useCanvasStore((state) => state.setEdgesFromFlow);
    const connectNodes = useCanvasStore((state) => state.connectNodes);
    const audit = useCanvasStore((state) => state.audit);
    const intelligence = useCanvasStore((state) => state.intelligence);
    const digitalTwin = useCanvasStore((state) => state.digitalTwin);
    const setAudit = useCanvasStore((state) => state.setAudit);
    const clearAudit = useCanvasStore((state) => state.clearAudit);
    const setIntelligence = useCanvasStore((state) => state.setIntelligence);
    const clearIntelligence = useCanvasStore((state) => state.clearIntelligence);
    const setDigitalTwin = useCanvasStore((state) => state.setDigitalTwin);
    const clearDigitalTwin = useCanvasStore((state) => state.clearDigitalTwin);
    const implementation = useCanvasStore((state) => state.implementation);
    const setImplementation = useCanvasStore((state) => state.setImplementation);
    const clearImplementation = useCanvasStore((state) => state.clearImplementation);
    const codeGeneration = useCanvasStore((state) => state.codeGeneration);
    const setCodeGeneration = useCanvasStore((state) => state.setCodeGeneration);
    const clearCodeGeneration = useCanvasStore((state) => state.clearCodeGeneration);
    const autoLayout = useCanvasStore((state) => state.autoLayout);
    const layoutRevision = useCanvasStore((state) => state.layoutRevision);
    const clearAgentToolCalls = useCanvasStore((state) => state.clearAgentToolCalls);
    const clearCanvas = useCanvasStore((state) => state.clearCanvas);
    const applyTransform = useCanvasStore((state) => state.applyTransform);
    const [showAgentDemo, setShowAgentDemo] = useState(false);
    const [showVersioning, setShowVersioning] = useState(false);
    const [showProductionQA, setShowProductionQA] = useState(false);
    const [showJudgeMode, setShowJudgeMode] = useState(false);
    const [isAuditing, setIsAuditing] = useState(false);
    const [isLoadingShowcase, setIsLoadingShowcase] = useState(false);
    const pendingNodeChanges = useRef<NodeChange<ArchitectureNode>[]>([]);
    const pendingEdgeChanges = useRef<EdgeChange<ArchitectureEdge>[]>([]);
    const nodeChangeFrame = useRef<number | null>(null);
    const edgeChangeFrame = useRef<number | null>(null);

    const selectedNode = nodes.find((node) => node.selected);

    const handleNodesChange = useCallback(
        (changes: NodeChange<ArchitectureNode>[]) => {
            pendingNodeChanges.current.push(...changes);
            if (nodeChangeFrame.current !== null) {
                return;
            }

            nodeChangeFrame.current = window.requestAnimationFrame(() => {
                nodeChangeFrame.current = null;
                const batchedChanges = pendingNodeChanges.current.splice(0);
                if (batchedChanges.length === 0) {
                    return;
                }

                const currentNodes = useCanvasStore.getState().nodes;
                const nextNodes = applyNodeChanges(batchedChanges, currentNodes);
                const invalidateAudit = batchedChanges.some(
                    (change) =>
                        change.type !== "position" &&
                        change.type !== "select" &&
                        change.type !== "dimensions",
                );
                setNodesFromFlow(nextNodes, invalidateAudit);
            });
        },
        [setNodesFromFlow],
    );

    const handleConnect = useCallback(
        (connection: Connection) => {
            if (!connection.source || !connection.target) {
                return;
            }

            connectNodes(connection.source, connection.target);
        },
        [connectNodes],
    );

    const handleEdgesChange = useCallback(
        (changes: EdgeChange<ArchitectureEdge>[]) => {
            pendingEdgeChanges.current.push(...changes);
            if (edgeChangeFrame.current !== null) {
                return;
            }

            edgeChangeFrame.current = window.requestAnimationFrame(() => {
                edgeChangeFrame.current = null;
                const batchedChanges = pendingEdgeChanges.current.splice(0);
                if (batchedChanges.length === 0) {
                    return;
                }

                const currentEdges = useCanvasStore.getState().edges;
                const nextEdges = applyEdgeChanges(batchedChanges, currentEdges);
                const invalidateAudit = batchedChanges.some((change) => change.type !== "select");
                setEdgesFromFlow(nextEdges, invalidateAudit);
            });
        },
        [setEdgesFromFlow],
    );

    useEffect(
        () => () => {
            if (nodeChangeFrame.current !== null) {
                window.cancelAnimationFrame(nodeChangeFrame.current);
            }
            if (edgeChangeFrame.current !== null) {
                window.cancelAnimationFrame(edgeChangeFrame.current);
            }
        },
        [],
    );

    const handleAudit = useCallback(() => {
        setIsAuditing(true);
        clearIntelligence();
        window.requestAnimationFrame(() => {
            const current = useCanvasStore.getState();
            setAudit(auditArchitecture(current.nodes, current.edges));
            setIsAuditing(false);
        });
    }, [clearIntelligence, setAudit]);

    const handleIntelligence = useCallback(() => {
        const current = useCanvasStore.getState();
        clearAudit();
        clearDigitalTwin();
        clearImplementation();
        setIntelligence(analyzeArchitectureIntelligence(current.nodes, current.edges));
    }, [clearAudit, clearDigitalTwin, clearImplementation, setIntelligence]);

    const handleImplementation = useCallback(() => {
        const current = useCanvasStore.getState();
        clearIntelligence();
        clearDigitalTwin();
        setImplementation(analyzeImplementationIntelligence(current.nodes, current.edges));
    }, [clearDigitalTwin, clearIntelligence, setImplementation]);

    const handleGenerateProject = useCallback(() => {
        if (nodes.length === 0) return;
        const project = generateProjectFromArchitecture(nodes, edges);
        setCodeGeneration(project);
    }, [edges, nodes, setCodeGeneration]);

    const handleQuickSimulation = useCallback(() => {
        const current = useCanvasStore.getState();
        if (current.nodes.length === 0) return;
        clearIntelligence();
        clearImplementation();
        setDigitalTwin(simulateLoad(current.nodes, current.edges, 1_000_000));
    }, [clearImplementation, clearIntelligence, setDigitalTwin]);

    const handleCloseInspector = useCallback(() => {
        const currentNodes = useCanvasStore.getState().nodes;
        setNodesFromFlow(
            currentNodes.map((node) => ({
                ...node,
                selected: false,
            })),
            false,
        );
    }, [setNodesFromFlow]);

    const handleOpenAgentDemo = useCallback(() => {
        setShowAgentDemo(true);
    }, []);

    const handleLoadShowcase = useCallback(() => {
        if (isLoadingShowcase) return;

        const showcaseOperations: ArchitectureTransformOperation[] = [
            { kind: "add", id: "showcase-frontend", label: "Storefront", type: "frontend", description: "React storefront serving the customer experience.", x: 60, y: 250 },
            { kind: "add", id: "showcase-gateway", label: "API Gateway", type: "gateway", description: "Traffic entrypoint for routing, throttling, and secure request handling.", x: 370, y: 250 },
            { kind: "add", id: "showcase-api", label: "Node.js API", type: "backend", description: "Core application API for catalog, orders, accounts, and checkout.", x: 680, y: 250 },
            { kind: "add", id: "showcase-db", label: "PostgreSQL", type: "database", description: "Primary transactional database for durable application state.", x: 1010, y: 120 },
            { kind: "add", id: "showcase-cache", label: "Redis", type: "cache", description: "Low-latency cache for sessions, hot reads, and rate limits.", x: 1010, y: 350 },
            { kind: "add", id: "showcase-auth", label: "Auth Service", type: "auth", description: "Identity and access control for customer and admin sessions.", x: 680, y: 500 },
            { kind: "add", id: "showcase-stripe", label: "Stripe", type: "payment", description: "External payment provider for secure checkout and billing.", x: 1010, y: 580 },
            { kind: "add", id: "showcase-queue", label: "Job Queue", type: "queue", description: "Durable asynchronous buffer for emails, webhooks, and order jobs.", x: 370, y: 610 },
            { kind: "add", id: "showcase-worker", label: "Background Worker", type: "worker", description: "Scalable worker pool for asynchronous processing.", x: 60, y: 610 },
            { kind: "connect", sourceId: "showcase-frontend", targetId: "showcase-gateway", label: "HTTPS" },
            { kind: "connect", sourceId: "showcase-gateway", targetId: "showcase-api", label: "REST" },
            { kind: "connect", sourceId: "showcase-api", targetId: "showcase-db", label: "SQL" },
            { kind: "connect", sourceId: "showcase-api", targetId: "showcase-cache", label: "Cache" },
            { kind: "connect", sourceId: "showcase-api", targetId: "showcase-auth", label: "Identity" },
            { kind: "connect", sourceId: "showcase-api", targetId: "showcase-stripe", label: "Payments" },
            { kind: "connect", sourceId: "showcase-api", targetId: "showcase-queue", label: "Enqueue" },
            { kind: "connect", sourceId: "showcase-queue", targetId: "showcase-worker", label: "Consume" },
            { kind: "connect", sourceId: "showcase-worker", targetId: "showcase-db", label: "Persist" },
        ];

        setIsLoadingShowcase(true);
        clearAudit();
        clearAgentToolCalls();
        applyTransform(showcaseOperations);

        window.requestAnimationFrame(() => {
            window.setTimeout(() => {
                const current = useCanvasStore.getState();
                setAudit(auditArchitecture(current.nodes, current.edges));
                setIsLoadingShowcase(false);
            }, 260);
        });
    }, [applyTransform, clearAgentToolCalls, clearAudit, isLoadingShowcase, setAudit]);

    const handleNewAgentRun = useCallback(() => {
        clearAgentToolCalls();
        setShowAgentDemo(true);
    }, [clearAgentToolCalls]);

    const handleResetWorkspace = useCallback(() => {
        clearCanvas();
        setShowVersioning(false);
        setShowJudgeMode(false);
        setShowProductionQA(false);
        setShowAgentDemo(false);
    }, [clearCanvas]);

    return (
        <div className="pf-canvas-shell architecture-canvas-shell relative h-full min-h-0 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#08090c] shadow-[0_20px_80px_rgba(0,0,0,0.25)] sm:rounded-3xl">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3 sm:p-5">
                <div className="min-w-0 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#d9ff4f] shadow-[0_0_9px_rgba(217,255,79,0.65)]" />
                        <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35 sm:text-[10px]">
                            Live Architecture
                        </div>
                    </div>
                    <div className="text-xs font-medium text-white/75 sm:text-sm">
                        PromptFlow Canvas
                    </div>
                    <div
                        title={`${nodes.length} architecture components`}
                        className="rounded-lg border border-white/10 bg-black/35 px-2.5 py-1 text-[9px]! font-medium uppercase tracking-widest text-white/40 backdrop-blur sm:px-3"
                    >
                        {nodes.length} {nodes.length === 1 ? "node" : "nodes"}
                    </div>
                    <div
                        title={`${edges.length} architecture relationships`}
                        className="rounded-lg border border-white/10 bg-black/35 px-2.5 py-1 text-[9px]! font-medium uppercase tracking-widest text-white/40 backdrop-blur sm:px-3"
                    >
                        {edges.length} {edges.length === 1 ? "connection" : "connections"}
                    </div>
                </div>

                <div className="pf-toolbar pointer-events-auto flex max-w-[calc(100%-90px)] flex-wrap items-center justify-end gap-1.5 sm:max-w-none sm:gap-2">
                    {nodes.length === 0 ? (
                        <button
                            type="button"
                            onClick={handleLoadShowcase}
                            disabled={isLoadingShowcase}
                            title="Load a polished local showcase architecture"
                            className="rounded-lg cursor-pointer border border-white/10 bg-black/35 px-2.5 py-1.5 text-[9px]! font-medium uppercase tracking-widest text-white/50 backdrop-blur transition hover:border-[#d9ff4f]/20 hover:bg-white/5 hover:text-[#d9ff4f] disabled:cursor-wait disabled:opacity-50 sm:px-3"
                        >
                            {isLoadingShowcase ? "Loading…" : "Showcase"}
                        </button>
                    ) : null}
                    <button
                        type="button"
                        onClick={autoLayout}
                        title="Arrange the architecture automatically"
                        className="rounded-lg cursor-pointer border border-white/10 bg-black/35 px-2.5 py-1.5 text-[9px]! font-medium uppercase tracking-widest text-white/45 backdrop-blur transition hover:border-white/20 hover:bg-white/5 hover:text-white sm:px-3"
                    >
                        Layout
                    </button>
                    <button
                        type="button"
                        onClick={handleAudit}
                        disabled={isAuditing}
                        title="Run a structural architecture audit"
                        className="rounded-lg cursor-pointer border border-[#d9ff4f]/15 bg-[#d9ff4f]/5 px-2.5 py-1.5 text-[9px]! font-medium uppercase tracking-widest text-[#d9ff4f]/70 backdrop-blur transition hover:bg-[#d9ff4f]/10 disabled:cursor-wait disabled:opacity-50 sm:px-3"
                    >
                        {isAuditing ? "Auditing…" : "Audit"}
                    </button>
                    <button
                        type="button"
                        onClick={intelligence ? clearIntelligence : handleIntelligence}
                        title="Run the production architecture intelligence assessment"
                        aria-pressed={Boolean(intelligence)}
                        className={`rounded-lg cursor-pointer border px-2.5 py-1.5 text-[9px]! font-medium uppercase tracking-widest backdrop-blur transition sm:px-3 ${intelligence
                            ? "border-[#d9ff4f]/30 bg-[#d9ff4f]/10 text-[#d9ff4f]"
                            : "border-[#d9ff4f]/15 bg-[#d9ff4f]/5 text-[#d9ff4f]/65 hover:bg-[#d9ff4f]/10"
                            }`}
                    >
                        {intelligence ? `Intel ${intelligence.overallScore}` : "Intelligence"}
                    </button>
                    <button
                        type="button"
                        onClick={digitalTwin ? clearDigitalTwin : handleQuickSimulation}
                        title="Run a non-destructive digital twin load simulation"
                        aria-pressed={Boolean(digitalTwin)}
                        className={`rounded-lg cursor-pointer border px-2.5 py-1.5 text-[9px]! font-medium uppercase tracking-widest backdrop-blur transition sm:px-3 ${digitalTwin
                            ? "border-sky-300/25 bg-sky-300/10 text-sky-200"
                            : "border-sky-300/15 bg-sky-300/5 text-sky-200/65 hover:bg-sky-300/10"
                            }`}
                    >
                        {digitalTwin ? "Twin active" : "Simulate"}
                    </button>
                    <button
                        type="button"
                        onClick={codeGeneration ? clearCodeGeneration : handleGenerateProject}
                        title="Generate a bounded project scaffold and execution preflight"
                        aria-pressed={Boolean(codeGeneration)}
                        className={`rounded-lg cursor-pointer border px-2.5 py-1.5 text-[9px]! font-medium uppercase tracking-widest backdrop-blur transition sm:px-3 ${codeGeneration
                            ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200"
                            : "border-emerald-300/15 bg-emerald-300/5 text-emerald-200/65 hover:bg-emerald-300/10"
                            }`}
                    >
                        {codeGeneration ? "Code ready" : "Generate code"}
                    </button>
                    <button
                        type="button"
                        onClick={implementation ? clearImplementation : handleImplementation}
                        title="Generate an implementation-ready project blueprint"
                        aria-pressed={Boolean(implementation)}
                        className={`rounded-lg cursor-pointer border px-2.5 py-1.5 text-[9px]! font-medium uppercase tracking-widest backdrop-blur transition sm:px-3 ${implementation
                            ? "border-violet-300/25 bg-violet-300/10 text-violet-200"
                            : "border-violet-300/15 bg-violet-300/5 text-violet-200/65 hover:bg-violet-300/10"
                            }`}
                    >
                        {implementation ? `Build ${implementation.readinessScore}` : "Build plan"}
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowVersioning((value) => !value)}
                        title="Track architecture versions, compare changes, and plan migrations"
                        aria-pressed={showVersioning}
                        className={`rounded-lg cursor-pointer border px-2.5 py-1.5 text-[9px]! font-medium uppercase tracking-widest backdrop-blur transition sm:px-3 ${showVersioning
                            ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                            : "border-cyan-300/15 bg-cyan-300/5 text-cyan-100/65 hover:bg-cyan-300/10"
                            }`}
                    >
                        Evolution
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowJudgeMode((value) => !value)}
                        title="Run the one-click cinematic hackathon demonstration"
                        aria-pressed={showJudgeMode}
                        className={`rounded-lg cursor-pointer border px-2.5 py-1.5 text-[9px]! font-bold uppercase tracking-widest backdrop-blur transition sm:px-3 ${showJudgeMode
                            ? "border-[#d9ff4f]/40 bg-[#d9ff4f]/15 text-[#d9ff4f]"
                            : "border-[#d9ff4f]/25 bg-[#d9ff4f]/8 text-[#d9ff4f]/80 hover:bg-[#d9ff4f]/12"
                            }`}
                    >
                        Judge Mode
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowProductionQA((value) => !value)}
                        title="Run the final production release gate"
                        aria-pressed={showProductionQA}
                        className={`rounded-lg cursor-pointer border px-2.5 py-1.5 text-[9px]! font-medium uppercase tracking-widest backdrop-blur transition sm:px-3 ${showProductionQA
                            ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200"
                            : "border-emerald-300/15 bg-emerald-300/5 text-emerald-200/65 hover:bg-emerald-300/10"
                            }`}
                    >
                        QA
                    </button>
                    <button
                        type="button"
                        onClick={showAgentDemo ? () => setShowAgentDemo(false) : handleOpenAgentDemo}
                        title="Open the ChatGPT real-agent demo"
                        aria-pressed={showAgentDemo}
                        className={`rounded-lg cursor-pointer border px-2.5 py-1.5 text-[9px]! font-medium uppercase tracking-widest backdrop-blur transition sm:px-3 ${showAgentDemo
                            ? "border-[#d9ff4f]/25 bg-[#d9ff4f]/10 text-[#d9ff4f]"
                            : "border-[#d9ff4f]/15 bg-[#d9ff4f]/5 text-[#d9ff4f]/65 hover:bg-[#d9ff4f]/10"
                            }`}
                    >
                        Agent
                    </button>
                    <div className="hidden rounded-full border border-[#d9ff4f]/15 bg-[#d9ff4f]/5 px-3 py-1.5 text-[8px] font-medium uppercase tracking-[0.12em] text-[#d9ff4f]/60 backdrop-blur sm:block">
                        AI controlled
                    </div>
                    {nodes.length > 0 ? (
                        <button
                            type="button"
                            onClick={handleResetWorkspace}
                            title="Clear the current architecture and start a new prompt"
                            className="pf-reset-button rounded-lg cursor-pointer border px-3 py-1.5 text-[9px]! font-semibold uppercase tracking-widest backdrop-blur transition"
                        >
                            New brief
                        </button>
                    ) : null}
                </div>
            </div>

            <ReactFlow
                className="h-full w-full"
                style={{ width: "100%", height: "100%" }}
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                onConnect={handleConnect}
                fitView
                fitViewOptions={{
                    padding: 0.3,
                    minZoom: 0.45,
                    maxZoom: 1.1,
                }}
                minZoom={0.25}
                maxZoom={1.5}
                deleteKeyCode={["Backspace", "Delete"]}
                defaultEdgeOptions={{
                    animated: true,
                    style: {
                        stroke: "rgba(217,255,79,0.45)",
                        strokeWidth: 1.5,
                    },
                }}
                proOptions={{ hideAttribution: false }}
            >
                <CanvasViewportController nodes={nodes} layoutRevision={layoutRevision} />
                <Background gap={24} size={1} color="rgba(255,255,255,0.045)" />
                <Controls
                    showInteractive={false}
                    className="overflow-hidden! rounded-xl! border! border-white/10! !bg-[#101116]! shadow-xl! [&>button]:border-white/10! [&>button]:bg-[#101116]! [&>button]:fill-white/60! [&>button:hover]:bg-white/10!"
                />
                <MiniMap
                    pannable
                    zoomable
                    nodeColor="#d9ff4f"
                    maskColor="rgba(8,9,12,0.82)"
                    className="bottom-3! right-3! overflow-hidden! rounded-xl! border! border-white/10! bg-[#101116]! sm:bottom-4! sm:right-4!"
                />
            </ReactFlow>

            {audit ? (
                <ArchitectureAuditPanel audit={audit} onClose={clearAudit} />
            ) : null}

            {intelligence ? (
                <ArchitectureIntelligencePanel report={intelligence} onClose={clearIntelligence} />
            ) : null}

            {digitalTwin ? (
                <ArchitectureSimulationPanel report={digitalTwin} onClose={clearDigitalTwin} />
            ) : null}

            {codeGeneration ? (
                <CodeGenerationPanel
                    project={codeGeneration}
                    nodes={nodes}
                    onClose={clearCodeGeneration}
                />
            ) : null}

            {implementation ? (
                <ImplementationIntelligencePanel blueprint={implementation} onClose={clearImplementation} />
            ) : null}

            {showVersioning ? (
                <ArchitectureVersioningPanel onClose={() => setShowVersioning(false)} />
            ) : null}

            {showJudgeMode ? (
                <FinalWowPanel onClose={() => setShowJudgeMode(false)} />
            ) : null}

            {selectedNode ? (
                <ArchitectureInspector
                    node={selectedNode}
                    nodes={nodes}
                    edges={edges}
                    onClose={handleCloseInspector}
                />
            ) : null}

            {showProductionQA ? (
                <ProductionQAPanel onClose={() => setShowProductionQA(false)} />
            ) : null}

            {showAgentDemo ? (
                <AgentDemoPanel
                    onClose={() => setShowAgentDemo(false)}
                    onNewRun={handleNewAgentRun}
                />
            ) : null}

            <ArchitectExperience
                onOpenAgent={handleOpenAgentDemo}
                onLoadShowcase={handleLoadShowcase}
                isLoadingShowcase={isLoadingShowcase}
            />
        </div>
    );
}
