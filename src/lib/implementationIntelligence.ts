import { buildArchitectureDNA } from "./architectureBrain";
import type {
    ArchitectureEdge,
    ArchitectureNode,
    ArchitectureNodeType,
} from "../types";
import type {
    ArchitectureImplementationBlueprint,
    ImplementationComponent,
    ImplementationContract,
    ImplementationEnvironmentVariable,
    ImplementationLayer,
    ImplementationPhase,
    ImplementationRisk,
    ImplementationTestPlan,
} from "../types/implementation";

const COMPUTE_TYPES: ArchitectureNodeType[] = ["backend", "api", "service", "worker"];
const DATA_TYPES: ArchitectureNodeType[] = ["database", "cache"];
const INTEGRATION_TYPES: ArchitectureNodeType[] = ["payment", "external"];

const clamp = (value: number, min = 0, max = 100) =>
    Math.min(max, Math.max(min, Math.round(value)));

const slug = (value: string): string =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48) || "component";

const unique = <T,>(items: T[]): T[] => [...new Set(items)];

function outgoing(edges: ArchitectureEdge[], nodeId: string): ArchitectureEdge[] {
    return edges.filter((edge) => edge.source === nodeId);
}

function incoming(edges: ArchitectureEdge[], nodeId: string): ArchitectureEdge[] {
    return edges.filter((edge) => edge.target === nodeId);
}

function layerFor(type: ArchitectureNodeType): ImplementationLayer {
    if (type === "frontend") return "experience";
    if (type === "cdn" || type === "gateway") return "edge";
    if (COMPUTE_TYPES.includes(type)) return type === "worker" ? "async" : "application";
    if (type === "database" || type === "cache") return "data";
    if (type === "queue") return "async";
    if (INTEGRATION_TYPES.includes(type)) return "integration";
    if (type === "observability") return "operations";
    return "domain";
}

function frameworkFor(nodes: ArchitectureNode[]): string[] {
    const haystack = nodes
        .map((node) => `${node.data.label} ${node.data.description}`)
        .join(" ")
        .toLowerCase();

    const stack: string[] = [];
    if (haystack.includes("react")) stack.push("React");
    if (haystack.includes("next.js") || haystack.includes("nextjs")) stack.push("Next.js");
    if (haystack.includes("node.js") || haystack.includes("nodejs")) stack.push("Node.js");
    if (haystack.includes("fastify")) stack.push("Fastify");
    if (haystack.includes("express")) stack.push("Express");
    if (haystack.includes("python")) stack.push("Python");
    if (haystack.includes("postgres")) stack.push("PostgreSQL");
    if (haystack.includes("mongo")) stack.push("MongoDB");
    if (haystack.includes("mysql")) stack.push("MySQL");
    if (haystack.includes("redis")) stack.push("Redis");
    if (haystack.includes("stripe")) stack.push("Stripe");
    if (haystack.includes("kafka")) stack.push("Kafka");
    if (haystack.includes("websocket")) stack.push("WebSockets");
    if (haystack.includes("openai")) stack.push("OpenAI");
    if (haystack.includes("aws")) stack.push("AWS");
    if (haystack.includes("gcp")) stack.push("GCP");
    if (haystack.includes("azure")) stack.push("Azure");
    return unique(stack);
}

