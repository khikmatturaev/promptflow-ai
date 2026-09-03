import type { ArchitectureAudit, ArchitectureAuditSeverity } from "../types";

interface ArchitectureAuditPanelProps {
    audit: ArchitectureAudit;
    onClose: () => void;
}

const SEVERITY_META: Record<
    ArchitectureAuditSeverity,
    { label: string; className: string }
> = {
    critical: {
        label: "Critical",
        className: "border-red-400/20 bg-red-400/5 text-red-300",
    },
    warning: {
        label: "Warning",
        className: "border-amber-300/20 bg-amber-300/5 text-amber-200",
    },
    info: {
        label: "Info",
        className: "border-white/10 bg-white/[0.03] text-white/55",
    },
};

export function ArchitectureAuditPanel({
    audit,
    onClose,
}: ArchitectureAuditPanelProps) {
    const criticalCount = audit.findings.filter((item) => item.severity === "critical").length;
    const warningCount = audit.findings.filter((item) => item.severity === "warning").length;
    const infoCount = audit.findings.filter((item) => item.severity === "info").length;
    const status =
        criticalCount > 0 ? "Needs attention" : warningCount > 0 ? "Review recommended" : "Structurally clear";

    return (
        <aside className="absolute bottom-3 left-3 z-30 w-[min(440px,calc(100%-1.5rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f14]/[98%] shadow-2xl backdrop-blur-xl sm:bottom-4 sm:left-4">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3.5">
                <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d9ff4f]/70">
                        Architecture Audit
                    </div>
                    <div className="mt-1 truncate text-xs text-white/45">
                        Deterministic structural preflight
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close architecture audit"
                    title="Close"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/45 transition hover:bg-white/5 hover:text-white"
                >
                    ×
                </button>
            </div>

            <div className="max-h-[min(470px,55vh)] overflow-y-auto p-4">
                <div className="flex items-center gap-4 rounded-xl border border-white/8 bg-white/[0.025] p-3">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[#d9ff4f]/20 bg-[#d9ff4f]/5 text-xl font-semibold text-[#d9ff4f]">
                        {audit.score}
                    </div>
                    <div className="min-w-0">
                        <div className="text-sm font-semibold text-white">{status}</div>
                        <p className="mt-1 text-xs leading-5 text-white/40">
                            Structural score only. Higher scores mean fewer issues covered by the current rule set.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-semibold uppercase tracking-[0.08em]">
                            {criticalCount > 0 ? <span className="rounded-full bg-red-400/10 px-2 py-1 text-red-300">{criticalCount} critical</span> : null}
                            {warningCount > 0 ? <span className="rounded-full bg-amber-300/10 px-2 py-1 text-amber-200">{warningCount} warning</span> : null}
                            {infoCount > 0 ? <span className="rounded-full bg-white/5 px-2 py-1 text-white/40">{infoCount} info</span> : null}
                            {audit.findings.length === 0 ? <span className="rounded-full bg-[#d9ff4f]/10 px-2 py-1 text-[#d9ff4f]/70">0 findings</span> : null}
                        </div>
                    </div>
                </div>

                {audit.findings.length > 0 ? (
                    <div className="mt-4 space-y-2">
                        {audit.findings.map((item) => {
                            const meta = SEVERITY_META[item.severity];
                            return (
                                <div
                                    key={item.id}
                                    className="rounded-xl border border-white/8 bg-white/[0.02] p-3"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="text-xs font-semibold text-white/80">
                                                {item.title}
                                            </div>
                                            <p className="mt-1 text-xs leading-5 text-white/40">
                                                {item.message}
                                            </p>
                                        </div>
                                        <span
                                            className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${meta.className}`}
                                        >
                                            {meta.label}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="mt-4 rounded-xl border border-[#d9ff4f]/15 bg-[#d9ff4f]/5 px-3 py-4 text-xs leading-5 text-[#d9ff4f]/75">
                        No structural issues detected by the current audit rules.
                    </div>
                )}

                <div className="mt-3 text-[9px] text-white/20">
                    Audited {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(audit.auditedAt)}
                </div>
            </div>
        </aside>
    );
}
