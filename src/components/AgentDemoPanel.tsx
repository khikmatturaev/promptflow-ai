import { useEffect, useMemo, useState } from "react";
import { useCanvasStore } from "../store/useCanvasStore";
import type { AgentToolCall } from "../types";
import { runFinalDemo } from "../lib/finalDemo";

const DEMO_PROMPT =
    "Use PromptFlow's high-level Agent OS tools. Design a production-ready TikTok-like platform for 10 million users with video uploads, recommendations, realtime messaging, authentication, CDN/media storage, background processing, and analytics. Build it on the canvas, analyze it, stress-test the 10M-user target, run a digital twin failure scenario, harden the architecture, assess implementation readiness, generate the project code scaffold, validate the generated project, run its execution preflight, then run the real project execution loop with bounded self-healing, run the production QA release gate, then explain the final system.";

const DEMO_STEPS = [
    { label: "Discover" },
    { label: "Architect" },
    { label: "Analyze" },
    { label: "Recommend" },
    { label: "Stress" },
    { label: "Twin" },
    { label: "Apply" },
    { label: "DNA" },
    { label: "Build" },
    { label: "Execute" },
    { label: "Explain" },
    { label: "QA" },
] as const;

const AGENT_OS_TOOLS = new Set([
    "architect_system",
    "analyze_architecture",
    "recommend_architecture",
    "simulate_architecture_scale",
    "apply_architecture_recommendations",
    "explain_architecture",
    "generate_implementation_plan",
    "assess_architecture_intelligence",
    "stress_test_architecture",
    "get_architecture_dna",
    "apply_intelligence_recommendations",
    "run_digital_twin",
    "simulate_failure",
    "simulate_load",
    "apply_digital_twin_hardening",
    "assess_implementation_readiness",
    "generate_project_blueprint",
    "generate_implementation_contracts",
    "generate_project_code",
    "validate_generated_project",
    "run_project_execution_preflight",
    "review_generated_project",
    "prepare_build_workspace",
    "export_project_artifacts",
    "run_final_hackathon_demo",
    "run_project_execution_loop",
    "diagnose_execution_failure",
    "create_architecture_version",
    "list_architecture_versions",
    "compare_architecture_versions",
    "plan_architecture_migration",
    "restore_architecture_version",
    "clear_version_analysis",
    "run_production_qa",
    "run_judge_mode",
]);

function formatTime(timestamp: number): string {
    return new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).format(timestamp);
}

function formatDuration(startedAt: number, finishedAt?: number): string {
    const elapsed = Math.max(0, (finishedAt ?? Date.now()) - startedAt);
    if (elapsed < 1000) return "<1s";
    return `${(elapsed / 1000).toFixed(1)}s`;
}

