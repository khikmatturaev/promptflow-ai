import { useMemo, useState } from "react";
import { compareArchitectureVersions, planArchitectureMigration } from "../lib/architectureVersioning";
import { useCanvasStore } from "../store/useCanvasStore";

export function ArchitectureVersioningPanel({ onClose }: { onClose: () => void }) {
    const nodes = useCanvasStore((state) => state.nodes);
    const versions = useCanvasStore((state) => state.versioning.versions);
    const diff = useCanvasStore((state) => state.versioning.diff);
    const migrationPlan = useCanvasStore((state) => state.versioning.migrationPlan);
    const createVersion = useCanvasStore((state) => state.createVersion);
    const restoreVersion = useCanvasStore((state) => state.restoreVersion);
    const setVersionDiff = useCanvasStore((state) => state.setVersionDiff);
    const setMigrationPlan = useCanvasStore((state) => state.setMigrationPlan);
    const [message, setMessage] = useState("");
    const [name, setName] = useState("");

    const latestPair = useMemo(() => {
        if (versions.length < 2) return null;
        return { from: versions.at(-2)!, to: versions.at(-1)! };
    }, [versions]);

    const checkpoint = () => {
        const id = createVersion(message || undefined, name || undefined);
        if (id) {
            setMessage("");
            setName("");
        }
    };

    const compareLatest = () => {
        if (!latestPair) return;
        setVersionDiff(compareArchitectureVersions(latestPair.from, latestPair.to));
        setMigrationPlan(null);
    };

    const planLatest = () => {
        if (!latestPair) return;
        const nextDiff = compareArchitectureVersions(latestPair.from, latestPair.to);
        setVersionDiff(nextDiff);
        setMigrationPlan(planArchitectureMigration(nextDiff));
    };

    return (
        <aside className="absolute bottom-3 left-3 z-40 flex max-h-[calc(100%-5.5rem)] w-[min(460px,calc(100%-1.5rem))] flex-col overflow-hidden rounded-2xl border border-cyan-300/15 bg-[#0b0d11]/[98%] shadow-2xl backdrop-blur-xl sm:bottom-4 sm:left-4 sm:max-h-[min(720px,calc(100%-7rem))]">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-3.5">
                <div>
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                        Architecture Evolution
                    </div>
                    <div className="mt-1 text-xs text-white/40">Immutable checkpoints · diff · migration intelligence</div>
                </div>
                <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/45 hover:bg-white/5 hover:text-white">×</button>
            </div>

            <div className="overflow-y-auto p-4">
                <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
                    <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/30">Checkpoint current architecture</div>
                    <input value={name} onChange={(event) => setName(event.target.value)} placeholder={`Architecture v${versions.length + 1}`} className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-xs text-white outline-none placeholder:text-white/20 focus:border-cyan-300/30" />
                    <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Release note / reason for change" className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-xs text-white outline-none placeholder:text-white/20 focus:border-cyan-300/30" />
                    <button type="button" onClick={checkpoint} disabled={nodes.length === 0} className="mt-2 w-full rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-300/15 disabled:opacity-40">
                        Create checkpoint
                    </button>
                </div>

                <div className="mt-3 space-y-2">
                    {versions.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-white/30">No architecture checkpoints yet. Create v1 before making your next architectural change.</div>
                    ) : versions.map((version) => (
                        <div key={version.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-xs font-semibold text-white/75">v{version.version} · {version.name}</div>
                                <div className="text-[9px] text-white/25">{version.nodeCount}n · {version.connectionCount}e</div>
                            </div>
                            <div className="mt-1 text-[10px] text-white/35">{version.message}</div>
                            <div className="mt-2 font-mono text-[9px] text-cyan-200/40">{version.fingerprint}</div>
                            <button type="button" onClick={() => restoreVersion(version.id)} className="mt-2 rounded-md border border-white/10 px-2 py-1 text-[9px] uppercase tracking-[0.1em] text-white/45 hover:border-cyan-300/20 hover:text-cyan-100">Restore</button>
                        </div>
                    ))}
                </div>

                {latestPair ? (
                    <div className="mt-3 flex gap-2">
                        <button type="button" onClick={compareLatest} className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/55 hover:bg-white/5 hover:text-white">Diff latest</button>
                        <button type="button" onClick={planLatest} className="flex-1 rounded-lg border border-cyan-300/15 bg-cyan-300/5 px-2 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-cyan-100/70 hover:bg-cyan-300/10">Plan migration</button>
                    </div>
                ) : null}

                {diff ? (
                    <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
                        <div className="flex items-center justify-between">
                            <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/35">v{diff.fromVersion} → v{diff.toVersion}</div>
                            <div className="text-sm font-semibold text-cyan-200">{diff.riskScore}<span className="ml-1 text-[9px] text-white/25">risk</span></div>
                        </div>
                        <div className="mt-2 text-xs text-white/50">{diff.summary}</div>
                        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[9px]">
                            <div className="rounded-lg bg-red-400/5 p-2 text-red-200/70">{diff.breakingChanges} breaking</div>
                            <div className="rounded-lg bg-amber-300/5 p-2 text-amber-100/70">{diff.significantChanges} significant</div>
                            <div className="rounded-lg bg-emerald-300/5 p-2 text-emerald-100/70">{diff.nonBreakingChanges} safe</div>
                        </div>
                        <div className="mt-3 space-y-1.5">
                            {diff.changes.slice(0, 8).map((change) => (
                                <div key={change.id} className="text-[10px] text-white/45"><span className="text-white/65">{change.label}</span> — {change.details}</div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {migrationPlan ? (
                    <div className="mt-3 rounded-xl border border-cyan-300/10 bg-cyan-300/[0.025] p-3">
                        <div className="flex items-center justify-between">
                            <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-100/60">Migration plan</div>
                            <div className="text-[10px] uppercase text-cyan-100/60">{migrationPlan.risk} risk</div>
                        </div>
                        <div className="mt-2 text-xs text-white/50">{migrationPlan.summary}</div>
                        <div className="mt-3 space-y-2">
                            {migrationPlan.steps.map((item) => (
                                <div key={item.id} className="rounded-lg border border-white/7 p-2">
                                    <div className="text-[10px] font-semibold text-white/70">{item.order}. {item.title}</div>
                                    <div className="mt-1 text-[9px] leading-relaxed text-white/35">{item.description}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>
        </aside>
    );
}
