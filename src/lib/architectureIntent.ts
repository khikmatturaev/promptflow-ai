import type {
    ArchitectureNodeType,
    ArchitectureTransformOperation,
} from "../types";

export interface ArchitectureIntent {
    originalPrompt: string;
    domain: string;
    scale: number;
    technologies: string[];
    requirements: string[];
    components: string[];
    confidence: "high" | "medium" | "low";
}

export interface ArchitecturePlan {
    intent: ArchitectureIntent;
    operations: ArchitectureTransformOperation[];
    primaryCodeNodeId: string;
}

const MAX_PROMPT_LENGTH = 1200;

function normalize(value: string): string {
    return value.trim().replace(/\s+/g, " ").slice(0, MAX_PROMPT_LENGTH);
}

function hasAny(text: string, terms: readonly string[]): boolean {
    return terms.some((term) => text.includes(term));
}

function parseScale(text: string): number {
    const scaledMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(k|thousand|m|million|b|billion)\b(?:\s*(?:users|user|customers|clients|requests|rps|traffic))?/i);
    const explicitCountMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:users|user|customers|clients|requests|rps|traffic)\b/i);
    const match = scaledMatch ?? explicitCountMatch;
    if (!match) return 10_000;

    const value = Number(match[1].replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) return 10_000;

    const suffix = scaledMatch?.[2]?.toLowerCase();
    if (suffix === "k" || suffix === "thousand") return Math.round(value * 1_000);
    if (suffix === "m" || suffix === "million") return Math.round(value * 1_000_000);
    if (suffix === "b" || suffix === "billion") return Math.round(value * 1_000_000_000);
    return Math.round(value);
}

function detectDomain(text: string): string {
    const domains: Array<[string, string[]]> = [
        ["E-commerce", ["e-commerce", "ecommerce", "online store", "shopping", "checkout", "cart", "shop"]],
        ["Social platform", ["social network", "social media", "tiktok", "instagram", "community", "feed", "followers"]],
        ["Fintech", ["fintech", "banking", "bank", "wallet", "ledger", "financial", "trading", "investment"]],
        ["AI platform", ["ai", "artificial intelligence", "llm", "machine learning", "inference", "rag", "copilot", "chatbot"]],
        ["Real-time platform", ["real-time", "realtime", "websocket", "live", "presence", "chat", "messaging"]],
        ["Media platform", ["video", "streaming", "media", "netflix", "youtube", "podcast", "transcoding"]],
        ["Food delivery", ["food delivery", "delivery", "restaurant", "courier", "driver", "rider"]],
        ["Marketplace", ["marketplace", "seller", "vendor", "buyer", "listing"]],
        ["Education", ["education", "learning", "course", "student", "teacher", "lms"]],
        ["Healthcare", ["healthcare", "medical", "clinic", "patient", "hospital"]],
        ["SaaS", ["saas", "subscription", "multi-tenant", "b2b", "workspace"]],
    ];

    const match = domains.find(([, terms]) => hasAny(text, terms));
    return match?.[0] ?? "Application platform";
}

function detectTechnologies(text: string): string[] {
    const technologies: Array<[string, string[]]> = [
        ["React", ["react", "react.js"]],
        ["Next.js", ["next.js", "nextjs"]],
        ["Node.js", ["node.js", "nodejs"]],
        ["Fastify", ["fastify"]],
        ["Express", ["express"]],
        ["Python", ["python"]],
        ["PostgreSQL", ["postgresql", "postgres"]],
        ["MongoDB", ["mongodb", "mongo"]],
        ["MySQL", ["mysql"]],
        ["Redis", ["redis"]],
        ["Stripe", ["stripe"]],
        ["AWS", ["aws", "amazon web services"]],
        ["GCP", ["gcp", "google cloud"]],
        ["Azure", ["azure"]],
        ["WebSockets", ["websocket", "websockets", "socket.io"]],
        ["OpenAI", ["openai", "gpt", "chatgpt"]],
        ["Kafka", ["kafka"]],
    ];

    return technologies
        .filter(([, terms]) => hasAny(text, terms))
        .map(([name]) => name);
}

function detectRequirements(text: string, scale: number): string[] {
    const requirements: string[] = [];
    const checks: Array<[string, string[]]> = [
        ["Authentication", ["auth", "authentication", "login", "oauth", "identity", "user account"]],
        ["Payments", ["payment", "payments", "checkout", "billing", "stripe", "subscription"]],
        ["Real-time", ["real-time", "realtime", "websocket", "live", "presence", "messaging", "chat"]],
        ["Background processing", ["background", "async", "asynchronous", "queue", "worker", "jobs", "webhook", "notifications"]],
        ["Media processing", ["video", "image", "media", "upload", "transcoding", "streaming"]],
        ["Search", ["search", "elasticsearch", "opensearch"]],
        ["Maps / location", ["maps", "location", "geolocation", "gps", "routing"]],
        ["AI / inference", ["ai", "llm", "inference", "machine learning", "rag", "embedding"]],
        ["High availability", ["high availability", "ha", "fault tolerant", "resilient", "zero downtime"]],
    ];

    for (const [label, terms] of checks) {
        if (hasAny(text, terms)) requirements.push(label);
    }

    if (scale >= 100_000) requirements.push("Horizontal scalability");
    if (scale >= 1_000_000) requirements.push("Read scaling");
    return [...new Set(requirements)];
}

