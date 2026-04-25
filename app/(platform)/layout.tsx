import { BranchStoreProvider } from "@/components/dashboard/branch-store";
import { ScenarioProvider } from "@/components/dashboard/scenario-context";
import { TopNav } from "@/components/dashboard/top-nav";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <BranchStoreProvider>
      <ScenarioProvider>
        <div className="relative min-h-screen overflow-hidden">
          <div className="pointer-events-none absolute -left-32 -top-24 h-80 w-80 rounded-full bg-chart-1/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-0 h-96 w-96 rounded-full bg-chart-2/25 blur-3xl" />
          <main className="relative z-10 p-6 md:p-8">
            <TopNav />
            <div className="pt-4">{children}</div>
          </main>
        </div>
      </ScenarioProvider>
    </BranchStoreProvider>
  );
}
