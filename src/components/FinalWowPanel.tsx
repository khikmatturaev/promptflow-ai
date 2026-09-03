import { useMemo, useState } from "react";
import { runFinalWowDemo } from "../lib/finalWow";
import { useCanvasStore } from "../store/useCanvasStore";
import type { FinalWowRun, WowStage } from "../types/finalWow";
import { XIcon } from "lucide-react";

const WOW_STAGE_IDS: WowStage["id"][] = ["brief", "reason", "architect", "break", "diagnose", "heal", "retest", "build", "execute", "qa", "verdict"];
const WOW_STAGE_LABELS = ["Brief", "Reason", "Architect", "Break", "Diagnose", "Heal", "Re-test", "Build", "Execute", "QA", "Verdict"] as const;

function initialStages(): WowStage[] {
    return WOW_STAGE_IDS.map((id, index) => ({ id, label: WOW_STAGE_LABELS[index], status: "pending", detail: "Waiting", durationMs: 0 }));
}

interface FinalWowPanelProps {
    onClose: () => void;
}

function StageIcon({ stage }: { stage: WowStage }) {
    if (stage.status === "running") return <span className="h-2 w-2 animate-pulse rounded-full bg-[#d9ff4f] shadow-[0_0_10px_rgba(217,255,79,.8)]" />;
    if (stage.status === "completed") return <span className="text-[#d9ff4f]">✓</span>;
    if (stage.status === "failed") return <span className="text-red-300">!</span>;
    if (stage.status === "skipped") return <span className="text-amber-200">–</span>;
    return <span className="h-1.5 w-1.5 rounded-full bg-white/20" />;
}

function elapsed(run: FinalWowRun): string {
    const ms = Math.max(0, run.finishedAt - run.startedAt);
    return `${(ms / 1000).toFixed(1)}s`;
}

export function FinalWowPanel({ onClose }: FinalWowPanelProps) {
    const nodes = useCanvasStore((state) => state.nodes);
    const edges = useCanvasStore((state) => state.edges);
    const [running, setRunning] = useState(false);
    const run = useCanvasStore((state) => state.finalWow);
    const [liveStages, setLiveStages] = useState<WowStage[]>(initialStages);

    const completed = useMemo(() => run?.stages.filter((stage) => stage.status === "completed").length ?? 0, [run]);

    const start = async () => {
        if (running) return;
        setRunning(true);
        setLiveStages(initialStages());
        try {
            const result = await runFinalWowDemo(nodes, edges, 10_000_000, (stage) => {
                setLiveStages((current) => current.map((item) => item.id === stage.id ? stage : item));
            });
            useCanvasStore.getState().setFinalWow(result);
        } finally {
            setRunning(false);
        }
    };

    return (
        <aside className="pf-modal absolute inset-x-3 bottom-2 z-50 max-h-[calc(100%-6rem)] overflow-y-auto rounded-lg border border-[#d9ff4f]/20 bg-[#080a0d]/98 p-2 backdrop-blur-lg sm:inset-x-auto sm:right-4 sm:w-[min(500px,calc(100%-2rem))]">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-[.2em] text-[#d9ff4f]/75">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#d9ff4f]" /> Judge Mode
                    </div>
                    <h2 className="mt-1 text-lg font-semibold tracking-[-.03em] text-white sm:text-xl">Break it. Heal it. Prove it.</h2>
                    <p className="mt-1 max-w-xl text-[11px] leading-4 text-white/40">One-click end-to-end showcase: reasoning → failure injection → diagnosis → hardening → real build → production verdict.</p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close architecture audit"
                    title="Close"
                    className="flex w-7 shrink-0 items-center justify-center rounded-md border border-white/10 text-white/45 transition hover:bg-white/5 hover:text-white cursor-pointer"
                >
                    <XIcon size={14} />
                </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-white/8 bg-white/2.5 p-2"><div className="text-[8px] uppercase tracking-[.14em] text-white/25">Target</div><div className="mt-1 text-xs font-semibold text-white">10M users</div></div>
                <div className="rounded-lg border border-white/8 bg-white/2.5 p-2"><div className="text-[8px] uppercase tracking-[.14em] text-white/25">Graph</div><div className="mt-1 text-xs font-semibold text-white">{nodes.length}N · {edges.length}E</div></div>
                <div className="rounded-lg border border-white/8 bg-white/2.5 p-2"><div className="text-[8px] uppercase tracking-[.14em] text-white/25">Progress</div><div className="mt-1 text-xs font-semibold text-[#d9ff4f]">{run ? `${completed}/11` : running ? `${liveStages.filter((stage) => stage.status === "completed").length}/11` : "Ready"}</div></div>
            </div>

            <div className="mt-3 overflow-hidden rounded-lg border border-white/8 bg-[#050608]">
                <div className="grid grid-cols-4 gap-px bg-white/5 sm:grid-cols-6">
                    {(run?.stages ?? liveStages).map((stage) => (
                        <div key={stage.id} className={`min-h-12 bg-[#07080b] p-2 ${stage.status === "running" ? "bg-[#d9ff4f]/5.5" : stage.status === "completed" ? "bg-[#d9ff4f]/2.5" : ""}`}>
                            <div className="flex items-center gap-1.5 text-[8px] font-semibold uppercase tracking-widest text-white/45"><StageIcon stage={stage} />{stage.label}</div>
                            <div className="text-[8px] leading-3 text-white/20">
                                {stage.status === "running"
                                    ? "working…"
                                    : stage.status === "completed" || stage.status === "failed" || stage.status === "skipped"
                                        ? `${stage.durationMs}ms`
                                        : "waiting"}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {run ? (
                <>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                        {[
                            ["Before", `${run.scorecard.before}`],
                            ["After", `${run.scorecard.after}`],
                            ["Recovery", `${run.scorecard.recoveryDelta >= 0 ? "+" : ""}${run.scorecard.recoveryDelta}`],
                            ["Failure resilience", `${run.scorecard.survivabilityBefore} → ${run.scorecard.survivabilityAfter}`],
                            ["QA", `${run.scorecard.qaScore}`],
                        ].map(([label, value]) => <div key={label} className="rounded-lg border border-[#d9ff4f]/10 bg-[#d9ff4f]/2.5 p-2"><div className="text-[8px] uppercase tracking-[.12em] text-white/25">{label}</div><div className="mt-1 text-sm font-semibold text-[#d9ff4f]">{value}</div></div>)}
                    </div>
                    <div className={`mt-2 rounded-lg border p-2 ${run.status === "completed" ? "border-[#d9ff4f]/20 bg-[#d9ff4f]/[.035]" : "border-red-300/15 bg-red-300/2.5"}`}>
                        <div className="text-[9px] font-semibold uppercase tracking-[.16em] text-white/30">Final production verdict · {elapsed(run)}</div>
                        <div className="text-sm font-semibold text-white leading-5">{run.headline}</div>
                        <div className="mt-2 space-y-1">{run.pitch.map((line) => <div key={line} className="text-[10px] leading-3 text-white/45">• {line}</div>)}</div>
                    </div>
                </>
            ) : null}

            <button type="button" onClick={() => void start()} disabled={running} className="mt-2 w-full rounded-lg bg-[#d9ff4f] px-4 py-2 text-[10px]! font-bold! uppercase tracking-[.16em] text-[#08090c] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-wait disabled:opacity-40 cursor-pointer">
                {running ? "Running full Judge Mode…" : run ? "Run again" : "Run one-click Judge Mode"}
            </button>
        </aside>
    );
}
