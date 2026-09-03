import type { ProductionQAReport } from "./productionQA";
import type { ExecutionLoopResult } from "./execution";
import type { DigitalTwinReport } from "./digitalTwin";

export type WowStageId =
    | "brief"
    | "reason"
    | "architect"
    | "break"
    | "diagnose"
    | "heal"
    | "retest"
    | "build"
    | "execute"
    | "qa"
    | "verdict";

export type WowStageStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export interface WowStage {
    id: WowStageId;
    label: string;
    status: WowStageStatus;
    detail: string;
    durationMs: number;
}

export interface WowScorecard {
    before: number;
    after: number;
    improvement: number;
    survivabilityBefore: number;
    survivabilityAfter: number;
    recoveryDelta: number;
    qaScore: number;
}

export interface FinalWowRun {
    id: string;
    startedAt: number;
    finishedAt: number;
    status: "running" | "completed" | "failed" | "blocked";
    targetUsers: number;
    stages: WowStage[];
    scorecard: WowScorecard;
    twinBefore: DigitalTwinReport | null;
    twinAfter: DigitalTwinReport | null;
    execution: ExecutionLoopResult | null;
    qa: ProductionQAReport | null;
    headline: string;
    pitch: string[];
}
