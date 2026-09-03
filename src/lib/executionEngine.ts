import { WebContainer, type FileSystemTree, type WebContainerProcess } from "@webcontainer/api";
import type { GeneratedArtifact, ProjectGenerationResult } from "../types/codeGeneration";
import type {
    ExecutionCapability,
    ExecutionDiagnostic,
    ExecutionLoopOptions,
    ExecutionLoopResult,
    ExecutionPatchPlan,
    ExecutionStep,
    SelfHealingAttempt,
    SelfHealingPatch,
} from "../types/execution";

const DEFAULT_OPTIONS: Required<ExecutionLoopOptions> = {
    maxHealingAttempts: 2,
    installTimeoutMs: 120_000,
    commandTimeoutMs: 90_000,
    enableSelfHealing: true,
};

let webContainerPromise: Promise<WebContainer> | null = null;

function capability(): ExecutionCapability {
    if (typeof window === "undefined") {
        return { supported: false, reason: "Execution is browser-only.", runtime: "static" };
    }
    if (!window.isSecureContext && window.location.hostname !== "localhost") {
        return {
            supported: false,
            reason: "WebContainer execution requires HTTPS in deployed environments.",
            runtime: "static",
        };
    }
    if (typeof SharedArrayBuffer === "undefined") {
        return {
            supported: false,
            reason: "SharedArrayBuffer is unavailable. Cross-origin isolation is required for the in-browser runtime.",
            runtime: "static",
        };
    }
    return { supported: true, reason: "WebContainer execution is available.", runtime: "webcontainer" };
}

export function getExecutionCapability(): ExecutionCapability {
    return capability();
}

async function getWebContainer(): Promise<WebContainer> {
    if (!webContainerPromise) {
        webContainerPromise = WebContainer.boot({
            workdirName: "promptflow-execution",
            coep: "require-corp",
            forwardPreviewErrors: "exceptions-only",
        }).catch((error: unknown) => {
            webContainerPromise = null;
            throw error;
        });
    }
    return webContainerPromise;
}

function isSafeArtifactPath(path: string): boolean {
    return Boolean(
        path
        && !path.startsWith("/")
        && !path.includes("\\\\")
        && !/^[A-Za-z]:/.test(path)
        && !path.split("/").some((part) => part === ".."),
    );
}

function toTree(artifacts: GeneratedArtifact[]): FileSystemTree {
    const root: FileSystemTree = {};

    for (const artifact of artifacts) {
        if (!isSafeArtifactPath(artifact.path)) {
            throw new Error(`Unsafe generated artifact path rejected: ${artifact.path}`);
        }
        const parts = artifact.path.split("/").filter(Boolean);
        let cursor = root;
        for (let index = 0; index < parts.length - 1; index += 1) {
            const part = parts[index];
            const existing = cursor[part];
            if (!existing) {
                const directory: FileSystemTree = {};
                cursor[part] = { directory };
                cursor = directory;
                continue;
            }
            if (!("directory" in existing)) {
                throw new Error(`Generated workspace path collision at ${artifact.path}.`);
            }
            cursor = existing.directory;
        }
        const fileName = parts.at(-1);
        if (!fileName) throw new Error(`Invalid generated artifact path: ${artifact.path}`);
        cursor[fileName] = { file: { contents: artifact.content } };
    }

    return root;
}

function clipOutput(output: string, limit = 18_000): string {
    return output.length <= limit ? output : `${output.slice(-limit)}\n… output clipped`;
}

function elapsed(startedAt: number): number {
    return Math.max(0, Date.now() - startedAt);
}

function errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === "string" && message.trim()) return message;
    }
    return String(error);
}