function filesFor(node: ArchitectureNode): string[] {
    const id = slug(node.data.label);
    switch (node.data.type) {
        case "frontend":
            return ["src/app/", `src/features/${id}/`, "src/lib/api.ts", "src/routes/"];
        case "gateway":
            return ["src/edge/routes.ts", "src/edge/middleware.ts"];
        case "backend":
        case "api":
            return [`src/modules/${id}/controller.ts`, `src/modules/${id}/service.ts`, `src/modules/${id}/schema.ts`, `src/modules/${id}/${id}.test.ts`];
        case "service":
            return [`src/modules/${id}/service.ts`, `src/modules/${id}/repository.ts`, `src/modules/${id}/${id}.test.ts`];
        case "database":
            return ["src/db/client.ts", "src/db/schema/", "src/db/migrations/"];
        case "cache":
            return ["src/infrastructure/cache.ts", "src/infrastructure/cache.test.ts"];
        case "queue":
            return ["src/infrastructure/queue.ts", "src/infrastructure/queue.test.ts"];
        case "worker":
            return [`src/workers/${id}.worker.ts`, `src/workers/${id}.worker.test.ts`];
        case "auth":
            return ["src/auth/auth.service.ts", "src/auth/policy.ts", "src/auth/auth.test.ts"];
        case "payment":
            return [`src/integrations/${id}.client.ts`, `src/integrations/${id}.webhook.ts`, `src/integrations/${id}.test.ts`];
        case "external":
            return [`src/integrations/${id}.client.ts`, `src/integrations/${id}.client.test.ts`];
        case "cdn":
            return ["infra/edge/cdn.md"];
        case "observability":
            return ["src/observability/telemetry.ts", "src/observability/health.ts", "src/observability/alerts.md"];
        default:
            return [`src/modules/${id}/index.ts`];
    }
}

function interfacesFor(
    node: ArchitectureNode,
    edges: ArchitectureEdge[],
    nodesById: Map<string, ArchitectureNode>,
): string[] {
    return outgoing(edges, node.id)
        .map((edge) => nodesById.get(edge.target))
        .filter((target): target is ArchitectureNode => Boolean(target))
        .slice(0, 6)
        .map((target) => `${edgeLabel(node.id, target.id, edges)} → ${target.data.label}`);
}

function edgeLabel(sourceId: string, targetId: string, edges: ArchitectureEdge[]): string {
    return edges.find((edge) => edge.source === sourceId && edge.target === targetId)?.data?.label?.trim() || "Integration";
}

function dependenciesFor(node: ArchitectureNode, edges: ArchitectureEdge[], nodesById: Map<string, ArchitectureNode>): string[] {
    return outgoing(edges, node.id)
        .map((edge) => nodesById.get(edge.target)?.data.label)
        .filter((label): label is string => Boolean(label))
        .slice(0, 8);
}

function testsFor(node: ArchitectureNode, edges: ArchitectureEdge[]): string[] {
    const targets = outgoing(edges, node.id).length;
    const consumers = incoming(edges, node.id).length;
    const tests = [`${node.data.label}: happy-path unit coverage`];
    if (targets > 0) tests.push(`${node.data.label}: dependency failure and timeout behavior`);
    if (consumers > 1) tests.push(`${node.data.label}: contract compatibility with ${consumers} consumers`);
    if (node.data.type === "database") tests.push(`${node.data.label}: migration, rollback, and restore verification`);
    if (node.data.type === "queue" || node.data.type === "worker") tests.push(`${node.data.label}: retry, idempotency, and poison-message handling`);
    return tests;
}

function buildComponents(nodes: ArchitectureNode[], edges: ArchitectureEdge[]): ImplementationComponent[] {
    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    return nodes.map((node) => ({
        nodeId: node.id,
        label: node.data.label,
        type: node.data.type,
        layer: layerFor(node.data.type),
        responsibility: node.data.description,
        suggestedFiles: filesFor(node),
        dependencies: dependenciesFor(node, edges, nodesById),
        interfaces: interfacesFor(node, edges, nodesById),
        testTargets: testsFor(node, edges),
        codeReady: Boolean(node.data.boilerplate.trim()),
    }));
}

