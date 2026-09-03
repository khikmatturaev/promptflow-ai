import { useEffect } from "react";
import { registerWebMCPTools } from "./webmcpRegistry";

export function WebMCPRegistry() {
    useEffect(() => {
        void registerWebMCPTools().catch((error: unknown) => {
            console.error("PromptFlow WebMCP registration failed:", error);
        });
    }, []);

    return null;
}
