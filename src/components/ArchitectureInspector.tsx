import { useMemo, useState } from "react";
import type { ArchitectureEdge, ArchitectureNode } from "../types";

interface ArchitectureInspectorProps {
    node: ArchitectureNode;
    nodes: ArchitectureNode[];
    edges: ArchitectureEdge[];
    onClose: () => void;
}

const TYPE_LABELS: Record<ArchitectureNode["data"]["type"], string> = {
    frontend: "Frontend",
    backend: "Backend",
    api: "API",
    database: "Database",
    cache: "Cache",
    queue: "Queue",
    payment: "Payment",
    auth: "Authentication",
    service: "Service",
    external: "External",
    gateway: "Gateway",
    worker: "Worker",
    cdn: "CDN",
    observability: "Observability",
};

export function ArchitectureInspector({
    node,
    nodes,
    edges,
    onClose,
}: ArchitectureInspectorProps) {
    const [copied, setCopied] = useState(false);

    const relationships = useMemo(() => {
        return edges
            .filter((edge) => edge.source === node.id || edge.target === node.id)
            .map((edge) => {
                const isOutgoing = edge.source === node.id;
                const relatedId = isOutgoing ? edge.target : edge.source;
                const relatedNode = nodes.find((item) => item.id === relatedId);

                return {
                    direction: isOutgoing ? "Outgoing" : "Incoming",
                    label: edge.data?.label || "Connection",
                    relatedLabel: relatedNode?.data.label ?? relatedId,
                };
            });
    }, [edges, node.id, nodes]);

    const handleCopy = async () => {
        if (!node.data.boilerplate) {
            return;
        }

        try {
            await navigator.clipboard.writeText(node.data.boilerplate);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch {
            setCopied(false);
        }
    };

    return (
        <aside className="pf-modal pf-modal-top absolute right-3 top-3 z-30 flex max-h-[calc(100%-1.5rem)] w-[min(380px,calc(100%-1.5rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f14]/[98%] shadow-2xl backdrop-blur-xl sm:right-4 sm:top-4 sm:max-h-[calc(100%-2rem)]">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d9ff4f]/70">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#d9ff4f]" />
                        Node Inspector
                    </div>
                    <h2 className="mt-1 truncate text-base font-semibold text-white">
                        {node.data.label}
                    </h2>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close node inspector"
                    title="Close"
                    className="ml-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/45 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
                >
                    ×
                </button>
            </div>

            <div className="overflow-y-auto p-4">
                <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/35">
                            Type
                        </span>
                        <span className="rounded-full border border-[#d9ff4f]/15 bg-[#d9ff4f]/5 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-[#d9ff4f]/80">
                            {TYPE_LABELS[node.data.type]}
                        </span>
                    </div>

                    <div className="mt-3">
                        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/35">
                            Node ID
                        </span>
                        <code className="mt-1 block break-all text-xs text-white/55">
                            {node.id}
                        </code>
                    </div>
                </div>

                <section className="mt-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                        Purpose
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/65">
                        {node.data.description || "No description provided."}
                    </p>
                </section>

                <section className="mt-5">
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                            Connections
                        </div>
                        <span className="text-[9px] text-white/25">
                            {relationships.length}
                        </span>
                    </div>

                    {relationships.length > 0 ? (
                        <div className="mt-2 space-y-2">
                            {relationships.map((relationship, index) => (
                                <div
                                    key={`${relationship.relatedLabel}-${relationship.direction}-${index}`}
                                    className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2.5"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] uppercase tracking-[0.12em] text-white/30">
                                            {relationship.direction}
                                        </span>
                                        <span className="truncate text-[10px] text-[#d9ff4f]/65">
                                            {relationship.label}
                                        </span>
                                    </div>
                                    <div className="mt-1 text-xs font-medium text-white/70">
                                        {relationship.relatedLabel}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="mt-2 rounded-xl border border-dashed border-white/10 px-3 py-3 text-xs text-white/30">
                            No connections yet.
                        </p>
                    )}
                </section>

                <section className="mt-5">
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                            Generated Code
                        </div>

                        {node.data.boilerplate ? (
                            <button
                                type="button"
                                onClick={() => void handleCopy()}
                                className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[10px] font-medium text-white/55 transition hover:border-[#d9ff4f]/20 hover:text-[#d9ff4f]"
                            >
                                {copied ? "Copied" : "Copy"}
                            </button>
                        ) : null}
                    </div>

                    {node.data.boilerplate ? (
                        <pre className="mt-2 max-h-72 overflow-auto rounded-xl border border-white/8 bg-[#07080b] p-3 text-[11px] leading-5 text-white/65">
                            <code>{node.data.boilerplate}</code>
                        </pre>
                    ) : (
                        <div className="mt-2 rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-3 py-4 text-xs leading-5 text-white/30">
                            No generated code attached yet.
                        </div>
                    )}
                </section>
            </div>
        </aside>
    );
}
