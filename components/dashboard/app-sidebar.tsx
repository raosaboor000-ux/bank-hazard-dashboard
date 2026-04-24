"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Moon, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/portfolio", label: "Asset Portfolio Manager" },
  { href: "/risk-analysis", label: "Risk Change Analysis" },
  { href: "/hazard-matrix", label: "Hazard Matrix" },
  { href: "/var-analysis", label: "Physical VaR" },
  { href: "/scenario-strategy", label: "Scenario & Strategy" },
];

export function AppSidebar() {
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      document.documentElement.classList.add("dark");
    } else if (stored === "light") {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
    root.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <aside className="glass-panel sticky top-4 m-4 flex h-[calc(100vh-2rem)] w-72 flex-col rounded-3xl border">
      <div className="border-b border-white/15 p-6 dark:border-white/10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="rounded-xl bg-primary p-2 text-primary-foreground shadow-md transition-opacity hover:opacity-85">
            <ShieldCheck className="size-5" />
          </Link>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Askari Bank</p>
            <h1 className="text-sm font-semibold">Climate Risk Command Center</h1>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1.5 p-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "block rounded-xl px-3.5 py-2.5 text-sm transition-all duration-300 hover:bg-white/40 hover:shadow-sm dark:hover:bg-white/10",
              pathname === link.href
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-white/15 p-4 dark:border-white/10">
        <Button
          variant="outline"
          className="w-full justify-start gap-2 rounded-xl border-white/25 bg-white/45 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/70 dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/15"
          onClick={toggleTheme}
        >
          <Moon className="size-4" />
          Toggle Theme
        </Button>
      </div>
    </aside>
  );
}