async function runProcess(
    container: WebContainer,
    command: string,
    args: string[],
    timeoutMs: number,
): Promise<{ exitCode: number; output: string; timedOut: boolean }> {
    let process: WebContainerProcess;
    try {
        // Execute from the WebContainer workdir itself. The generated project is
        // mounted at that root, which is the same location npm resolves by default.
        process = await container.spawn(command, args);
    } catch (error: unknown) {
        return {
            exitCode: 127,
            output: `Failed to spawn ${command}: ${errorMessage(error)}`,
            timedOut: false,
        };
    }
    let output = "";
    const reader = process.output.getReader();
    let reading = true;

    const readOutput = async (): Promise<void> => {
        while (reading) {
            const result = await reader.read();
            if (result.done) break;
            output += result.value;
        }
    };

    const outputPromise = readOutput().catch(() => undefined);
    let timedOut = false;
    let timer: number | undefined;

    const exitPromise = process.exit;
    const timeoutPromise = new Promise<"timeout">((resolve) => {
        timer = window.setTimeout(() => resolve("timeout"), timeoutMs);
    });

    const result = await Promise.race([exitPromise, timeoutPromise]);
    if (timer !== undefined) window.clearTimeout(timer);

    if (result === "timeout") {
        timedOut = true;
        process.kill();
        await Promise.race([exitPromise, new Promise((resolve) => window.setTimeout(resolve, 1_000))]);
    }

    reading = false;
    reader.releaseLock();
    await outputPromise;

    return {
        exitCode: timedOut ? 124 : (result as number),
        output: timedOut
            ? `${clipOutput(output)}\n[promptflow] Command timed out after ${timeoutMs}ms and was terminated.`
            : clipOutput(output),
        timedOut,
    };
}

function step(
    id: string,
    phase: ExecutionStep["phase"],
    command: string,
    result: { exitCode: number; output: string },
    startedAt: number,
): ExecutionStep {
    return {
        id,
        phase,
        command,
        status: result.exitCode === 0 ? "passed" : "failed",
        exitCode: result.exitCode,
        durationMs: elapsed(startedAt),
        output: result.output,
    };
}