function technologyOrDefault(technologies: string[], names: string[], fallback: string): string {
    const match = names.find((name) => technologies.includes(name));
    return match ?? fallback;
}

function add(
    operations: ArchitectureTransformOperation[],
    id: string,
    label: string,
    type: ArchitectureNodeType,
    description: string,
): void {
    operations.push({ kind: "add", id, label, type, description });
}

function connect(
    operations: ArchitectureTransformOperation[],
    sourceId: string,
    targetId: string,
    label: string,
): void {
    operations.push({ kind: "connect", sourceId, targetId, label });
}

export function analyzeArchitectureIntent(rawPrompt: string): ArchitectureIntent {
    const originalPrompt = normalize(rawPrompt);
    const text = originalPrompt.toLowerCase();
    const scale = parseScale(text);
    const technologies = detectTechnologies(text);
    const requirements = detectRequirements(text, scale);
    const domain = detectDomain(text);

    const specificSignals =
        technologies.length +
        requirements.length +
        (domain !== "Application platform" ? 2 : 0);

    return {
        originalPrompt,
        domain,
        scale,
        technologies,
        requirements,
        components: [],
        confidence: specificSignals >= 4 ? "high" : specificSignals >= 2 ? "medium" : "low",
    };
}

export function buildArchitecturePlan(rawPrompt: string): ArchitecturePlan {
    const intent = analyzeArchitectureIntent(rawPrompt);
    const text = intent.originalPrompt.toLowerCase();
    const operations: ArchitectureTransformOperation[] = [];

    const frontendTechnology = technologyOrDefault(
        intent.technologies,
        ["Next.js", "React"],
        "Web App",
    );
    const backendTechnology = technologyOrDefault(
        intent.technologies,
        ["Fastify", "Express", "Node.js", "Python"],
        "Application API",
    );
    const databaseTechnology = technologyOrDefault(
        intent.technologies,
        ["PostgreSQL", "MongoDB", "MySQL"],
        "PostgreSQL",
    );

    add(
        operations,
        "intent-frontend",
        frontendTechnology,
        "frontend",
        `User-facing application inferred from the brief for the ${intent.domain.toLowerCase()}.`,
    );
    add(
        operations,
        "intent-api",
        backendTechnology,
        "backend",
        `Core application service inferred from the brief. ${intent.domain} business logic lives here.`,
    );
    add(
        operations,
        "intent-db",
        databaseTechnology,
        "database",
        "Primary durable data store selected from the requested stack or a production-safe default.",
    );

    connect(operations, "intent-frontend", "intent-api", "HTTPS / API");
    connect(operations, "intent-api", "intent-db", "Data");

    if (hasAny(text, ["auth", "authentication", "login", "oauth", "identity", "account", "secure"])) {
        add(
            operations,
            "intent-auth",
            "Auth Service",
            "auth",
            "Identity, session, and authorization boundary inferred from the requirements.",
        );
        connect(operations, "intent-api", "intent-auth", "Identity");
    }

    if (hasAny(text, ["payment", "payments", "checkout", "billing", "stripe", "subscription"])) {
        const paymentLabel = intent.technologies.includes("Stripe") ? "Stripe" : "Payment Provider";
        add(
            operations,
            "intent-payment",
            paymentLabel,
            "payment",
            "External payment and billing provider inferred from the product requirements.",
        );
        connect(operations, "intent-api", "intent-payment", "Payments");
    }

    if (hasAny(text, ["real-time", "realtime", "websocket", "websockets", "socket.io", "live", "messaging", "chat", "presence"])) {
        add(
            operations,
            "intent-realtime",
            intent.technologies.includes("WebSockets") ? "WebSocket Service" : "Realtime Service",
            "service",
            "Low-latency channel for live updates, presence, messaging, or collaborative events.",
        );
        connect(operations, "intent-api", "intent-realtime", "Realtime");
    }

    const needsMedia = hasAny(text, ["video", "streaming", "media", "transcoding", "image upload", "file upload"]);
    if (needsMedia) {
        add(
            operations,
            "intent-media",
            "Object Storage",
            "external",
            "Durable object storage for user-generated media and large files.",
        );
        connect(operations, "intent-api", "intent-media", "Upload");
    }

    if (hasAny(text, ["search", "elasticsearch", "opensearch"])) {
        add(
            operations,
            "intent-search",
            "Search Service",
            "service",
            "Dedicated search boundary inferred from explicit search requirements.",
        );
        connect(operations, "intent-api", "intent-search", "Search");
    }

    if (hasAny(text, ["maps", "location", "geolocation", "gps", "routing"])) {
        add(
            operations,
            "intent-maps",
            "Maps Provider",
            "external",
            "External mapping and geolocation provider inferred from location requirements.",
        );
        connect(operations, "intent-api", "intent-maps", "Location");
    }

    if (hasAny(text, ["ai", "llm", "inference", "machine learning", "rag", "embedding", "copilot", "chatbot"])) {
        add(
            operations,
            "intent-ai",
            intent.technologies.includes("OpenAI") ? "AI / OpenAI" : "AI Inference Service",
            "service",
            "Model inference boundary inferred from the AI requirements.",
        );
        connect(operations, "intent-api", "intent-ai", "Inference");

        if (hasAny(text, ["rag", "embedding", "vector"])) {
            add(
                operations,
                "intent-vector",
                "Vector Store",
                "database",
                "Vector index for retrieval-augmented generation and semantic search.",
            );
            connect(operations, "intent-ai", "intent-vector", "Embeddings");
        }
    }

    const needsBackground =
        hasAny(text, ["background", "async", "asynchronous", "queue", "worker", "jobs", "webhook", "notifications", "processing"]) ||
        intent.scale >= 100_000;

    if (needsBackground) {
        add(
            operations,
            "intent-queue",
            intent.technologies.includes("Kafka") ? "Kafka" : "Job Queue",
            "queue",
            "Durable asynchronous buffer inferred from background-processing or scale requirements.",
        );
        add(
            operations,
            "intent-worker",
            "Worker Pool",
            "worker",
            "Horizontally scalable workers for jobs that should not block synchronous API requests.",
        );
        connect(operations, "intent-api", "intent-queue", "Enqueue");
        connect(operations, "intent-queue", "intent-worker", "Consume");
    }

    const needsCache =
        hasAny(text, ["cache", "redis", "performance", "low latency", "rate limit", "high traffic"]) ||
        intent.scale >= 100_000;

    if (needsCache) {
        add(
            operations,
            "intent-cache",
            intent.technologies.includes("Redis") ? "Redis" : "Redis Cache",
            "cache",
            "Low-latency cache for hot reads, sessions, and rate-limit state.",
        );
        // Intentionally leave the cache unconnected until the audit/fix phase.
        // This makes the reasoning loop visible without fabricating an agent action.
    }

    const componentIds = operations
        .filter((operation): operation is Extract<ArchitectureTransformOperation, { kind: "add" }> => operation.kind === "add")
        .map((operation) => operation.id);

    intent.components = componentIds;
    return {
        intent,
        operations,
        primaryCodeNodeId: "intent-api",
    };
}