function buildContracts(nodes: ArchitectureNode[], edges: ArchitectureEdge[]): ImplementationContract[] {
    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    const contracts: ImplementationContract[] = [];

    for (const node of nodes) {
        const nodeEdges = outgoing(edges, node.id);
        for (const edge of nodeEdges) {
            const target = nodesById.get(edge.target);
            if (!target) continue;

            const isEvent = node.data.type === "queue" || target.data.type === "queue" || node.data.type === "worker";
            const isData = DATA_TYPES.includes(target.data.type);
            const isExternal = INTEGRATION_TYPES.includes(target.data.type);

            contracts.push({
                id: `${node.id}->${target.id}`,
                ownerNodeId: node.id,
                consumerNodeIds: [target.id],
                name: `${node.data.label} → ${target.data.label}`,
                kind: isExternal ? "external" : isEvent ? "event" : isData ? "data" : "http",
                boundary: edge.data?.label?.trim() || "Integration boundary",
                inputs: [isEvent ? "typed event payload" : isData ? "validated domain data" : "validated request"],
                outputs: [isEvent ? "acknowledgement / job result" : isData ? "persisted or queried state" : "typed response"],
                reliabilityNotes: isEvent
                    ? ["idempotency key", "retry policy", "dead-letter handling"]
                    : isExternal
                        ? ["bounded timeout", "retry with backoff", "circuit breaker or fallback"]
                        : ["schema validation", "structured errors", "correlation id"],
            });
        }
    }

    return contracts.slice(0, 80);
}

function buildEnvironment(nodes: ArchitectureNode[]): ImplementationEnvironmentVariable[] {
    const variables: ImplementationEnvironmentVariable[] = [];
    const add = (name: string, purpose: string, required: boolean, secret: boolean, node: ArchitectureNode) => {
        variables.push({ name, purpose, required, secret, sourceNodeIds: [node.id] });
    };

    for (const node of nodes) {
        const label = node.data.label.toLowerCase();
        if (node.data.type === "database") {
            add("DATABASE_URL", `${node.data.label} connection string`, true, true, node);
        }
        if (node.data.type === "cache") add("REDIS_URL", `${node.data.label} connection endpoint`, true, true, node);
        if (node.data.type === "payment" || label.includes("stripe")) {
            add("PAYMENT_PROVIDER_SECRET", `Server-side credential for ${node.data.label}`, true, true, node);
        }
        if (node.data.type === "external") {
            add(`${slug(node.data.label).replaceAll("-", "_").toUpperCase()}_BASE_URL`, `${node.data.label} service endpoint`, true, false, node);
        }
        if (node.data.type === "auth") add("AUTH_SIGNING_SECRET", "Credential used to sign or validate application sessions/tokens", true, true, node);
        if (node.data.type === "observability") add("OTEL_EXPORTER_ENDPOINT", "Telemetry collector endpoint", false, false, node);
    }

    const merged = new Map<string, ImplementationEnvironmentVariable>();
    for (const item of variables) {
        const existing = merged.get(item.name);
        if (!existing) {
            merged.set(item.name, { ...item, sourceNodeIds: [...item.sourceNodeIds] });
            continue;
        }
        merged.set(item.name, {
            ...existing,
            purpose: existing.purpose === item.purpose ? existing.purpose : `${existing.purpose}; ${item.purpose}`,
            required: existing.required || item.required,
            secret: existing.secret || item.secret,
            sourceNodeIds: [...new Set([...existing.sourceNodeIds, ...item.sourceNodeIds])],
        });
    }
    return [...merged.values()];
}

function buildProjectStructure(components: ImplementationComponent[]): string[] {
    const roots = new Set<string>(["src/", "tests/", "infra/", ".env.example"]);
    for (const component of components) {
        for (const file of component.suggestedFiles) {
            const root = file.split("/").slice(0, 2).join("/");
            roots.add(root.endsWith("/") ? root : `${root}/`);
        }
    }
    return [...roots];
}