function diagnosticFor(output: string, phase: ExecutionStep["phase"], exitCode?: number, timedOut?: boolean): ExecutionDiagnostic {
    const evidence = clipOutput(output, 2_400);

    if (timedOut || exitCode === 124) {
        const isTestPhase = phase === "testing";
        return {
            code: isTestPhase ? "test-runner-timeout" : "sandbox-command-timeout",
            title: isTestPhase ? "Test runner did not exit inside the sandbox" : "Sandbox command timed out",
            severity: "error",
            explanation: isTestPhase
                ? "The generated test command did not exit before the WebContainer timeout. PromptFlow uses a single-process TypeScript test harness instead of worker-based test pools so the same generated tests can run inside the browser sandbox. If this still times out, the captured command output is the authoritative next diagnostic."
                : "The command did not exit before the configured timeout and was terminated. This is an execution-environment limitation, not automatically a source-code defect.",
            evidence,
            confidence: 0.9,
        };
    }

    if (/npm ERR!|EAI_AGAIN|ENOTFOUND|ETIMEDOUT|network/i.test(output)) {
        return {
            code: "dependency-network",
            title: "Dependency installation failed",
            severity: "error",
            explanation: "The sandbox could not resolve or download a dependency. This is an execution-environment failure, not automatically a source-code defect.",
            evidence,
            confidence: 0.97,
        };
    }
    if (/Cannot find module ['"]react['"]|react-dom|react\/jsx-runtime/i.test(output)) {
        return {
            code: "missing-react-runtime",
            title: "React runtime dependency is missing",
            severity: "error",
            explanation: "The generated React project references React runtime packages that are not present in the manifest.",
            evidence,
            confidence: 0.99,
        };
    }
    if (/Cannot find module ['"]@types\/react|Could not find a declaration file for module ['"]react/i.test(output)) {
        return {
            code: "missing-react-types",
            title: "React type declarations are missing",
            severity: "error",
            explanation: "TypeScript cannot resolve React declaration packages during the build.",
            evidence,
            confidence: 0.99,
        };
    }
    if (/TS2835|explicit file extensions/i.test(output) && phase === "building") {
        return {
            code: "node-esm-extension",
            title: "Node ESM import extension is missing",
            severity: "error",
            explanation: "The generated Node.js project uses NodeNext ESM resolution, so local TypeScript imports must use the emitted .js extension.",
            evidence,
            confidence: 0.99,
        };
    }
    if (/Cannot find module ['"]\.\/[^'"]+['"]/i.test(output) && /test/i.test(output)) {
        if (phase === "testing") {
            return {
                code: "node-esm-extension",
                title: "Node ESM test import extension is missing",
                severity: "error",
                explanation: "The generated Node.js test uses an extensionless local ESM import. NodeNext requires the emitted .js extension.",
                evidence,
                confidence: 0.99,
            };
        }
        return {
            code: "broken-test-import",
            title: "Generated test import is invalid",
            severity: "error",
            explanation: "A generated test references a module path that is not present in the artifact set.",
            evidence,
            confidence: 0.94,
        };
    }
    if (/TS\d{4}|error TS/i.test(output)) {
        return {
            code: "typescript-build-error",
            title: "TypeScript compilation failed",
            severity: "error",
            explanation: `The ${phase} phase produced a TypeScript diagnostic that requires a targeted source or configuration patch.`,
            evidence,
            confidence: 0.86,
        };
    }
    // NOTE: this must NOT match on the bare substring "vite" — "vitest" contains
    // "vite" as a prefix, so a naive /vite/i test matches virtually every
    // testing-phase failure (timeouts, assertion failures, anything) and
    // mislabels it as a bundler error. Require actual bundler-failure tokens,
    // and only consider this diagnosis for the build phase, where the Vite
    // bundler (not the Vitest test runner) actually runs.
    if (phase === "building" && /RollupError|\[vite\]|vite build|Could not resolve (?:import|entry|module)/i.test(output)) {
        return {
            code: "bundler-build-error",
            title: "Bundler could not produce the project",
            severity: "error",
            explanation: "The generated project reached the bundler but one or more modules or configuration boundaries could not be resolved.",
            evidence,
            confidence: 0.82,
        };
    }
    return {
        code: phase === "testing" ? "test-command-failed" : "execution-failure",
        title: phase === "testing" ? "Generated test command failed" : "Sandbox command failed",
        severity: "error",
        explanation: phase === "testing"
            ? "The generated single-process test harness exited non-zero. This is a test/runtime failure; it is not a bundler diagnosis."
            : "The command exited non-zero and no safe deterministic repair rule matched the observed output.",
        evidence,
        confidence: 0.55,
    };
}

function parseJsonArtifact(project: ProjectGenerationResult): Record<string, unknown> | null {
    const packageArtifact = project.artifacts.find((artifact) => artifact.path === "package.json");
    if (!packageArtifact) return null;
    try {
        const value: unknown = JSON.parse(packageArtifact.content);
        if (!value || typeof value !== "object" || Array.isArray(value)) return null;
        return value as Record<string, unknown>;
    } catch {
        return null;
    }
}

function addDevDependency(
    project: ProjectGenerationResult,
    name: string,
    version: string,
    title: string,
    reason: string,
): SelfHealingPatch | null {
    const manifest = parseJsonArtifact(project);
    if (!manifest) return null;
    const devDependencies = manifest.devDependencies;
    if (!devDependencies || typeof devDependencies !== "object" || Array.isArray(devDependencies)) return null;
    const deps = { ...(devDependencies as Record<string, unknown>) };
    if (typeof deps[name] === "string") return null;
    deps[name] = version;
    const nextManifest = { ...manifest, devDependencies: deps };
    const before = project.artifacts.find((artifact) => artifact.path === "package.json")?.content ?? "";
    const after = JSON.stringify(nextManifest, null, 2) + "\n";
    return {
        id: `heal-${name.replace(/[^a-z0-9]+/gi, "-")}`,
        title,
        reason,
        filePath: "package.json",
        before,
        after,
        confidence: 0.99,
    };
}

function repairNodeEsmTestImports(project: ProjectGenerationResult): SelfHealingPatch | null {
    const candidate = project.artifacts.find(
        (artifact) =>
            artifact.kind === "test"
            && /from "\.\/[^"]+"/.test(artifact.content)
            && !/from "\.\/[^"]+\.js"/.test(artifact.content),
    );
    if (!candidate) return null;

    const before = candidate.content;
    const after = before.replace(
        /from ("\.\/[^"]+)"/g,
        (_match, path: string) => path.endsWith(".js") ? `from "${path}"` : `from "${path}.js"`,
    );

    if (after === before) return null;
    return {
        id: "heal-node-esm-extensions",
        title: "Add Node ESM .js import extensions",
        reason: "The TypeScript NodeNext build requires explicit extensions for local ESM imports.",
        filePath: candidate.path,
        before,
        after,
        confidence: 0.99,
    };
}

