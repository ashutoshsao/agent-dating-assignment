import { Link } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Send } from "lucide-react";
import { toast } from "sonner";
import type { RankRow } from "@dating/shared";
import { api } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { ScoreRing } from "@/components/ScoreRing";

function SendButton({ aId, bId }: { aId: string; bId: string }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => api<{ id: string }>("/api/dates", { method: "POST", body: JSON.stringify({ aId, bId }) }),
    onSuccess: () => {
      toast.success("They're on their way to the date");
      qc.invalidateQueries({ queryKey: ["rankings"] });
      qc.invalidateQueries({ queryKey: ["dates"] });
    },
  });
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        m.mutate();
      }}
      disabled={m.isPending}
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors hover:border-foreground/30 disabled:opacity-50"
    >
      <Send className="size-3" /> Send on date
    </button>
  );
}

export function RankList({ personId, rows, compact }: { personId: string; rows: RankRow[]; compact?: boolean }) {
  return (
    <ol className="grid gap-2">
      {rows.map((r) => {
        const both = r.iWouldSeeAgain && r.theyWouldSeeAgain;
        const inner = (
          <>
            <span className="w-6 shrink-0 text-right font-mono text-sm text-muted-foreground">{r.rank}</span>
            <Avatar seed={r.other.avatarSeed} name={r.other.name} className="size-10" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{r.other.name}</span>
                {both && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] text-accent-foreground">
                    <Heart className="size-3 fill-current" /> mutual
                  </span>
                )}
              </div>
              {r.dated ? (
                <>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    you {r.myScore}/10 · them {r.theirScore}/10 · {r.iWouldSeeAgain ? "you'd go again" : "you'd pass"}
                  </div>
                  {!compact && r.report && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.report}</p>}
                </>
              ) : (
                <div className="font-mono text-[11px] text-muted-foreground">
                  {r.dateStatus === "live" || r.dateStatus === "scheduled" ? "on a date right now…" : `not dated yet · estimated fit ${r.estimate}`}
                </div>
              )}
            </div>
            {r.dated ? (
              <ScoreRing value={r.mutual!} size={44} />
            ) : r.dateStatus !== "live" && r.dateStatus !== "scheduled" ? (
              <SendButton aId={personId} bId={r.other.id} />
            ) : null}
          </>
        );
        const cls = "flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors duration-150";
        return (
          <li key={r.other.id}>
            {r.dateId && r.dated ? (
              <Link to={`/dates/${r.dateId}`} className={`${cls} hover:border-foreground/30`}>{inner}</Link>
            ) : (
              <div className={`${cls} ${r.dated ? "" : "opacity-80"}`}>{inner}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
