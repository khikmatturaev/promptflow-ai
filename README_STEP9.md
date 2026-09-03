# PromptFlow.ai — STEP 9

## ChatGPT Real-Agent Demo

Step 9 turns the verified WebMCP architecture canvas into an observable human-agent workflow.

### What changed

- Added a dedicated **ChatGPT Real-Agent Demo** panel inside the canvas.
- Added a production demo prompt for the full e-commerce architecture workflow.
- Added live WebMCP readiness and exposed-tool count.
- Added a five-stage agent pipeline:
  1. Discover
  2. Inspect
  3. Build
  4. Audit
  5. Fix
- Added a live activity feed backed by the actual WebMCP tool execution callbacks.
- Tool activity is retained in Zustand and capped at the latest 30 calls.
- Added tool execution instrumentation without changing the underlying architecture mutations.
- Updated the WebMCP type declaration to match the current `document.modelContext` EventTarget/getTools shape.

### Real-agent flow

The intended demo is:

```text
User
  ↓
ChatGPT desktop app built-in browser
  ↓
PromptFlow WebMCP site tools
  ↓
get_architecture_snapshot
  ↓
add/connect/transform/scale
  ↓
audit_architecture
  ↓
fix_architecture
  ↓
Auto layout + live canvas
```

The activity panel does not simulate these steps. Each activity row is created from the actual registered WebMCP tool execution.

### Demo prompt

> Build a production-ready e-commerce architecture with React, Node.js, PostgreSQL, Redis, Stripe, authentication, and background jobs. Then audit it, identify the most important architectural risks, and fix them.

### Test

1. Start PromptFlow with `pnpm dev`.
2. Open a fresh page and confirm the WebMCP inspector sees the 12 registered tools.
3. Click **Agent demo** in the canvas header.
4. Open the same PromptFlow page in the ChatGPT desktop app's built-in browser.
5. Paste the demo prompt.
6. Allow site tools if ChatGPT asks for permission.
7. Watch the PromptFlow canvas change live.
8. Watch **Live agent activity** to verify the actual tool calls.
9. The expected end state is a production-oriented e-commerce graph with audit/fix activity and a clean architecture score.

### Important

The PromptFlow frontend does not call an OpenAI API and does not fake an agent. ChatGPT is the external agent; WebMCP is the browser-native action boundary. The page only exposes deterministic tools and visualizes the real calls that arrive through those tools.
