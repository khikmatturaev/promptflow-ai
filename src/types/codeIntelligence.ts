export type CodeReviewSeverity = "critical" | "warning" | "info";

export interface CodeReviewFinding {
    id: string;
    severity: CodeReviewSeverity;
    title: string;
    message: string;
    paths: string[];
}

export interface ProjectCodeReview {
    reviewedAt: number;
    score: number;
    productionReady: boolean;
    findings: CodeReviewFinding[];
    strengths: string[];
    nextActions: string[];
}
