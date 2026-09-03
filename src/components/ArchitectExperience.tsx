import { useEffect, useRef, useState } from "react";
import { auditArchitecture } from "../lib/architectureAudit";
import {
    buildArchitecturePlan,
    buildScalePlanOperations,
    type ArchitecturePlan,
} from "../lib/architectureIntent";
import { buildFixOperations } from "../lib/architectureIntelligence";
import { useCanvasStore } from "../store/useCanvasStore";

interface ArchitectExperienceProps {
    onOpenAgent: () => void;
    onLoadShowcase: () => void;
    isLoadingShowcase: boolean;
}

type RunPhase =
    | "idle"
    | "understanding"
    | "architecting"
    | "auditing"
    | "fixing"
    | "scaling"
    | "verifying"
    | "coding"
    | "complete";

const PHASES: Array<{
    key: Exclude<RunPhase, "idle" | "complete">;
    label: string;
    detail: string;
}> = [
        { key: "understanding", label: "Understand", detail: "Extracting domain, scale, technologies and constraints" },
        { key: "architecting", label: "Architect", detail: "Compiling intent into a living system graph" },
        { key: "auditing", label: "Audit", detail: "Checking structure, reachability and data flow" },
        { key: "fixing", label: "Fix", detail: "Resolving concrete findings from the architecture review" },
        { key: "scaling", label: "Scale", detail: "Applying scale-aware production patterns" },
        { key: "verifying", label: "Verify", detail: "Re-running the architecture check after changes" },
        { key: "coding", label: "Build", detail: "Attaching a representative implementation starting point" },
    ];

function phaseIndex(phase: RunPhase): number {
    return PHASES.findIndex((item) => item.key === phase);
}

function representativeCode(plan: ArchitecturePlan): string {
    const api = plan.intent.technologies.includes("Fastify")
        ? "Fastify"
        : plan.intent.technologies.includes("Express")
            ? "Express"
            : plan.intent.technologies.includes("Python")
                ? "Python"
                : "Node.js";

    if (api === "Python") {
        return `from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os

class Handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        payload = {"status": "ok", "domain": "${plan.intent.domain}"}
        body = json.dumps(payload).encode("utf-8")
        self.send_response(200)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: object) -> None:
        return

server = ThreadingHTTPServer(("0.0.0.0", int(os.environ.get("PORT", "3000"))), Handler)
server.serve_forever()
`;
    }

    if (api === "Fastify") {
        return `import Fastify from "fastify";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ status: "ok" }));

app.get("/api", async () => ({
  domain: "${plan.intent.domain}",
}));

await app.listen({ port: 3000, host: "0.0.0.0" });`;
    }

    return `import { createServer } from "node:http";

const server = createServer((_request, response) => {
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify({
    status: "ok",
    domain: "${plan.intent.domain}",
  }));
});

server.listen(Number(process.env.PORT ?? 3000), "0.0.0.0");`;
}

