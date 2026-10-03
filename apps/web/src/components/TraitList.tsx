import { CheckCircle2, CircleDashed } from "lucide-react";
import type { Trait } from "@dating/shared";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function TraitList({ traits }: { traits: Trait[] }) {
  return (
    <ul className="grid gap-3">
      {traits.map((t) => (
        <li key={t.label} className="rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <h4 className="font-medium">{t.label}</h4>
            {t.evidence.length > 0 && (
              <Popover>
                <PopoverTrigger className="shrink-0 rounded-full border px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground">
                  {t.evidence.filter((e) => e.verified).length}/{t.evidence.length} sources
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <ul className="grid gap-3">
                    {t.evidence.map((e, i) => (
                      <li key={i} className="text-sm">
                        <div className="mb-1 flex items-center gap-1.5 font-mono text-[11px] uppercase text-muted-foreground">
                          {e.verified ? <CheckCircle2 className="size-3 text-success" /> : <CircleDashed className="size-3" />}
                          {e.source} · {e.verified ? "verbatim" : "paraphrase"}
                        </div>
                        <q className="italic">{e.quote}</q>
                      </li>
                    ))}
                  </ul>
                </PopoverContent>
              </Popover>
            )}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.detail}</p>
        </li>
      ))}
    </ul>
  );
}
