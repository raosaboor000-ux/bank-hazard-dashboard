"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Home" },
  { href: "/portfolio", label: "Asset Addition" },
  { href: "/analytics", label: "Analytics" },
];

export function TopNav() {
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
    <div className="flex justify-end">
      <nav className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/35 p-2 backdrop-blur-md dark:border-white/10 dark:bg-white/10">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200",
              pathname === link.href
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:bg-white/45 hover:text-foreground dark:hover:bg-white/10",
            )}
          >
            {link.label}
          </Link>
        ))}
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label="Toggle theme"
          onClick={toggleTheme}
          className="size-9 rounded-xl border-white/25 bg-white/45 text-muted-foreground transition-all duration-200 hover:bg-white/70 hover:text-foreground dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/15"
        >
          <Moon className="size-4" />
        </Button>
      </nav>
    </div>
  );
}