export function ArchitectExperience({
    onOpenAgent,
    onLoadShowcase,
    isLoadingShowcase,
}: ArchitectExperienceProps) {
    const nodes = useCanvasStore((state) => state.nodes);
    const applyTransform = useCanvasStore((state) => state.applyTransform);
    const setAudit = useCanvasStore((state) => state.setAudit);
    const setNodeBoilerplate = useCanvasStore((state) => state.setNodeBoilerplate);
    const clearCanvas = useCanvasStore((state) => state.clearCanvas);
    const clearAudit = useCanvasStore((state) => state.clearAudit);

    const [prompt, setPrompt] = useState(
        "Build a production-ready e-commerce platform for 1 million users with payments, authentication and background jobs.",
    );
    const [phase, setPhase] = useState<RunPhase>("idle");
    const [completed, setCompleted] = useState(0);
    const [plan, setPlan] = useState<ArchitecturePlan | null>(null);
    const [score, setScore] = useState<number | null>(null);
    const [summary, setSummary] = useState("");
    const timers = useRef<number[]>([]);
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
            timers.current.forEach((timer) => window.clearTimeout(timer));
            timers.current = [];
        };
    }, []);

    const schedule = (callback: () => void, delay: number) => {
        const timer = window.setTimeout(() => {
            if (mounted.current) callback();
        }, delay);
        timers.current.push(timer);
    };

    const runArchitecture = () => {
        if (phase !== "idle") return;

        const nextPlan = buildArchitecturePlan(prompt);
        if (!nextPlan.operations.length) return;

        timers.current.forEach((timer) => window.clearTimeout(timer));
        timers.current = [];

        setPlan(nextPlan);
        setScore(null);
        setSummary("");
        setCompleted(0);
        clearCanvas();
        clearAudit();
        setPhase("understanding");

        schedule(() => {
            setCompleted(1);
            setPhase("architecting");
        }, 240);

        schedule(() => {
            applyTransform(nextPlan.operations);
            setCompleted(2);
            setPhase("auditing");
        }, 520);

        schedule(() => {
            const current = useCanvasStore.getState();
            const audit = auditArchitecture(current.nodes, current.edges);
            setAudit(audit);
            setScore(audit.score);
            setCompleted(3);
            setPhase("fixing");
        }, 920);

        schedule(() => {
            const current = useCanvasStore.getState();
            const currentAudit = current.audit ?? auditArchitecture(current.nodes, current.edges);
            const fixOperations = buildFixOperations(
                current.nodes,
                current.edges,
                currentAudit,
            );

            if (fixOperations.length > 0) {
                applyTransform(fixOperations);
            }

            setCompleted(4);
            setPhase("scaling");
        }, 1260);

        schedule(() => {
            const scaleOperations = buildScalePlanOperations(nextPlan);
            if (scaleOperations.length > 0) {
                applyTransform(scaleOperations);
            }
            setCompleted(5);
            setPhase("verifying");
        }, 1640);

        schedule(() => {
            const current = useCanvasStore.getState();
            const finalAudit = auditArchitecture(current.nodes, current.edges);
            setAudit(finalAudit);
            setScore(finalAudit.score);
            setCompleted(6);
            setPhase("coding");
        }, 2040);

        schedule(() => {
            const current = useCanvasStore.getState();
            setNodeBoilerplate(nextPlan.primaryCodeNodeId, representativeCode(nextPlan));
            setSummary(
                `${nextPlan.intent.domain} · ${current.nodes.length} components · ${current.edges.length} relationships`,
            );
            setCompleted(7);
            setPhase("complete");
        }, 2320);

        schedule(() => {
            setPhase("idle");
        }, 9500);
    };

    const handleExample = (value: string) => setPrompt(value);

    if (nodes.length > 0 && phase === "idle") return null;

    if (nodes.length > 0 && phase !== "idle") {
        const activeIndex = phaseIndex(phase);
        return (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center px-3 pt-16 sm:px-6 sm:pt-20">
                <div className="pointer-events-auto w-full max-w-4xl rounded-2xl border border-white/10 bg-[#0a0c10]/97 p-3 shadow-2xl backdrop-blur-xl sm:p-4">
                    <div className="flex items-center gap-3">
                        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#d9ff4f]/20 bg-[#d9ff4f]/5 text-[#d9ff4f]">
                            <span className="h-2 w-2 rounded-full bg-[#d9ff4f] shadow-[0_0_12px_rgba(217,255,79,0.8)]" />
                            {phase !== "complete" ? (
                                <span className="absolute inset-0 animate-ping rounded-xl border border-[#d9ff4f]/20" />
                            ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#d9ff4f]/70">
                                    {phase === "complete" ? "Architecture compiled" : PHASES[activeIndex]?.label}
                                </div>
                                <div className="text-[10px] text-white/30">
                                    {completed}/7
                                </div>
                            </div>
                            <div className="mt-1 truncate text-xs text-white/55">
                                {phase === "complete" ? summary : PHASES[activeIndex]?.detail}
                            </div>
                        </div>
                        {score !== null ? (
                            <div className="hidden shrink-0 text-right sm:block">
                                <div className="text-lg font-semibold tracking-tight text-[#d9ff4f]">
                                    {score}
                                </div>
                                <div className="text-[8px] uppercase tracking-[0.14em] text-white/30">
                                    health
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <div className="mt-3 grid grid-cols-7 gap-1">
                        {PHASES.map((item, index) => (
                            <div
                                key={item.key}
                                className={`h-1 rounded-full transition-all duration-300 ${index < completed
                                    ? "bg-[#d9ff4f]"
                                    : index === activeIndex
                                        ? "architect-progress-active bg-[#d9ff4f]/45"
                                        : "bg-white/8"
                                    }`}
                            />
                        ))}
                    </div>

                    {plan ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            <span className="rounded-full border border-white/8 bg-white/2.5 px-2 py-1 text-[9px] text-white/45">
                                {plan.intent.domain}
                            </span>
                            <span className="rounded-full border border-white/8 bg-white/2.5 px-2 py-1 text-[9px] text-white/45">
                                {plan.intent.scale.toLocaleString()} users
                            </span>
                            {plan.intent.technologies.slice(0, 4).map((technology) => (
                                <span
                                    key={technology}
                                    className="rounded-full border border-[#d9ff4f]/10 bg-[#d9ff4f]/[0.035] px-2 py-1 text-[9px] text-[#d9ff4f]/55"
                                >
                                    {technology}
                                </span>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
        );
    }

    return (
        <div className="architect-experience pointer-events-none absolute inset-0 z-[15] flex items-center justify-center px-4 pt-12 sm:px-6">
            <div className="pointer-events-auto w-full max-w-4xl">
                <div className="mb-4 text-center sm:mb-5">
                    <div className="mx-auto mb-3 flex w-fit items-center gap-2 rounded-full border border-[#d9ff4f]/15 bg-[#d9ff4f]/5 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#d9ff4f]/65">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#d9ff4f]" />
                        Architecture Compiler
                    </div>
                    <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
                        Give it an idea.{" "}
                        <span className="text-[#d9ff4f]">It builds the system.</span>
                    </h2>
                    <p className="mx-auto mt-2 max-w-3xl text-xs leading-5 text-white/40 sm:text-sm">
                        Describe any product, platform, or technical system in plain English.
                        PromptFlow extracts intent, compiles a living architecture, reviews it,
                        scales it, and attaches an implementation starting point.
                    </p>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d11]/97 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:rounded-3xl">
                    <div className="border-b border-white/8 px-3 py-2.5 sm:px-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/30">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#d9ff4f]" />
                                System brief
                            </div>
                            <span className="text-[12px] text-white/20">
                                Natural language → intent → architecture
                            </span>
                        </div>
                    </div>

                    <textarea
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        rows={3}
                        maxLength={1200}
                        aria-label="Architecture brief"
                        placeholder="e.g. Build a real-time marketplace for 5M users with payments, chat, search and background jobs…"
                        className="w-full resize-none bg-transparent px-2 md:px-4 py-2 text-xs! leading-6 text-white outline-none placeholder:text-white/20"
                    />

                    <div className="flex flex-col gap-3 border-t border-white/8 px-2 md:px-4 py-2">
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                [
                                    "Commerce · 1M",
                                    "Build a production-ready e-commerce platform for 1 million users with payments, authentication and background jobs.",
                                ],
                                [
                                    "AI SaaS",
                                    "Build a multi-tenant AI SaaS with RAG, OpenAI inference, authentication, billing and background jobs.",
                                ],
                                [
                                    "Realtime",
                                    "Build a real-time marketplace for 5 million users with payments, chat, search and location services.",
                                ],
                            ].map(([label, value]) => (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => handleExample(value)}
                                    className="rounded-full border border-white/8 bg-white/2 cursor-pointer px-2.5 py-1.5 text-xs! font-medium text-white/35 transition hover:border-[#d9ff4f]/20 hover:text-[#d9ff4f]"
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-[12px] leading-4 text-white/25">
                                Any brief gets a production-oriented baseline. Explicit requirements
                                specialize the graph automatically.
                            </div>
                            <button
                                type="button"
                                onClick={runArchitecture}
                                disabled={!prompt.trim()}
                                className="rounded-xl bg-[#d9ff4f] px-4 py-2 text-[13px]! cursor-pointer font-semibold text-[#08090c] shadow-[0_12px_35px_rgba(217,255,79,0.14)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Architect this →
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <button
                        type="button"
                        onClick={onOpenAgent}
                        className="rounded-xl border border-[#d9ff4f]/15 bg-[#d9ff4f]/5 cursor-pointer px-3.5 py-2.5 text-[10px]! font-semibold uppercase tracking-[0.08em] text-[#d9ff4f]/75 transition hover:bg-[#d9ff4f]/10"
                    >
                        Open WebMCP Agent OS
                    </button>
                    <button
                        type="button"
                        onClick={onLoadShowcase}
                        disabled={isLoadingShowcase}
                        className="rounded-xl border border-white/10 bg-white/2.5 px-3.5 cursor-pointer py-2.5 text-[10px]! font-semibold uppercase tracking-[0.08em] text-white/45 transition hover:border-white/20 hover:text-white/70 disabled:opacity-50"
                    >
                        {isLoadingShowcase ? "Loading…" : "Quick visual preset"}
                    </button>
                </div>

                <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[8px] uppercase tracking-[0.12em] text-white/20">
                    <span>Intent compiler</span>
                    <span>Architecture audit</span>
                    <span>Scale intelligence</span>
                    <span>Implementation starter</span>
                    <span>49 WebMCP tools · 37 Agent OS</span>
                </div>
            </div>
        </div>
    );
}
