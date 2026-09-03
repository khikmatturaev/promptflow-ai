import { useEffect, useState } from "react";

export function WebMCPStatusBadge() {
    const [toolCount, setToolCount] = useState(0);

    useEffect(() => {
        let active = true;
        let retryTimer: number | undefined;
        let observedModelContext: ModelContext | null = null;

        const refresh = async () => {
            const modelContext = document.modelContext;
            if (!modelContext?.getTools) {
                if (active) {
                    setToolCount(0);
                    retryTimer = window.setTimeout(() => void refresh(), 500);
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
                if (active) setToolCount(tools.length);
            } catch {
                if (active) setToolCount(0);
            } finally {
                if (active && !supportsToolChange) {
                    retryTimer = window.setTimeout(() => void refresh(), 750);
                }
            }
        };

        const handleToolChange = () => void refresh();
        void refresh();

        return () => {
            active = false;
            if (retryTimer !== undefined) window.clearTimeout(retryTimer);
            if (observedModelContext && typeof observedModelContext.removeEventListener === "function") {
                observedModelContext.removeEventListener("toolchange", handleToolChange);
            }
        };
    }, []);

    const ready = toolCount > 0;

    return (
        <div
            className={`flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${ready
                ? "border-[#d9ff4f]/15 bg-[#d9ff4f]/5 text-[#d9ff4f]/65"
                : "border-white/10 bg-white/[0.025] text-white/35"
                }`}
            title={ready ? `${toolCount} WebMCP tools available` : "Waiting for WebMCP tools"}
            aria-label={ready ? `WebMCP ready, ${toolCount} tools available` : "WebMCP waiting for tools"}
        >
            <span
                className={`h-1.5 w-1.5 rounded-full ${ready ? "bg-[#d9ff4f] shadow-[0_0_8px_rgba(217,255,79,0.7)]" : "bg-white/25"}`}
            />
            {ready ? `WebMCP ready · ${toolCount}` : "WebMCP waiting"}
        </div>
    );
}
