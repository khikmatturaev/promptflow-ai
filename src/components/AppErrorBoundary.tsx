import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
    children: ReactNode;
}

interface AppErrorBoundaryState {
    hasError: boolean;
    message: string;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
    state: AppErrorBoundaryState = {
        hasError: false,
        message: "",
    };

    static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
        return {
            hasError: true,
            message: error instanceof Error ? error.message : "An unexpected application error occurred.",
        };
    }

    componentDidCatch(error: unknown, info: ErrorInfo): void {
        console.error("PromptFlow application error:", error, info);
    }

    private handleReset = (): void => {
        this.setState({ hasError: false, message: "" });
        window.location.reload();
    };

    render(): ReactNode {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <main className="flex min-h-screen items-center justify-center bg-[#050608] px-6 text-white">
                <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0b0d11] p-6 shadow-2xl">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/5 text-red-300">
                        !
                    </div>
                    <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
                        PromptFlow recovery
                    </p>
                    <h1 className="mt-2 text-xl font-semibold tracking-tight text-white">
                        The canvas hit an unexpected error.
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-white/45">
                        Reload the workspace and retry the last agent action. Your current session is kept in memory until the page is refreshed.
                    </p>
                    <code className="mt-4 block max-h-24 overflow-auto rounded-xl border border-white/8 bg-black/20 p-3 text-xs text-white/35">
                        {this.state.message}
                    </code>
                    <button
                        type="button"
                        onClick={this.handleReset}
                        className="mt-5 rounded-xl bg-[#d9ff4f] px-4 py-2.5 text-xs font-semibold text-[#08090c] transition hover:brightness-105"
                    >
                        Reload PromptFlow
                    </button>
                </section>
            </main>
        );
    }
}
