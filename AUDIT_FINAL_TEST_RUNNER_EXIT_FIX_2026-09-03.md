# PromptFlow — Final Test Runner Exit Fix

## Root cause confirmed

The generated test suite completed successfully:

- PASS ai-inference-service.test.ts
- PASS application-api.test.ts
- PASS realtime-service.test.ts
- PASS worker-pool.test.ts
- PromptFlow tests passed: 4/4

The command still timed out because the generated runner previously used only `process.exitCode`. Node does not terminate while imported modules keep active handles alive. A generated application module can initialize a long-lived HTTP listener during the smoke-test import. The WebContainer therefore waited until the 60-second command timeout and reported `test-runner-timeout` despite all tests passing.

This is not a test assertion failure and not the previous missing-Express dependency failure.

## Fix

The generated `scripts/run-tests.ts` now explicitly exits after every awaited test import has settled:

- exit `0` when all tests pass;
- exit `1` when one or more tests fail.

This prevents active handles created by smoke-test imports from keeping `npm test` alive after the suite has completed.

## Expected sequence

`4/4 PASS -> process.exit(0) -> npm test exit 0 -> build -> runtime`

instead of:

`4/4 PASS -> active handle remains -> 60s timeout -> FAILED`.
