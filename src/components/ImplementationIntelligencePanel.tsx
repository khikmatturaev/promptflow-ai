import { XIcon } from "lucide-react";
import type { ArchitectureImplementationBlueprint } from "../types/implementation";

interface ImplementationIntelligencePanelProps {
    blueprint: ArchitectureImplementationBlueprint;
    onClose: () => void;
}

function scoreClass(score: number): string {
    if (score >= 85) return "text-[#d9ff4f]";
    if (score >= 70) return "text-amber-200";
    return "text-red-300";
}

export function ImplementationIntelligencePanel({
    blueprint,
    onClose,
}: ImplementationIntelligencePanelProps) {
    const highRisks = blueprint.risks.filter((risk) => risk.severity === "high").length;

    return (
        <aside className="pf-modal absolute bottom-3 right-3 z-30 w-[min(500px,calc(100%-1.5rem))] overflow-hidden rounded-lg border border-[#d9ff4f]/15 bg-[#0d0f14]/98 backdrop-blur-xl sm:bottom-4 sm:right-4">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 p-2">
                <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d9ff4f]/75">
                        Implementation Intelligence
                    </div>
                    <div className="truncate text-xs text-white/40">
                        Architecture → contracts → project map → delivery plan
                    </div>
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
            <div className="max-h-[min(680px,72vh)] overflow-y-auto p-2">
                <div className="grid grid-cols-[auto_1fr] gap-4 rounded-lg border border-white/8 bg-white/2.5 p-2">
                    <div className="flex h-14 w-16 flex-col items-center justify-center rounded-lg border border-[#d9ff4f]/20 bg-[#d9ff4f]/5">
                        <span className={`text-xl font-semibold ${scoreClass(blueprint.readinessScore)}`}>
                            {blueprint.readinessScore}
                        </span>
                        <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-white/35">
                            readiness
                        </span>
                    </div>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold capitalize text-white">
                                {blueprint.maturity.replaceAll("-", " ")}
                            </span>
                            <span className="rounded-full border border-white/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/40">
                                {blueprint.codeReadyCount}/{blueprint.components.length} code-ready
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {blueprint.stack.slice(0, 7).map((item) => (
                                <span key={item} className="rounded-full bg-white/5 px-2 py-1 text-[9px] text-white/45">{item}</span>
                            ))}
                        </div>
                        <div className="mt-2 text-[10px] text-white/30">
                            {blueprint.totalSuggestedFiles} suggested files · {blueprint.contracts.length} contracts · {highRisks} high risks
                        </div>
                    </div>
                </div>

                <section className="mt-4">
                    <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
                        Delivery phases
                    </div>
                    <div className="space-y-1.5">
                        {blueprint.phases.map((phase) => (
                            <div key={phase.order} className="rounded-lg border border-white/8 bg-white/2 p-2">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#d9ff4f]/10 text-[9px] font-semibold text-[#d9ff4f]/70">
                                        {phase.order}
                                    </span>
                                    <div className="text-xs font-semibold text-white/75">{phase.title}</div>
                                </div>
                                <p className="mt-1 text-[10px] leading-4 text-white/35">{phase.goal}</p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {phase.deliverables.slice(0, 4).map((item) => (
                                        <span key={item} className="rounded-md bg-white/5 px-1 py-1 text-[9px] text-white/35">{item}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mt-2">
                    <div className="mb-1 flex items-center justify-between">
                        <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">First files</div>
                        <div className="text-[9px] text-white/20">{blueprint.recommendedFirstFiles.length} prioritized</div>
                    </div>
                    <div className="rounded-lg border border-white/8 bg-[#07080b] p-2 font-mono text-[10px] leading-4 text-[#d9ff4f]/55">
                        {blueprint.recommendedFirstFiles.slice(0, 10).map((file) => (
                            <div key={file}>+ {file}</div>
                        ))}
                    </div>
                </section>

                <section className="mt-2 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-white/8 bg-white/2 p-2">
                        <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">Environment</div>
                        <div className="mt-2 space-y-1">
                            {blueprint.environment.slice(0, 7).map((item) => (
                                <div key={item.name} className="flex items-center justify-between gap-2 text-[10px]">
                                    <code className="text-[#d9ff4f]/60">{item.name}</code>
                                    <span className="text-white/25">{item.secret ? "secret" : item.required ? "required" : "optional"}</span>
                                </div>
                            ))}
                            {blueprint.environment.length === 0 ? <span className="text-[10px] text-white/25">No explicit environment requirements.</span> : null}
                        </div>
                    </div>
                    <div className="rounded-lg border border-white/8 bg-white/2 p-2">
                        <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">Test strategy</div>
                        <div className="mt-2 space-y-1 text-[10px] text-white/35">
                            <div>Unit · {blueprint.tests.unit.length}</div>
                            <div>Integration · {blueprint.tests.integration.length}</div>
                            <div>Contract · {blueprint.tests.contract.length}</div>
                            <div>Resilience · {blueprint.tests.resilience.length}</div>
                        </div>
                    </div>
                </section>

                {blueprint.risks.length > 0 ? (
                    <section className="mt-2 space-y-1.5">
                        <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">Implementation risks</div>
                        {blueprint.risks.slice(0, 6).map((risk) => (
                            <div key={risk.id} className="rounded-lg border border-white/8 bg-white/2 p-2">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-semibold text-white/70">{risk.title}</div>
                                        <p className="mt-1 text-[10px] leading-4 text-white/35">{risk.message}</p>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] uppercase ${risk.severity === "high" ? "bg-red-400/10 text-red-300" : risk.severity === "medium" ? "bg-amber-300/10 text-amber-200" : "bg-white/5 text-white/35"}`}>
                                        {risk.severity}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </section>
                ) : null}

                <div className="mt-2 border-t border-white/6 pt-2 text-[9px] text-white/20">
                    Deterministic implementation-planning model · contracts and file paths are recommendations, not generated production source code.
                </div>
            </div>
        </aside>
    );
}