function buildPhases(components: ImplementationComponent[], contracts: ImplementationContract[]): ImplementationPhase[] {
    const byLayer = (layers: ImplementationLayer[]) =>
        components.filter((component) => layers.includes(component.layer));

    const phaseDefinitions: Array<{
        title: string;
        goal: string;
        layers: ImplementationLayer[];
        deliverables: string[];
        exitCriteria: string[];
    }> = [
            {
                title: "Foundation & data",
                goal: "Establish configuration, durable state, migrations, and shared application primitives.",
                layers: ["data", "operations"],
                deliverables: ["configuration and environment contract", "database schema/migrations", "health and telemetry foundation"],
                exitCriteria: ["database connectivity is tested", "configuration validation is enforced", "health checks are observable"],
            },
            {
                title: "Core application",
                goal: "Implement the primary business capabilities behind explicit boundaries.",
                layers: ["application", "domain"],
                deliverables: ["service modules", "validation schemas", "domain tests", "error model"],
                exitCriteria: ["critical use cases have integration coverage", "service boundaries are documented", "failure behavior is tested"],
            },
            {
                title: "Delivery & async",
                goal: "Connect clients, ingress, background processing, and performance boundaries.",
                layers: ["experience", "edge", "async"],
                deliverables: ["API routes", "frontend integration", "queue/worker flows", "edge policies"],
                exitCriteria: ["critical request paths are traced", "async jobs are idempotent", "traffic controls are explicit"],
            },
            {
                title: "Integrations & hardening",
                goal: "Complete external contracts and validate production failure behavior.",
                layers: ["integration"],
                deliverables: ["external clients", "webhook handlers", "contract tests", "resilience tests"],
                exitCriteria: ["timeouts/retries are bounded", "secrets are externalized", "dependency failures degrade safely"],
            },
        ];

    return phaseDefinitions
        .map((definition, index) => {
            const selected = byLayer(definition.layers);
            if (selected.length === 0) return null;
            return {
                order: index + 1,
                title: definition.title,
                goal: definition.goal,
                nodeIds: selected.map((item) => item.nodeId),
                deliverables: [...definition.deliverables, contracts.length > 0 ? `${contracts.length} architecture contracts mapped` : "architecture contracts documented"],
                exitCriteria: definition.exitCriteria,
            };
        })
        .filter((phase): phase is ImplementationPhase => Boolean(phase));
}

function buildRisks(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
    codeReadyCount: number,
): ImplementationRisk[] {
    const risks: ImplementationRisk[] = [];
    const compute = nodes.filter((node) => COMPUTE_TYPES.includes(node.data.type));
    const database = nodes.filter((node) => node.data.type === "database");
    const external = nodes.filter((node) => INTEGRATION_TYPES.includes(node.data.type));
    const hasAuth = nodes.some((node) => node.data.type === "auth");
    const hasQueue = nodes.some((node) => node.data.type === "queue");
    const hasObservability = nodes.some((node) => node.data.type === "observability");

    if (compute.length > 0 && compute.some((node) => outgoing(edges, node.id).length === 0)) {
        risks.push({
            id: "orphan-compute",
            severity: "high",
            title: "Compute boundary is not connected",
            message: "At least one compute component has no outgoing contract in the current graph.",
            mitigation: "Define its data, service, or delivery boundary before implementation.",
        });
    }
    if (database.length > 0 && database.length === 1) {
        risks.push({
            id: "single-data-runtime",
            severity: "high",
            title: "Single database runtime",
            message: "The implementation plan depends on one represented database tier.",
            mitigation: "Document backup, restore, replication, and failover behavior before production rollout.",
        });
    }
    if (external.length > 0 && !hasAuth) {
        risks.push({
            id: "integration-trust-boundary",
            severity: "high",
            title: "External integration without explicit identity boundary",
            message: "External calls are present but authentication/authorization is not represented.",
            mitigation: "Define caller identity, credential ownership, and authorization policy.",
        });
    }
    if (nodes.length >= 4 && !hasQueue) {
        risks.push({
            id: "sync-workload",
            severity: "medium",
            title: "No asynchronous execution boundary",
            message: "Several components are present without a queue/worker path for slow or retryable work.",
            mitigation: "Move non-critical side effects behind durable asynchronous processing where appropriate.",
        });
    }
    if (nodes.length >= 4 && !hasObservability) {
        risks.push({
            id: "missing-runtime-visibility",
            severity: "medium",
            title: "Runtime visibility is not represented",
            message: "The implementation plan has no explicit telemetry ownership.",
            mitigation: "Add logs, metrics, traces, health checks, and alert ownership before launch.",
        });
    }
    if (nodes.length > 0 && codeReadyCount === 0) {
        risks.push({
            id: "no-code-artifacts",
            severity: "medium",
            title: "No component code artifacts attached",
            message: "The architecture is defined but no node has generated or attached implementation code.",
            mitigation: "Generate code contracts first, then scaffold the highest-risk service boundaries.",
        });
    }

    return risks.slice(0, 10);
}

