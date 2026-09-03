import { ArchitectureCanvas } from "./components/ArchitectureCanvas";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { WebMCPRegistry } from "./webmcp/WebMCPRegistryComponent";
import { WebMCPStatusBadge } from "./components/WebMCPStatusBadge";

function App() {
  return (
    <AppErrorBoundary>
      <main className="pf-app-shell bg-[#050608] px-3 py-2.5 text-white sm:px-5 sm:py-3 lg:px-8">
        <WebMCPRegistry />
        <div className="mx-auto flex h-full min-h-0 max-w-[1440px] flex-col">
          <header className="pf-app-header flex shrink-0 items-center justify-between gap-4 px-1 py-2.5 sm:py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#d9ff4f] text-sm font-black text-[#08090c]">
                PF
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold tracking-tight text-white">
                  PromptFlow.ai
                </div>
                <div className="truncate text-[10px] uppercase tracking-[0.16em] text-white/30">
                  AI Software Architect
                </div>
              </div>
            </div>

            <div className="hidden max-w-[520px] rounded-full border border-white/10 bg-white/2.5 px-3 py-1.5 text-center text-[10px] font-medium uppercase tracking-[0.12em] text-white/35 md:block">
              Describe it. Watch it architect. Build it.
            </div>

            <WebMCPStatusBadge />
          </header>

          <section className="pf-canvas-section min-h-0 flex-1 pb-1 sm:pb-2">
            <ArchitectureCanvas />
          </section>
        </div>
      </main>
    </AppErrorBoundary>
  );
}

export default App;