function StatusDot({ status }: { status: AgentToolCall["status"] }) {
    const className =
        status === "running"
            ? "bg-[#d9ff4f] shadow-[0_0_10px_rgba(217,255,79,0.7)]"
            : status === "completed"
                ? "bg-emerald-400"
                : "bg-red-400";

    return <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${className}`} />;
}

interface AgentDemoPanelProps {
    onClose: () => void;
    onNewRun: () => void;
}

export function AgentDemoPanel({ onClose, onNewRun }: AgentDemoPanelProps) {
    const toolCalls = useCanvasStore((state) => state.agentToolCalls);
    const [toolCount, setToolCount] = useState(0);
    const [agentOSCount, setAgentOSCount] = useState(0);
    const [copied, setCopied] = useState(false);
    const finalDemo = useCanvasStore((state) => state.finalDemo);
    const setFinalDemo = useCanvasStore((state) => state.setFinalDemo);

    useEffect(() => {
        let active = true;
        let retryTimer: number | undefined;
        let observedModelContext: ModelContext | null = null;

        const handleToolChange = () => {
            void refreshToolCount();
        };

        const refreshToolCount = async () => {
            const modelContext = document.modelContext;
            if (!modelContext?.getTools) {
                if (active) {
                    setToolCount(0);
                    setAgentOSCount(0);
                    retryTimer = window.setTimeout(() => {
                        void refreshToolCount();
                    }, 750);
                }
                return;
            }

            const supportsToolChange =
                typeof modelContext.addEventListener === "function"
                && typeof modelContext.removeEventListener === "function";

            if (observedModelContext !== modelContext) {
                if (observedModelContext && typeof observedModelContext.removeEventListener === "function") {
                    observedModelContext.removeEventListener("toolchange", handleToolChange);
                }
                if (supportsToolChange) {
                    modelContext.addEventListener("toolchange", handleToolChange);
                }
                observedModelContext = modelContext;
            }

            try {
                const tools = await modelContext.getTools();
                if (active) {
                    setToolCount(tools.length);
                    setAgentOSCount(tools.filter((tool) => AGENT_OS_TOOLS.has(tool.name)).length);
                }
            } catch {
                if (active) {
                    setToolCount(0);
                    setAgentOSCount(0);
                }
            } finally {
                if (active && !supportsToolChange) {
                    retryTimer = window.setTimeout(() => void refreshToolCount(), 750);
                }
            }
        };

        void refreshToolCount();

        return () => {
            active = false;
            if (retryTimer !== undefined) {
                window.clearTimeout(retryTimer);
            }
            if (observedModelContext && typeof observedModelContext.removeEventListener === "function") {
                observedModelContext.removeEventListener("toolchange", handleToolChange);
            }
        };
    }, []);

    const completedCalls = useMemo(
        () => toolCalls.filter((call) => call.status === "completed"),
        [toolCalls],
    );

    const hasArchitect = completedCalls.some((call) => call.toolName === "architect_system");
    const hasAnalyze = completedCalls.some((call) => call.toolName === "analyze_architecture");
    const hasRecommend = completedCalls.some((call) => call.toolName === "recommend_architecture");
    const hasStress = completedCalls.some((call) => call.toolName === "stress_test_architecture");
    const hasTwin = completedCalls.some((call) =>
        call.toolName === "run_digital_twin" || call.toolName === "simulate_failure" || call.toolName === "simulate_load",
    );
    const hasApply = completedCalls.some((call) =>
        call.toolName === "apply_architecture_recommendations" || call.toolName === "apply_intelligence_recommendations",
    );
    const hasDNA = completedCalls.some((call) => call.toolName === "get_architecture_dna");
    const hasBuild = completedCalls.some(
        (call) => call.toolName === "assess_implementation_readiness" || call.toolName === "generate_project_blueprint",
    );
    const hasExecute = completedCalls.some((call) => call.toolName === "run_project_execution_loop");
    const hasExplain = completedCalls.some(
        (call) => call.toolName === "explain_architecture" || call.toolName === "generate_implementation_plan",
    );
    const hasQA = completedCalls.some((call) => call.toolName === "run_production_qa");

    const stepComplete = [
        agentOSCount === AGENT_OS_TOOLS.size,
        hasArchitect,
        hasAnalyze,
        hasRecommend,
        hasStress,
        hasTwin,
        hasApply,
        hasDNA,
        hasBuild,
        hasExecute,
        hasExplain,
        hasQA,
    ];
    const completedSteps = stepComplete.filter(Boolean).length;
    const runningCalls = toolCalls.filter((call) => call.status === "running").length;
    const failedCalls = toolCalls.filter((call) => call.status === "failed").length;
    const runComplete = completedSteps === DEMO_STEPS.length && failedCalls === 0;

    const copyPrompt = async () => {
        try {
            await navigator.clipboard.writeText(DEMO_PROMPT);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch {
            setCopied(false);
        }
    };

    return (
        <aside className="absolute bottom-3 right-3 z-40 flex max-h-[calc(100%-5.5rem)] w-[min(500px,calc(100%-1.5rem))] flex-col overflow-hidden rounded-2xl border border-[#d9ff4f]/15 bg-[#0b0d11]/[98%] shadow-2xl backdrop-blur-xl sm:bottom-4 sm:right-4 sm:max-h-[min(700px,calc(100%-7rem))]">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-3.5">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 rounded-full ${toolCount > 0 ? "bg-[#d9ff4f] shadow-[0_0_9px_rgba(217,255,79,0.7)]" : "bg-amber-300"}`} />
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d9ff4f]/80">
                            WebMCP Agent OS
                        </div>
                    </div>
                    <div className="mt-1 text-xs text-white/40">
                        Arbitrary brief → semantic agent plan → validated live system
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close agent demo"
                    title="Close"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/45 transition hover:bg-white/5 hover:text-white"
                >
                    ×
                </button>
            </div>

            <div className="overflow-y-auto p-3.5 sm:p-4">
                <div className={`rounded-xl border p-3 ${toolCount > 0 ? "border-[#d9ff4f]/15 bg-[#d9ff4f]/[0.025]" : "border-amber-300/15 bg-amber-300/[0.025]"}`}>
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                                WebMCP status
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-sm font-medium text-white/80">
                                {agentOSCount === AGENT_OS_TOOLS.size ? "Agent OS ready" : toolCount > 0 ? "Loading Agent OS" : "Waiting for WebMCP"}
                            </div>
                        </div>
                        <div className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-white/45">
                            {toolCount} tools · {agentOSCount}/35 OS
                        </div>
                    </div>
                </div>

                <section className="mt-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                            Demo prompt
                        </div>
                        <button
                            type="button"
                            onClick={() => void copyPrompt()}
                            className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[10px] font-medium text-white/55 transition hover:border-[#d9ff4f]/20 hover:text-[#d9ff4f]"
                        >
                            {copied ? "Copied" : "Copy prompt"}
                        </button>
                    </div>

                    <div className="mt-2 rounded-xl border border-[#d9ff4f]/10 bg-[#d9ff4f]/[0.025] p-3 text-xs leading-5 text-white/65">
                        {DEMO_PROMPT}
                    </div>
                    <p className="mt-2 text-[10px] leading-4 text-white/30">
                        Open this page in ChatGPT&apos;s built-in browser, allow site access, then paste the prompt. The agent can plan arbitrary components semantically and apply the complete system through one high-level WebMCP call.
                    </p>\n                    <button type="button" onClick={() => { const current = useCanvasStore.getState(); setFinalDemo(runFinalDemo(current.nodes, current.edges, 10_000_000)); }} disabled={useCanvasStore.getState().nodes.length === 0} className="mt-3 w-full rounded-xl border border-[#d9ff4f]/20 bg-[#d9ff4f]/[0.06] px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d9ff4f]/80 transition hover:bg-[#d9ff4f]/10 disabled:cursor-not-allowed disabled:opacity-30">Run final local demo</button>
                    {finalDemo ? (
                        <div className="mt-2 rounded-xl border border-white/8 bg-white/[0.02] p-3">
                            <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.12em]"><span className="text-white/30">Demo orchestration</span><span className={finalDemo.status === "completed" ? "text-[#d9ff4f]" : "text-red-300"}>{finalDemo.status}</span></div>
                            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                                {finalDemo.stages.map((stage) => <div key={stage.id} className="rounded-lg border border-white/6 bg-black/20 px-2 py-1.5 text-[8px] text-white/40"><span className="text-[#d9ff4f]/55">✓</span> {stage.title}</div>)}
                            </div>
                        </div>
                    ) : null}
                </section>

                <section className="mt-4">
                    <div className="mb-2 flex items-center justify-between">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                            Agent pipeline
                        </div>
                        <div className={`text-[10px] ${runComplete ? "text-[#d9ff4f]/75" : "text-white/30"}`}>
                            {completedSteps}/{DEMO_STEPS.length} observed
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
                        {DEMO_STEPS.map((step, index) => (
                            <div
                                key={step.label}
                                className={`rounded-lg border px-2 py-2 text-center ${stepComplete[index]
                                    ? "border-[#d9ff4f]/20 bg-[#d9ff4f]/5 text-[#d9ff4f]/80"
                                    : "border-white/8 bg-white/[0.02] text-white/30"
                                    }`}
                            >
                                <div className="text-[9px] font-semibold uppercase tracking-[0.08em]">
                                    {index + 1}
                                </div>
                                <div className="mt-1 text-[9px] font-medium">
                                    {step.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mt-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                            Live agent activity
                        </div>
                        <button
                            type="button"
                            onClick={onNewRun}
                            className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-medium text-white/40 transition hover:border-white/20 hover:text-white/70"
                        >
                            New run
                        </button>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-white/30">
                        <span>{toolCalls.length} calls</span>
                        {runningCalls > 0 ? <span className="text-[#d9ff4f]/70">{runningCalls} running</span> : null}
                        {failedCalls > 0 ? <span className="text-red-300/70">{failedCalls} failed</span> : null}
                    </div>

                    <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-white/8 bg-[#07080b]">
                        {toolCalls.length > 0 ? (
                            <div className="divide-y divide-white/6">
                                {[...toolCalls].reverse().map((call) => (
                                    <div key={call.id} className="px-3 py-2.5">
                                        <div className="flex items-start gap-2">
                                            <StatusDot status={call.status} />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <code className="truncate text-[10px] font-medium text-[#d9ff4f]/80">
                                                        {call.toolName}
                                                    </code>
                                                    <span className="shrink-0 text-[9px] text-white/25">
                                                        {formatDuration(call.startedAt, call.finishedAt)}
                                                    </span>
                                                </div>
                                                <div className="mt-1 truncate text-[10px] text-white/35">
                                                    {call.inputSummary}
                                                </div>
                                                {call.resultSummary ? (
                                                    <div
                                                        className={`mt-1 text-[10px] ${call.status === "failed"
                                                            ? "text-red-300/70"
                                                            : "text-white/45"
                                                            }`}
                                                    >
                                                        {call.resultSummary}
                                                    </div>
                                                ) : null}
                                                <div className="mt-1 text-[9px] text-white/20">
                                                    {formatTime(call.finishedAt ?? call.startedAt)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="px-3 py-6 text-center text-[10px] leading-5 text-white/25">
                                Waiting for ChatGPT to call a PromptFlow WebMCP tool.
                            </div>
                        )}
                    </div>
                </section>

                <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 text-[10px] leading-4 text-white/30">
                    Activity is generated by actual WebMCP executions. Agent OS calls are real, validated browser-side operations — not simulated UI events.
                </div>
            </div>
        </aside>
    );
}