export function buildScalePlanOperations(
    plan: ArchitecturePlan,
): ArchitectureTransformOperation[] {
    const operations: ArchitectureTransformOperation[] = [];
    const intent = plan.intent;

    if (intent.scale >= 100_000) {
        operations.push({
            kind: "add",
            id: "scale-gateway",
            label: "API Gateway",
            type: "gateway",
            description: "Traffic entrypoint for routing, throttling, and horizontally scaled application instances.",
        });
        operations.push({
            kind: "disconnect",
            sourceId: "intent-frontend",
            targetId: "intent-api",
        });
        operations.push({
            kind: "connect",
            sourceId: "intent-frontend",
            targetId: "scale-gateway",
            label: "HTTPS",
        });
        operations.push({
            kind: "connect",
            sourceId: "scale-gateway",
            targetId: "intent-api",
            label: "Internal API",
        });
    }

    if (intent.scale >= 1_000_000) {
        const databaseLabel = intent.technologies.includes("MongoDB")
            ? "MongoDB Secondary"
            : intent.technologies.includes("MySQL")
                ? "MySQL Read Replica"
                : intent.technologies.includes("PostgreSQL")
                    ? "PostgreSQL Read Replica"
                    : "Database Read Replica";
        const replicaId = intent.technologies.includes("MongoDB") ? "scale-secondary" : "scale-replica";

        operations.push({
            kind: "add",
            id: replicaId,
            label: databaseLabel,
            type: "database",
            description: "Read-scaling replica/secondary matched to the selected primary data-store technology.",
        });
        operations.push({
            kind: "connect",
            sourceId: "intent-api",
            targetId: replicaId,
            label: "Read queries",
        });
    }

    return operations;
}
