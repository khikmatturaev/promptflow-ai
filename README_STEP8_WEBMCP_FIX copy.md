# PromptFlow.ai — WebMCP Registry Fix

## Why this patch exists

This is a historical Step 8 engineering note. At that stage, the registry also needed to tolerate `document.modelContext` becoming available after React mounted. Subsequent validation established an additional important compatibility detail: some community WebMCP Inspector builds used an older API and could report zero tools even when Chrome DevTools exposed the current `document.modelContext` tools. The current PromptFlow registry uses the current WebMCP API.

## Targeted fixes

- Wait briefly for `document.modelContext` to become available before registering tools.
- Keep one module-level registration promise instead of reference-counting React StrictMode consumers.
- Do not unregister tools during ordinary React effect cleanup. The application root owns the registry for the page lifetime.
- Keep HMR cleanup so development reloads do not leave stale registrations.
- Continue checking `getTools()` before registration and safely ignore duplicate registration races.
- Log the exact tool name when a real registration error occurs.

## Expected result

After starting the app and opening a fresh PromptFlow page, the WebMCP Inspector should show 12 tools:

1. add_architecture_node
2. connect_architecture_nodes
3. update_architecture_node
4. remove_architecture_node
5. clear_architecture_canvas
6. generate_node_boilerplate
7. get_architecture_snapshot
8. audit_architecture
9. auto_layout_architecture
10. transform_architecture
11. scale_architecture
12. fix_architecture

## Validation

The uploaded source was audited for the registry lifecycle, WebMCP API usage, TypeScript contracts, tool schemas, and Step 8 integration. The environment used for this audit did not have project dependencies installed, so a full `pnpm build` could not be truthfully reported as executed here.

## Test sequence

1. Stop the dev server.
2. Start it again with `pnpm dev`.
3. Close the old localhost tab completely.
4. Open a fresh localhost tab.
5. Open WebMCP Inspector and select the PromptFlow page.
6. Confirm all 12 tools are visible.
7. Confirm browser console has no WebMCP registration error.
8. Manually run one Step 8 tool, then proceed to the real-agent demo.


> **Historical note:** This document records the Step 8 debugging context and is not the final Step 12 validation report. The current release documentation in `README.md` is authoritative.