function buildTests(components: ImplementationComponent[], contracts: ImplementationContract[]): ImplementationTestPlan {
    return {
        unit: components.slice(0, 12).flatMap((component) => component.testTargets.slice(0, 2)),
        integration: contracts.slice(0, 12).map((contract) => `${contract.name}: integration behavior and failure handling`),
        contract: contracts.slice(0, 12).map((contract) => `${contract.name}: validate ${contract.boundary} schema compatibility`),
        resilience: [
            "dependency timeout and retry exhaustion",
            "database unavailable / recovery path",
            "queue backlog and worker restart",
            "authentication failure and authorization denial",
        ],
    };
}

function readinessScore(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
    components: ImplementationComponent[],
    contracts: ImplementationContract[],
    risks: ImplementationRisk[],
): number {
    if (nodes.length === 0) return 0;
    const connectedRatio = edges.length / Math.max(1, nodes.length - 1);
    const codeRatio = components.filter((item) => item.codeReady).length / nodes.length;
    const contractRatio = contracts.length / Math.max(1, edges.length);
    const score =
        Math.min(25, connectedRatio * 25) +
        Math.min(25, contractRatio * 25) +
        codeRatio * 20 +
        (risks.filter((risk) => risk.severity === "high").length === 0 ? 20 : 8) +
        (nodes.some((node) => node.data.type === "observability") ? 5 : 0) +
        (nodes.some((node) => node.data.type === "auth") ? 5 : 0);
    return clamp(score);
}

function maturity(score: number): ArchitectureImplementationBlueprint["maturity"] {
    if (score >= 85) return "implementation-ready";
    if (score >= 70) return "implementation-candidate";
    if (score >= 50) return "design-ready";
    return "needs-architecture-work";
}

export function analyzeImplementationIntelligence(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
): ArchitectureImplementationBlueprint {
    const components = buildComponents(nodes, edges);
    const contracts = buildContracts(nodes, edges);
    const environment = buildEnvironment(nodes);
    const risks = buildRisks(nodes, edges, components.filter((item) => item.codeReady).length);
    const score = readinessScore(nodes, edges, components, contracts, risks);
    const phases = buildPhases(components, contracts);
    const dna = buildArchitectureDNA(nodes, edges);
    const stack = frameworkFor(nodes);
    const projectStructure = buildProjectStructure(components);
    const tests = buildTests(components, contracts);
    const recommendedFirstFiles = components
        .filter((component) => !component.codeReady)
        .sort((a, b) => {
            const riskWeight = (item: ImplementationComponent) =>
                item.type === "database" || item.type === "auth" || COMPUTE_TYPES.includes(item.type) ? 0 : 1;
            return riskWeight(a) - riskWeight(b);
        })
        .slice(0, 8)
        .flatMap((component) => component.suggestedFiles.slice(0, 2));

    return {
        generatedAt: Date.now(),
        modelVersion: "implementation-intelligence-1.0",
        architectureFingerprint: dna.fingerprint,
        readinessScore: score,
        maturity: maturity(score),
        stack,
        projectStructure,
        components,
        contracts,
        phases,
        environment,
        risks,
        tests,
        recommendedFirstFiles: unique(recommendedFirstFiles),
        totalSuggestedFiles: unique(components.flatMap((component) => component.suggestedFiles)).length,
        codeReadyCount: components.filter((component) => component.codeReady).length,
    };
}

export function generateImplementationContracts(
    nodes: ArchitectureNode[],
    edges: ArchitectureEdge[],
): ImplementationContract[] {
    return buildContracts(nodes, edges);
}