function buildHealingPlan(
    project: ProjectGenerationResult,
    diagnostic: ExecutionDiagnostic,
): ExecutionPatchPlan {
    const patches: SelfHealingPatch[] = [];

    if (diagnostic.code === "missing-react-types") {
        const patch = addDevDependency(
            project,
            "@types/react",
            "^19.2.18",
            "Add React type declarations",
            "The TypeScript build reported missing React declarations.",
        );
        if (patch) patches.push(patch);
        const domPatch = addDevDependency(
            { ...project, artifacts: project.artifacts.map((artifact) => artifact.path === "package.json" ? { ...artifact, content: patch?.after ?? artifact.content } : artifact) },
            "@types/react-dom",
            "^19.2.5",
            "Add React DOM type declarations",
            "The React entrypoint also requires React DOM declarations.",
        );
        if (domPatch) patches.push(domPatch);
    }

    if (diagnostic.code === "missing-react-runtime") {
        const reactPatch = addDevDependency(project, "react", "^19.2.8", "Add React runtime", "The generated React entrypoint requires React.");
        if (reactPatch) patches.push(reactPatch);
        const domPatch = addDevDependency(
            { ...project, artifacts: project.artifacts.map((artifact) => artifact.path === "package.json" ? { ...artifact, content: reactPatch?.after ?? artifact.content } : artifact) },
            "react-dom",
            "^19.2.8",
            "Add React DOM runtime",
            "The generated React entrypoint requires React DOM.",
        );
        if (domPatch) patches.push(domPatch);
    }

    if (diagnostic.code === "node-esm-extension") {
        const patch = repairNodeEsmTestImports(project);
        if (patch) patches.push(patch);
    }

    if (diagnostic.code === "broken-test-import") {
        const testArtifact = project.artifacts.find((artifact) => artifact.kind === "test" && /from ["']\.\/[^"']+["']/.test(artifact.content));
        if (testArtifact) {
            const before = testArtifact.content;
            const after = `${before.replace(/import\s+\{\s*[^}]+\s*\}\s+from\s+["']\.\/[^"']+["'];\s*/m, "")}\n`;
            patches.push({
                id: "heal-test-import",
                title: "Remove invalid generated test import",
                reason: "The test runner reported a missing generated module.",
                filePath: testArtifact.path,
                before,
                after,
                confidence: 0.88,
            });
        }
    }

    return { project, patches, diagnostic };
}

function applyPatches(project: ProjectGenerationResult, patches: SelfHealingPatch[]): ProjectGenerationResult {
    if (patches.length === 0) return project;
    let artifacts = project.artifacts.map((artifact) => ({ ...artifact }));
    for (const patch of patches) {
        artifacts = artifacts.map((artifact) =>
            artifact.path === patch.filePath && artifact.content === patch.before
                ? { ...artifact, content: patch.after }
                : artifact,
        );
    }
    return {
        ...project,
        generatedAt: Date.now(),
        artifacts,
    };
}

async function runCommandStep(
    container: WebContainer,
    phase: ExecutionStep["phase"],
    command: string,
    args: string[],
    timeoutMs: number,
): Promise<ExecutionStep> {
    const startedAt = Date.now();
    const result = await runProcess(container, command, args, timeoutMs);
    return step(`${phase}-${startedAt}`, phase, [command, ...args].join(" "), result, startedAt);
}

