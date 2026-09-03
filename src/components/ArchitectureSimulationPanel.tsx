import type { DigitalTwinReport, DigitalTwinScenarioResult } from "../types/digitalTwin";

interface ArchitectureSimulationPanelProps {
    report: DigitalTwinReport;
    onClose: () => void;
}

function gradeClass(grade: DigitalTwinScenarioResult["grade"]): string {
    if (grade === "healthy") return "text-[#d9ff4f]";
    if (grade === "degraded") return "text-sky-300";
    if (grade === "strained") return "text-amber-300";
    return "text-red-300";
}

function scoreClass(score: number): string {
    if (score >= 80) return "text-[#d9ff4f]";
    if (score >= 65) return "text-amber-300";
    return "text-red-300";
}

export function ArchitectureSimulationPanel({
    report,
    onClose,
}: ArchitectureSimulationPanelProps) {
    return (
        <aside className="pointer-events-auto absolute bottom-3 left-3 z-30 max-h-[calc(100%-6rem)] w-[min(440px,calc(100%-1.5rem))] overflow-y-auto rounded-2xl border border-[#d9ff4f]/15 bg-[#0a0c10]/95 p-4 shadow-2xl backdrop-blur-xl sm:bottom-5 sm:left-5 sm:w-[440px]">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#d9ff4f]/65">
                        Digital Twin
                    </div>
                    <h2 className="mt-1 text-sm font-semibold text-white">
                        Failure & load simulation
                    </h2>
                    <p className="mt-1 text-[10px] leading-relaxed text-white/35">
                        Heuristic what-if model. It does not mutate the live architecture.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-white/45 transition hover:bg-white/5 hover:text-white"
                    aria-label="Close digital twin panel"
                >
                    Close
                </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-white/8 bg-white/[0.025] p-2.5">
                    <div className="text-[9px] uppercase tracking-[0.12em] text-white/30">Baseline</div>
                    <div className={`mt-1 text-lg font-semibold ${scoreClass(report.baselineScore)}`}>
                        {report.baselineScore}
                    </div>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/[0.025] p-2.5">
                    <div className="text-[9px] uppercase tracking-[0.12em] text-white/30">Scenarios</div>
                    <div className="mt-1 text-lg font-semibold text-white">{report.scenarios.length}</div>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/[0.025] p-2.5">
                    <div className="text-[9px] uppercase tracking-[0.12em] text-white/30">SPOF</div>
                    <div className="mt-1 text-lg font-semibold text-white">{report.singlePointsOfFailure.length}</div>
                </div>
            </div>

            {report.loadProfile ? (
                <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.025] p-3">
                    <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/35">
                        Load profile
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                        <div><span className="text-white/30">Users</span><div className="mt-0.5 text-white/75">{report.loadProfile.targetUsers.toLocaleString()}</div></div>
                        <div><span className="text-white/30">RPS</span><div className="mt-0.5 text-white/75">{report.loadProfile.estimatedRps.toLocaleString()}</div></div>
                        <div><span className="text-white/30">Burst</span><div className="mt-0.5 text-white/75">{report.loadProfile.sustainedRps.toLocaleString()}</div></div>
                    </div>
                </div>
            ) : null}

            <div className="mt-4 space-y-2">
                {report.scenarios.map((item) => (
                    <section key={`${item.event.kind}-${item.event.targetNodeId ?? "system"}-${item.event.label}`} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-[11px] font-medium text-white/80">{item.event.label}</div>
                            <div className={`text-[9px] font-semibold uppercase tracking-[0.12em] ${gradeClass(item.grade)}`}>
                                {item.grade}
                            </div>
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-[10px]">
                            <span className="text-white/35">Survivability <strong className={scoreClass(item.survivability)}>{item.survivability}</strong></span>
                            <span className="text-white/35">Projected <strong className={scoreClass(item.projectedScore)}>{item.projectedScore}</strong></span>
                        </div>
                        {item.bottlenecks.length > 0 || item.failureModes.length > 0 ? (
                            <div className="mt-2 space-y-1">
                                {[...item.bottlenecks, ...item.failureModes].slice(0, 4).map((finding) => (
                                    <div key={finding} className="text-[10px] text-amber-200/60">• {finding}</div>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-2 text-[10px] text-white/30">No major modeled bottleneck in this scenario.</div>
                        )}
                        <div className="mt-2 border-t border-white/6 pt-2 text-[10px] leading-relaxed text-white/40">
                            <span className="text-white/55">Recovery:</span> {item.recovery.strategy}
                        </div>
                    </section>
                ))}
            </div>

            {report.singlePointsOfFailure.length > 0 ? (
                <div className="mt-4">
                    <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/35">Single points of failure</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {report.singlePointsOfFailure.map((item) => (
                            <span key={item} className="rounded-full border border-red-300/10 bg-red-300/5 px-2 py-1 text-[9px] text-red-200/60">
                                {item}
                            </span>
                        ))}
                    </div>
                </div>
            ) : null}

            {report.recommendedHardening.length > 0 ? (
                <div className="mt-4">
                    <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/35">Hardening priorities</div>
                    <div className="mt-2 space-y-1.5">
                        {report.recommendedHardening.slice(0, 5).map((item) => (
                            <div key={item} className="text-[10px] leading-relaxed text-white/45">→ {item}</div>
                        ))}
                    </div>
                </div>
            ) : null}

            <div className="mt-4 border-t border-white/6 pt-3 text-[9px] text-white/20">
                Model {report.modelVersion} · confidence: {report.confidence}
            </div>
        </aside>
    );
}
