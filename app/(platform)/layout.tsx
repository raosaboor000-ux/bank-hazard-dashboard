import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { BranchStoreProvider } from "@/components/dashboard/branch-store";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <BranchStoreProvider>
      <div className="relative flex min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute -left-32 -top-24 h-80 w-80 rounded-full bg-chart-1/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-0 h-96 w-96 rounded-full bg-chart-2/25 blur-3xl" />
        <AppSidebar />
        <main className="relative z-10 flex-1 p-6 md:p-8">{children}</main>
      </div>
    </BranchStoreProvider>
  );
}