async function startRuntime(
    container: WebContainer,
    timeoutMs: number,
): Promise<{ step: ExecutionStep; previewUrl?: string }> {
    const startedAt = Date.now();
    let previewUrl: string | undefined;
    let resolveReady: ((url: string) => void) | null = null;
    const readyPromise = new Promise<string>((resolve) => {
        resolveReady = resolve;
    });
    const unsubscribe = container.on("server-ready", (_port, url) => {
        if (!previewUrl) {
            previewUrl = url;
            resolveReady?.(url);
        }
    });
    let process: WebContainerProcess;
    try {
        process = await container.spawn("npm", ["run", "start", "--", "--host", "0.0.0.0"]);
    } catch (error: unknown) {
        unsubscribe();
        return {
            step: {
                id: `runtime-${startedAt}`,
                phase: "verifying",
                command: "npm run start -- --host 0.0.0.0",
                status: "failed",
                exitCode: 127,
                durationMs: elapsed(startedAt),
                output: `Failed to start runtime: ${errorMessage(error)}`,
            },
        };
    }
    const timeout = new Promise<"timeout">((resolve) => {
        window.setTimeout(() => resolve("timeout"), timeoutMs);
    });
    const exit = process.exit.then((exitCode) => ({ exitCode }));
    const ready = readyPromise.then((url) => ({ url }));
    const result = await Promise.race([exit, ready, timeout]);
    unsubscribe();

    if (result === "timeout") {
        process.kill();
        return {
            step: {
                id: `runtime-${startedAt}`,
                phase: "verifying",
                command: "npm run start -- --host 0.0.0.0",
                status: "failed",
                exitCode: 124,
                durationMs: elapsed(startedAt),
                output: "Runtime server did not announce readiness within the timeout.",
            },
        };
    }

    if ("exitCode" in result) {
        return {
            step: {
                id: `runtime-${startedAt}`,
                phase: "verifying",
                command: "npm run start -- --host 0.0.0.0",
                status: "failed",
                exitCode: result.exitCode,
                durationMs: elapsed(startedAt),
                output: "Runtime process exited before the WebContainer server-ready event.",
            },
        };
    }

    return {
        previewUrl: result.url,
        step: {
            id: `runtime-${startedAt}`,
            phase: "verifying",
            command: "npm run start -- --host 0.0.0.0",
            status: "passed",
            durationMs: elapsed(startedAt),
            output: `Runtime server ready at ${result.url}`,
        },
    };
}

