import { motion } from "motion/react";
import { useState } from "react";
import { Check } from "lucide-react";
import type { AnalysisStep, AnalysisTraceStep } from "@dating/shared";
import { cn } from "@/lib/utils";

export const STEPS: { step: AnalysisStep; title: string }[] = [
  { step: "linkedin", title: "Reading LinkedIn" },
  { step: "instagram", title: "Reading Instagram" },
  { step: "synthesis", title: "Building the persona" },
  { step: "evidence", title: "Checking evidence against sources" },
];

export function AnalysisTimeline({ trace, running }: { trace: Partial<Record<AnalysisStep, AnalysisTraceStep | "running">>; running: boolean }) {
  return (
    <ol className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {STEPS.map(({ step, title }) => {
        const s = trace[step];
        const done = s && s !== "running";
        const active = s === "running";
        return (
          <motion.li
            key={step}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: s || !running ? 1 : 0.45, y: 0 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="rounded-xl border bg-card p-4"
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-full border text-[10px]",
                  done && "border-success bg-success text-background",
                  active && "border-live",
                )}
              >
                {done ? <Check className="size-3" /> : active ? <span className="size-2 animate-pulse rounded-full bg-live" /> : null}
              </span>
              <span className="font-medium">{title}</span>
              {done && <span className="ml-auto font-mono text-[11px] text-muted-foreground">{(s.ms / 1000).toFixed(1)}s</span>}
            </div>
            {done && step !== "synthesis" && <Notes text={s.notes} />}
          </motion.li>
        );
      })}
    </ol>
  );
}

const clean = (t: string) => t.replace(/\*\*/g, "").replace(/^#+\s*/gm, "").replace(/^\s*[-*]\s+/gm, "· ").trim();

function Notes({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 pl-7">
      <p className={cn("whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground", !open && "line-clamp-6")}>{clean(text)}</p>
      <button onClick={() => setOpen((o) => !o)} className="mt-1 text-xs text-foreground underline-offset-4 hover:underline">
        {open ? "Show less" : "Read the agent's notes"}
      </button>
    </motion.div>
  );
}
