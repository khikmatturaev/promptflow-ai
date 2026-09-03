import { getIntelligenceDimensionLabels } from "../lib/architectureBrain";
import type {
    ArchitectureIntelligenceReport,
    IntelligenceDimension,
    IntelligencePriority,
} from "../types/intelligence";

interface ArchitectureIntelligencePanelProps {
    report: ArchitectureIntelligenceReport;
    onClose: () => void;
}

const PRIORITY_CLASS: Record<IntelligencePriority, string> = {
    high: "border-red-400/20 bg-red-400/5 text-red-300",
    medium: "border-amber-300/20 bg-amber-300/5 text-amber-200",
    low: "border-white/10 bg-white/[0.03] text-white/45",
};

const DIMENSION_ORDER: IntelligenceDimension[] = [
    "reliability",
    "scalability",
    "performance",
    "security",
    "resilience",
    "observability",
    "stress-readiness",
];

function scoreClass(score: number): string {
    if (score >= 80) return "text-[#d9ff4f]";
    if (score >= 60) return "text-amber-200";
    return "text-red-300";
}

export function ArchitectureIntelligencePanel({
    report,
    onClose,
}: ArchitectureIntelligencePanelProps) {
    const labels = getIntelligenceDimensionLabels();
    const critical = report.findings.filter((item) => item.severity === "critical").length;
    const warnings = report.findings.filter((item) => item.severity === "warning").length;

    return (
        <aside className="absolute bottom-3 left-3 z-30 w-[min(560px,calc(100%-1.5rem))] overflow-hidden rounded-2xl border border-[#d9ff4f]/15 bg-[#0d0f14]/[98%] shadow-2xl backdrop-blur-xl sm:bottom-4 sm:left-4">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3.5">
                <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d9ff4f]/75">
                        Architecture Intelligence
                    </div>
                    <div className="mt-1 truncate text-xs text-white/40">
                        Seven-dimensional production readiness · deterministic heuristic
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close architecture intelligence"
                    title="Close"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/45 transition hover:bg-white/5 hover:text-white"
                >
                    ×
                </button>
            </div>

            <div className="max-h-[min(620px,68vh)] overflow-y-auto p-4">
                <div className="grid grid-cols-[auto_1fr] gap-4 rounded-xl border border-white/8 bg-white/[0.025] p-3">
                    <div className="flex h-20 w-20 flex-col items-center justify-center rounded-2xl border border-[#d9ff4f]/20 bg-[#d9ff4f]/5">
                        <span className={`text-2xl font-semibold ${scoreClass(report.overallScore)}`}>
                            {report.overallScore}
                        </span>
                        <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-white/35">
                            intelligence
                        </span>
                    </div>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-white">
                                {report.maturity.replace("-", " ")}
                            </span>
                            <span className="rounded-full border border-white/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/40">
                                {report.metrics.nodeCount} nodes · {report.metrics.connectionCount} links
                            </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-semibold uppercase tracking-[0.08em]">
                            {critical > 0 ? <span className="rounded-full bg-red-400/10 px-2 py-1 text-red-300">{critical} critical</span> : null}
                            {warnings > 0 ? <span className="rounded-full bg-amber-300/10 px-2 py-1 text-amber-200">{warnings} warning</span> : null}
                            <span className="rounded-full bg-[#d9ff4f]/10 px-2 py-1 text-[#d9ff4f]/65">
                                {report.recommendations.length} recommendations
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {DIMENSION_ORDER.map((dimension) => {
                        const item = report.dimensions[dimension];
                        return (
                            <div key={dimension} className="rounded-xl border border-white/8 bg-white/[0.02] p-2.5">
                                <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/35">
                                    {labels[dimension]}
                                </div>
                                <div className={`mt-1 text-lg font-semibold ${scoreClass(item.score)}`}>
                                    {item.score}
                                </div>
                                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/8">
                                    <div
                                        className="h-full rounded-full bg-current transition-all duration-500"
                                        style={{ width: `${item.score}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                        <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#d9ff4f]/65">
                            Architecture DNA
                        </div>
                        <div className="mt-1 text-sm font-semibold text-white/85">{report.dna.archetype}</div>
                        <div className="mt-1 break-all font-mono text-[9px] text-white/25">{report.dna.fingerprint}</div>
                        <div className="mt-2 flex flex-wrap gap-1">
                            {report.dna.traits.slice(0, 6).map((trait) => (
                                <span key={trait} className="rounded-full bg-white/5 px-2 py-1 text-[9px] text-white/45">{trait}</span>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                        <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#d9ff4f]/65">
                            Stress Test
                        </div>
                        {report.stressTest ? (
                            <>
                                <div className={`mt-1 text-sm font-semibold ${scoreClass(report.stressTest.scenario.score)}`}>
                                    {report.stressTest.scenario.score} · {report.stressTest.scenario.grade}
                                </div>
                                <div className="mt-1 text-[10px] text-white/35">
                                    {report.stressTest.targetUsers.toLocaleString()} users · {report.stressTest.scenario.estimatedRps.toLocaleString()} modelled RPS
                                </div>
                                <div className="mt-2 text-[9px] leading-4 text-white/25">
                                    {report.stressTest.scenario.failureModes.slice(0, 2).join(" · ") || "No primary failure mode identified"}
                                </div>
                            </>
                        ) : (
                            <div className="mt-2 text-[10px] leading-4 text-white/35">
                                No target supplied. Ask the agent to stress-test a concrete user scale.
                            </div>
                        )}
                    </div>
                </div>

                {report.findings.length > 0 ? (
                    <div className="mt-4 space-y-2">
                        {report.findings.slice(0, 8).map((item) => (
                            <div key={item.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-xs font-semibold text-white/80">{item.title}</div>
                                        <p className="mt-1 text-xs leading-5 text-white/40">{item.message}</p>
                                    </div>
                                    <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${item.severity === "critical" ? PRIORITY_CLASS.high : PRIORITY_CLASS.medium}`}>
                                        {item.severity}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="mt-4 rounded-xl border border-[#d9ff4f]/15 bg-[#d9ff4f]/5 px-3 py-4 text-xs text-[#d9ff4f]/70">
                        No intelligence findings detected by the current heuristic model.
                    </div>
                )}

                {report.recommendations.length > 0 ? (
                    <div className="mt-4">
                        <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
                            Recommended moves
                        </div>
                        <div className="space-y-2">
                            {report.recommendations.slice(0, 6).map((item) => (
                                <div key={item.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="text-xs font-semibold text-white/75">{item.title}</div>
                                            <p className="mt-1 text-[11px] leading-4 text-white/35">{item.rationale}</p>
                                        </div>
                                        <span className={`rounded-full border px-2 py-1 text-[9px] uppercase tracking-[0.1em] ${PRIORITY_CLASS[item.priority]}`}>
                                            {item.priority}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                <div className="mt-3 text-[9px] text-white/20">
                    Heuristic preflight · not a security certification, benchmark, or capacity guarantee · generated {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(report.generatedAt)}
                </div>
            </div>
        </aside>
    );
}