export async function executeProject(
    project: ProjectGenerationResult,
    options: ExecutionLoopOptions = {},
): Promise<ExecutionLoopResult> {
    const config = { ...DEFAULT_OPTIONS, ...options };
    const startedAt = Date.now();
    const id = crypto.randomUUID();
    const capabilityState = capability();

    if (!capabilityState.supported || project.runtime.startsWith("Python")) {
        return {
            id,
            startedAt,
            finishedAt: Date.now(),
            phase: "unsupported",
            status: "unsupported",
            runtime: capabilityState.runtime,
            projectName: project.projectName,
            steps: [],
            diagnostics: [{
                code: project.runtime.startsWith("Python") ? "python-runtime-unsupported" : "webcontainer-unavailable",
                title: project.runtime.startsWith("Python") ? "Python execution is not enabled" : "In-browser execution is unavailable",
                severity: "warning",
                explanation: project.runtime.startsWith("Python")
                    ? "Core 8 currently executes Node.js projects in WebContainer. Python remains covered by static preflight."
                    : capabilityState.reason,
                evidence: capabilityState.reason,
                confidence: 1,
            }],
            healingAttempts: [],
            artifacts: project.artifacts,
            output: "",
            note: "No arbitrary project code was executed because the sandbox capability is unavailable for this project.",
        };
    }

    let currentProject = project;
    const steps: ExecutionStep[] = [];
    const healingAttempts: SelfHealingAttempt[] = [];
    let lastDiagnostics: ExecutionDiagnostic[] = [];
    let lastOutput = "";

    for (let attempt = 0; attempt <= config.maxHealingAttempts; attempt += 1) {
        let container: WebContainer;
        try {
            container = await getWebContainer();
        } catch (error: unknown) {
            const message = errorMessage(error);
            lastDiagnostics = [{
                code: "webcontainer-boot",
                title: "Sandbox boot failed",
                severity: "error",
                explanation: "PromptFlow could not start the browser-native execution runtime.",
                evidence: message,
                confidence: 0.99,
            }];
            break;
        }

        const mountStartedAt = Date.now();
        try {
            // Keep the generated project at the WebContainer workdir root.
            // WebContainers execute `spawn()` from that same workdir by default, and npm
            // therefore resolves /package.json without any cwd/mountPoint translation.
            await container.mount(toTree(currentProject.artifacts));

            const manifest = await container.fs.readFile("/package.json", "utf-8");
            if (!manifest.trim()) {
                throw new Error("Mounted workspace manifest is empty: /package.json");
            }
        } catch (error: unknown) {
            const message = errorMessage(error);
            lastDiagnostics = [{
                code: "workspace-mount",
                title: "Workspace mount failed",
                severity: "error",
                explanation: "The generated artifact set could not be mounted into the isolated runtime.",
                evidence: message,
                confidence: 0.99,
            }];
            break;
        }
        steps.push({
            id: `mount-${attempt}`,
            phase: "mounting",
            status: "passed",
            durationMs: elapsed(mountStartedAt),
            output: `Mounted ${currentProject.artifacts.length} artifacts.`,
        });

        const install = await runCommandStep(container, "installing", "npm", ["install", "--no-audit", "--no-fund"], config.installTimeoutMs);
        steps.push(install);
        if (install.exitCode !== 0) {
            lastOutput = install.output;
            const diagnostic = diagnosticFor(install.output, "installing", install.exitCode);
            lastDiagnostics = [diagnostic];
            if (!config.enableSelfHealing || attempt >= config.maxHealingAttempts || diagnostic.code === "dependency-network") {
                break;
            }
            const plan = buildHealingPlan(currentProject, diagnostic);
            if (!plan.patches.length) break;
            currentProject = applyPatches(currentProject, plan.patches);
            healingAttempts.push({ attempt: attempt + 1, diagnostic, patches: plan.patches, verified: false });
            continue;
        }

        const test = await runCommandStep(container, "testing", "npm", ["test"], config.commandTimeoutMs);
        steps.push(test);
        if (test.exitCode !== 0) {
            lastOutput = test.output;
            const diagnostic = diagnosticFor(test.output, "testing", test.exitCode);
            lastDiagnostics = [diagnostic];
            if (!config.enableSelfHealing || attempt >= config.maxHealingAttempts) break;
            const plan = buildHealingPlan(currentProject, diagnostic);
            if (!plan.patches.length) break;
            currentProject = applyPatches(currentProject, plan.patches);
            healingAttempts.push({ attempt: attempt + 1, diagnostic, patches: plan.patches, verified: false });
            continue;
        }

        const build = await runCommandStep(container, "building", "npm", ["run", "build"], config.commandTimeoutMs);
        steps.push(build);
        if (build.exitCode !== 0) {
            lastOutput = build.output;
            const diagnostic = diagnosticFor(build.output, "building", build.exitCode);
            lastDiagnostics = [diagnostic];
            if (!config.enableSelfHealing || attempt >= config.maxHealingAttempts) break;
            const plan = buildHealingPlan(currentProject, diagnostic);
            if (!plan.patches.length) break;
            currentProject = applyPatches(currentProject, plan.patches);
            healingAttempts.push({ attempt: attempt + 1, diagnostic, patches: plan.patches, verified: false });
            continue;
        }

        const runtime = await startRuntime(container, 20_000);
        steps.push(runtime.step);
        if (runtime.step.status !== "passed") {
            lastOutput = runtime.step.output;
            lastDiagnostics = [diagnosticFor(runtime.step.output, "verifying", runtime.step.exitCode)];
            break;
        }

        for (const attemptResult of healingAttempts) {
            attemptResult.verified = true;
        }

        const finishedAt = Date.now();
        return {
            id,
            startedAt,
            finishedAt,
            phase: "completed",
            status: "passed",
            runtime: "webcontainer",
            projectName: currentProject.projectName,
            steps,
            diagnostics: [],
            healingAttempts,
            artifacts: currentProject.artifacts,
            output: lastOutput || runtime.step.output,
            previewUrl: runtime.previewUrl,
            note: healingAttempts.length > 0
                ? `Execution passed after ${healingAttempts.length} self-healing attempt(s).`
                : "Project installed, tests passed, and production build passed inside the browser-native sandbox.",
        };
    }

    return {
        id,
        startedAt,
        finishedAt: Date.now(),
        phase: "failed",
        status: "failed",
        runtime: "webcontainer",
        projectName: currentProject.projectName,
        steps,
        diagnostics: lastDiagnostics,
        healingAttempts,
        artifacts: currentProject.artifacts,
        output: lastOutput,
        note: "Execution stopped safely after the bounded self-healing budget. No arbitrary host-page code execution occurred.",
    };
}
