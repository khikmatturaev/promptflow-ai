export { };

declare global {
  interface WebMCPToolAnnotations {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
    untrustedContentHint?: boolean;
  }

  interface WebMCPToolExecutionContext {
    signal: AbortSignal;
  }

  interface WebMCPToolDefinition<TInput = unknown> {
    name: string;
    title?: string;
    description: string;
    inputSchema: Record<string, unknown>;
    annotations?: WebMCPToolAnnotations;
    execute: (
      input: TInput,
      context: WebMCPToolExecutionContext,
    ) => Promise<string> | string;
  }

  interface WebMCPToolSummary {
    name: string;
    title?: string;
    description?: string;
    inputSchema?: unknown;
    origin?: string;
    window?: Window;
  }

  interface ModelContext extends EventTarget {
    registerTool: (
      tool: WebMCPToolDefinition,
      options?: {
        signal?: AbortSignal;
        exposedTo?: string[];
      },
    ) => Promise<void>;
    getTools: () => Promise<ReadonlyArray<WebMCPToolSummary>>;
  }

  interface Document {
    readonly modelContext?: ModelContext;
  }
}
