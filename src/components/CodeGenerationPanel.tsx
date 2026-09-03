import { useMemo, useState } from "react";
import { summarizeGeneratedProject } from "../lib/codeGeneration";
import { createProjectWorkspace, exportProjectWorkspace } from "../lib/projectWorkspace";
import type { ArchitectureNode } from "../types";
import type { ProjectGenerationResult } from "../types/codeGeneration";
import { reviewGeneratedProject } from "../lib/codeIntelligence";
import { useCanvasStore } from "../store/useCanvasStore";
import { executeProject, getExecutionCapability } from "../lib/executionEngine";
import { XIcon } from "lucide-react";

interface CodeGenerationPanelProps {
    project: ProjectGenerationResult;
    nodes: ArchitectureNode[];
    onClose: () => void;
}

function statusClass(status: "pass" | "warning" | "blocked"): string {
    if (status === "pass") return "text-[#d9ff4f]";
    if (status === "warning") return "text-amber-200";
    return "text-red-300";
}

export function CodeGenerationPanel({ project, nodes, onClose }: CodeGenerationPanelProps) {
    const [showAll, setShowAll] = useState(false);
    const summary = useMemo(() => summarizeGeneratedProject(project, nodes), [project, nodes]);
    // const artifacts = showAll ? project.artifacts : project.artifacts.slice(0, 12);
    const workspace = useMemo(() => createProjectWorkspace(project), [project]);
    const [selectedPath, setSelectedPath] = useState(project.artifacts[0]?.path ?? "");
    const selectedFile = workspace.files.find((file) => file.path === selectedPath) ?? workspace.files[0];
    const [exported, setExported] = useState(false);
    const codeReview = useCanvasStore((state) => state.codeReview);
    const setCodeReview = useCanvasStore((state) => state.setCodeReview);
    const execution = useCanvasStore((state) => state.execution);
    const setExecution = useCanvasStore((state) => state.setExecution);
    const setCodeGeneration = useCanvasStore((state) => state.setCodeGeneration);
    const [executing, setExecuting] = useState(false);

    const handleExport = () => {
        exportProjectWorkspace(project);
        setExported(true);
        window.setTimeout(() => setExported(false), 1800);
    };


    const handleExecute = async () => {
        if (executing) return;
        setExecuting(true);
        try {
            const result = await executeProject(project, {
                maxHealingAttempts: 2,
                enableSelfHealing: true,
            });
            if (result.artifacts !== project.artifacts) {
                setCodeGeneration({
                    ...project,
                    generatedAt: Date.now(),
                    artifacts: result.artifacts,
                });
            }
            setExecution(result);
        } finally {
            setExecuting(false);
        }
    };

    const capability = getExecutionCapability();

    return (
        <aside className="pf-modal absolute bottom-0 left-3 z-30 w-[min(580px,calc(100%-1.5rem))] overflow-hidden rounded-lg border border-[#d9ff4f]/15 bg-[#0d0f14]/98 backdrop-blur-lg sm:bottom-2 sm:left-4">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 p-2">
                <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d9ff4f]/75">
                        Project Generation
                    </div>
                    <div className="truncate text-[11px] text-white/40">
                        Architecture → source artifacts → execution preflight
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setCodeReview(reviewGeneratedProject(project))} title="Review generated source for production risks" className="cursor-pointer rounded-lg border border-violet-300/15 bg-violet-300/5 px-2 py-1 text-[9px]! font-semibold uppercase tracking-widest text-violet-200/70 transition hover:bg-violet-300/10">{codeReview ? `Code ${codeReview.score}` : "Review code"}</button>
                    <button type="button" onClick={() => void handleExecute()} disabled={executing || !capability.supported} title={capability.reason} className="cursor-pointer rounded-lg border border-emerald-300/15 bg-emerald-300/5 px-2 py-1 text-[9px]! font-semibold uppercase tracking-widest text-emerald-200/75 transition hover:bg-emerald-300/10 disabled:cursor-not-allowed disabled:opacity-40">{executing ? "Executing…" : execution?.status === "passed" ? "Build passed" : "Execute"}</button>
                    <button type="button" onClick={handleExport} title="Export the generated project as a ZIP workspace" className="cursor-pointer rounded-lg border border-[#d9ff4f]/15 bg-[#d9ff4f]/5 px-2 py-1 text-[9px]! font-semibold uppercase tracking-widest text-[#d9ff4f]/70 transition hover:bg-[#d9ff4f]/10">{exported ? "Exported" : "Export ZIP"}</button>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close project generation"
                        title="Close"
                        className="flex w-7 shrink-0 items-center justify-center rounded-md border border-white/10 text-white/45 transition hover:bg-white/5 hover:text-white cursor-pointer"
                    >
                        <XIcon size={14} />
                    </button>
                </div>
            </div>

            {execution ? (
                <div className="border-b border-white/8 px-2 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-200/70">Real execution loop</div>
                            <div className="text-[9px] text-white/35">
                                {execution.status === "passed"
                                    ? `Sandbox verified · ${execution.steps.filter((item) => item.status === "passed").length} steps passed`
                                    : execution.status === "failed"
                                        ? execution.diagnostics[0]?.title ?? "Execution failed"
                                        : execution.note ?? "Execution unavailable"}
                            </div>
                        </div>
                        <div className={`text-xs font-semibold ${execution.status === "passed" ? "text-emerald-300" : execution.status === "failed" ? "text-red-300" : "text-amber-200"}`}>
                            {execution.status.toUpperCase()}
                        </div>
                    </div>
                    {execution.healingAttempts.length > 0 ? (
                        <div className="mt-1 text-[9px] text-[#d9ff4f]/60">
                            Self-healed {execution.healingAttempts.length} time{execution.healingAttempts.length === 1 ? "" : "s"} before verification.
                        </div>
                    ) : null}
                    {execution.status === "failed" ? (
                        <div className="mt-2 rounded-lg border border-red-300/15 bg-red-300/[.035] p-2">
                            <div className="text-[9px] font-semibold uppercase tracking-[.14em] text-red-200/75">Failure evidence</div>
                            {execution.diagnostics[0] ? (
                                <>
                                    <div className="mt-1 text-[10px] font-semibold text-red-100/80">
                                        {execution.diagnostics[0].title} · {execution.diagnostics[0].code}
                                    </div>
                                    <div className="mt-1 text-[9px] leading-4 text-white/35">{execution.diagnostics[0].explanation}</div>
                                </>
                            ) : null}
                            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-white/6 bg-black/20 p-2 font-mono text-[8px] leading-4 text-red-100/65">
                                {execution.output || execution.steps.find((item) => item.status === "failed")?.output || "No process output was captured."}
                            </pre>
                        </div>
                    ) : null}
                    {execution.previewUrl ? (
                        <a href={execution.previewUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex rounded-full border border-[#d9ff4f]/15 bg-[#d9ff4f]/5 px-2 py-1 text-[8px] font-semibold uppercase tracking-widest text-[#d9ff4f]/70 transition hover:bg-[#d9ff4f]/10">
                            Open sandbox preview
                        </a>
                    ) : null}
                    <div className="mt-2 space-y-1.5">
                        {execution.steps.map((item) => (
                            <details key={item.id} open={item.status === "failed"} className={`rounded-lg border p-2 ${item.status === "passed" ? "border-emerald-300/8 bg-emerald-300/[.018]" : "border-red-300/15 bg-red-300/2.5"}`}>
                                <summary className="cursor-pointer list-none text-[8px] font-semibold uppercase tracking-[.08em] text-white/45">
                                    <span className={item.status === "passed" ? "text-emerald-200/70" : "text-red-200/80"}>{item.status}</span>
                                    {" · "}{item.phase}
                                    {item.command ? ` · ${item.command}` : ""}
                                    {typeof item.exitCode === "number" ? ` · exit ${item.exitCode}` : ""}
                                    {" · "}{item.durationMs}ms
                                </summary>
                                <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap border-t border-white/6 pt-2 font-mono text-[8px] leading-4 text-white/40">
                                    {item.output || "(no stdout/stderr captured)"}
                                </pre>
                            </details>
                        ))}
                    </div>
                </div>
            ) : null}

            <div className="max-h-[min(700px,74vh)] overflow-y-auto p-2">
                <div className="grid grid-cols-[auto_1fr] gap-2 rounded-xl border border-white/8 bg-white/2.5] p-2">
                    <div className={`flex h-16 w-16 flex-col items-center justify-center rounded-lg border ${project.execution.buildReady ? "border-[#d9ff4f]/20 bg-[#d9ff4f]/5" : "border-red-300/15 bg-red-300/5"}`}>
                        <span className={`text-sm font-semibold ${project.execution.buildReady ? "text-[#d9ff4f]" : "text-red-300"}`}>
                            {project.execution.buildReady ? "READY" : "BLOCKED"}
                        </span>
                        <span className="text-[8px] uppercase tracking-[0.14em] text-white/35">build</span>
                    </div>
                    <div className="min-w-0">
                        <div className="text-sm font-semibold text-white">{project.projectName}</div>
                        <div className="text-[10px] text-white/35">{project.framework} · {project.runtime}</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                            <span className="rounded-full bg-white/5 px-2 py-1 text-[9px] text-white/45">{summary.totalFiles} files</span>
                            <span className="rounded-full bg-white/5 px-2 py-1 text-[9px] text-white/45">{summary.totalLines} lines</span>
                            <span className="rounded-full bg-white/5 px-2 py-1 text-[9px] text-white/45">{project.contractsCovered} contracts</span>
                            <span className="rounded-lg bg-[#d9ff4f]/5 px-2 py-1 text-[9px] text-[#d9ff4f]/60">{project.architectureFingerprint}</span>
                        </div>
                    </div>
                </div>

                <section className="mt-4">
                    <div className="mb-2 flex items-center justify-between">
                        <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">Execution preflight</div>
                        <span className={`text-[8px] font-semibold uppercase ${project.execution.runReady ? "text-[#d9ff4f]" : "text-amber-200"}`}>{project.execution.runReady ? "run ready" : "review required"}</span>
                    </div>
                    <div className="space-y-1.5">
                        {project.execution.checks.map((check) => (
                            <div key={check.id} className="flex items-start gap-2 rounded-lg border border-white/6 bg-white/2 p-2">
                                <span className={`text-[9px] font-bold uppercase ${statusClass(check.status)}`}>{check.status}</span>
                                <div className="min-w-0">
                                    <div className="text-[10px] font-semibold text-white/65">{check.title}</div>
                                    <div className="text-[9px] leading-4 text-white/30">{check.message}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mt-4">
                    <div className="flex items-center justify-between">
                        <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">Real build workspace</div>
                        <button type="button" onClick={() => setShowAll((value) => !value)} className="text-[10px]! cursor-pointer text-[#d9ff4f]/60 hover:text-[#d9ff4f]">{showAll ? "Compact" : `All ${project.artifacts.length} files`}</button>
                    </div>
                    <div className="grid grid-cols-[minmax(145px,0.34fr)_minmax(0,0.66fr)] overflow-hidden rounded-lg border border-white/8 bg-[#07080b]">
                        <div className="max-h-64 overflow-y-auto border-r border-white/8 p-1">
                            {(showAll ? workspace.files : workspace.files.slice(0, 12)).map((file) => (
                                <button type="button" key={file.path} onClick={() => setSelectedPath(file.path)} className={`block w-full truncate rounded-lg px-2 py-1 text-left font-mono text-[11px]! transition ${selectedFile?.path === file.path ? "bg-[#d9ff4f]/8 text-[#d9ff4f]/80" : "text-white/35 hover:bg-white/5 hover:text-white/60"}`}>
                                    {file.path}
                                </button>
                            ))}
                        </div>
                        <div className="min-w-0">
                            <div className="border-b border-white/8 p-2 font-mono text-[9px] text-white/30">{selectedFile?.path ?? "No file"}</div>
                            <pre className="max-h-64 overflow-auto p-2 font-mono text-[9px] leading-4 text-white/55">{selectedFile?.content ?? "No generated artifact."}</pre>
                        </div>
                    </div>
                </section>

                <section className="mt-4">
                    <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30 mb-1">Runbook</div>
                    <div className="rounded-lg border border-white/8 bg-[#07080b] p-2 font-mono text-[10px] leading-4 text-white/40">
                        {project.execution.commands.map((command) => <div key={command}>$ {command}</div>)}
                    </div>
                </section>

                <div className="mt-2 border-t border-white/6 pt-2 text-[9px] text-white/20">
                    Browser-safe code generation · static execution preflight · generated scaffolds require engineering review before production use.
                </div>
            </div>
        </aside>
    );
}
