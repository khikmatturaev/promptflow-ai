import { useState } from "react";
import { useCanvasStore } from "../store/useCanvasStore";
import { runProductionQA } from "../lib/productionQA";
import type { ProductionQAReport, ProductionQAStatus } from "../types/productionQA";

interface ProductionQAPanelProps {
    onClose: () => void;
}

const statusLabel: Record<ProductionQAStatus, string> = {
    pass: "Release ready",
    warning: "Release risks",
    fail: "Release blocked",
};

function statusClass(status: ProductionQAStatus): string {
    if (status === "pass") return "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-200";
    if (status === "warning") return "border-amber-300/20 bg-amber-300/[0.06] text-amber-200";
    return "border-red-300/20 bg-red-300/[0.06] text-red-200";
}

function CheckIcon({ status }: { status: ProductionQAStatus }) {
    return (
        <span className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] ${statusClass(status)}`}>
            {status === "pass" ? "✓" : status === "warning" ? "!" : "×"}
        </span>
    );
}

export function ProductionQAPanel({ onClose }: ProductionQAPanelProps) {
    const nodes = useCanvasStore((state) => state.nodes);
    const edges = useCanvasStore((state) => state.edges);
    const project = useCanvasStore((state) => state.codeGeneration);
    const execution = useCanvasStore((state) => state.execution);
    const codeReview = useCanvasStore((state) => state.codeReview);
    const versioning = useCanvasStore((state) => state.versioning);
    const report = useCanvasStore((state) => state.productionQA);
    const setProductionQA = useCanvasStore((state) => state.setProductionQA);
    const [running, setRunning] = useState(false);

    const currentReport: ProductionQAReport | null = report;

    const run = async () => {
        setRunning(true);
        try {
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
            setProductionQA(runProductionQA({
                nodes,
                edges,
                project,
                execution,
                codeReview,
                versioning,
                webmcpToolNames: toolNames,
                headers,
            }));
        } finally {
            setRunning(false);
        }
    };

    return (
        <aside className="absolute bottom-3 left-3 z-40 flex max-h-[calc(100%-5.5rem)] w-[min(520px,calc(100%-1.5rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d11]/[98%] shadow-2xl backdrop-blur-xl sm:bottom-4 sm:left-4 sm:max-h-[min(700px,calc(100%-7rem))]">
            <header className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-3.5">
                <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d9ff4f]/80">Production QA</div>
                    <div className="mt-1 text-xs text-white/40">Security · performance · WebMCP · execution · release gate</div>
                </div>
                <button type="button" onClick={onClose} aria-label="Close production QA" className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/45 hover:bg-white/5 hover:text-white">×</button>
            </header>

            <div className="overflow-y-auto p-4">
                {!currentReport ? (
                    <div className="rounded-xl border border-[#d9ff4f]/15 bg-[#d9ff4f]/[0.025] p-4">
                        <div className="text-sm font-medium text-white/80">Final release gate</div>
                        <p className="mt-2 text-xs leading-5 text-white/45">
                            Run the deterministic QA suite against the current architecture, generated project, execution result, version history, and live WebMCP registry.
                        </p>
                        <button type="button" onClick={() => void run()} disabled={running} className="mt-4 w-full rounded-xl border border-[#d9ff4f]/25 bg-[#d9ff4f]/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#d9ff4f] transition hover:bg-[#d9ff4f]/15 disabled:cursor-wait disabled:opacity-50">
                            {running ? "Running production gate…" : "Run production QA"}
                        </button>
                    </div>
                ) : (
                    <>
                        <div className={`rounded-xl border p-4 ${statusClass(currentReport.status)}`}>
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.15em] opacity-60">Final status</div>
                                    <div className="mt-1 text-lg font-semibold">{statusLabel[currentReport.status]}</div>
                                </div>
                                <div className="text-3xl font-black">{currentReport.score}</div>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                                <div>Nodes <strong>{currentReport.metrics.nodeCount}</strong></div>
                                <div>Artifacts <strong>{currentReport.metrics.artifactCount}</strong></div>
                                <div>Tools <strong>{currentReport.metrics.webmcpToolCount}</strong></div>
                            </div>
                        </div>

                        <div className="mt-4 space-y-2">
                            {currentReport.checks.map((item) => (
                                <div key={item.id} className="flex gap-2.5 rounded-xl border border-white/7 bg-white/[0.02] p-3">
                                    <CheckIcon status={item.status} />
                                    <div className="min-w-0">
                                        <div className="text-xs font-medium text-white/75">{item.title}</div>
                                        <div className="mt-1 text-[11px] leading-4 text-white/40">{item.message}</div>
                                        {item.evidence ? <div className="mt-1 text-[10px] leading-4 text-white/25">{item.evidence}</div> : null}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {currentReport.blockers.length > 0 ? (
                            <div className="mt-4 rounded-xl border border-red-300/15 bg-red-300/[0.025] p-3">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-red-200/70">Blockers</div>
                                <ul className="mt-2 space-y-1 text-[11px] leading-4 text-red-100/55">
                                    {currentReport.blockers.map((item) => <li key={item}>• {item}</li>)}
                                </ul>
                            </div>
                        ) : null}

                        <button type="button" onClick={() => void run()} disabled={running} className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55 hover:bg-white/[0.06] hover:text-white disabled:opacity-50">
                            {running ? "Refreshing…" : "Run again"}
                        </button>
                    </>
                )}
            </div>
        </aside>
    );
}
