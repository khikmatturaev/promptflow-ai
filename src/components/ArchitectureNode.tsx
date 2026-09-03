import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ArchitectureNode, ArchitectureNodeType } from "../types";

const NODE_META: Record<ArchitectureNodeType, { icon: string; label: string }> = {
    frontend: { icon: "◈", label: "Frontend" },
    backend: { icon: "◆", label: "Backend" },
    api: { icon: "↔", label: "API" },
    database: { icon: "▤", label: "Database" },
    cache: { icon: "◫", label: "Cache" },
    queue: { icon: "≋", label: "Queue" },
    payment: { icon: "$", label: "Payment" },
    auth: { icon: "◇", label: "Auth" },
    service: { icon: "✦", label: "Service" },
    external: { icon: "↗", label: "External" },
    gateway: { icon: "⇄", label: "Gateway" },
    worker: { icon: "✣", label: "Worker" },
    cdn: { icon: "⌁", label: "CDN / Edge" },
    observability: { icon: "◎", label: "Observability" },
};

export function ArchitectureNode({ data, selected }: NodeProps<ArchitectureNode>) {
    const meta = NODE_META[data.type];

    return (
        <div
            className={`architecture-node group relative min-w-[230px] max-w-[280px] overflow-hidden rounded-2xl border bg-[#101116] text-left shadow-2xl transition-all duration-200 ${selected
                ? "border-[#d9ff4f] shadow-[0_0_0_1px_rgba(217,255,79,0.35),0_18px_50px_rgba(0,0,0,0.35)]"
                : "border-white/10 hover:border-white/20"
                }`}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="!h-2.5 !w-2.5 !border-2 !border-[#101116] !bg-[#d9ff4f]"
            />

            <div className="border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#d9ff4f]/10 text-sm font-semibold text-[#d9ff4f]">
                        {meta.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold tracking-[-0.01em] text-white">
                            {data.label}
                        </div>
                        <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/40">
                            {meta.label}
                        </div>
                    </div>
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#d9ff4f] shadow-[0_0_10px_rgba(217,255,79,0.6)]" />
                </div>
            </div>

            <div className="px-4 py-3.5">
                <p className="line-clamp-2 text-xs leading-5 text-white/55">
                    {data.description}
                </p>

                {data.boilerplate ? (
                    <div className="mt-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.12em] text-[#d9ff4f]/75">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#d9ff4f]" />
                        Code attached
                    </div>
                ) : null}
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="!h-2.5 !w-2.5 !border-2 !border-[#101116] !bg-[#d9ff4f]"
            />
        </div>
    );
}
