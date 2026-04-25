"use client";

import { cn } from "@/lib/utils";

type RiskGaugeProps = {
  /** 0–100 */
  score: number;
  className?: string;
};

/**
 * Risk strip with a needle/indicator (matches reference HTML behaviour).
 */
export function RiskGauge({ score, className }: RiskGaugeProps) {
  const clamped = Math.min(100, Math.max(0, score));
  const pct = `${clamped}%`;

  return (
    <div className={cn("w-full", className)}>
      <div className="relative w-full">
        <div
          className="h-3 w-full overflow-hidden rounded-full"
          style={{
            background: "linear-gradient(90deg, #16a34a 0%, #ca8a04 25%, #ea580c 50%, #dc2626 75%, #991b1b 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute top-1/2 z-10 -ml-0.5 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
          style={{ left: pct }}
          aria-hidden
        >
          <div className="h-5 w-0.5 rounded-sm bg-foreground shadow-sm ring-1 ring-white/80 dark:ring-slate-900" />
          <div className="mt-[-2px] size-2.5 rounded-full border-2 border-white bg-foreground shadow dark:border-slate-900" />
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground sm:text-xs">
        <span>0</span>
        <span>20</span>
        <span>40</span>
        <span>60</span>
        <span>80</span>
        <span>100</span>
      </div>
    </div>
  );
}
