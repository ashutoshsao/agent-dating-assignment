import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { HeartHandshake } from "lucide-react";
import type { DateDTO } from "@dating/shared";
import { api } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { ScoreRing } from "@/components/ScoreRing";

function DateCard({ d }: { d: DateDTO }) {
  return (
    <Link to={`/dates/${d.id}`} className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors duration-150 hover:border-foreground/30">
      <div className="flex -space-x-3">
        <Avatar seed={d.a.avatarSeed} name={d.a.name} className="size-11 ring-2 ring-card" />
        <Avatar seed={d.b.avatarSeed} name={d.b.name} className="size-11 ring-2 ring-card" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">
          {d.a.name} <span className="text-muted-foreground">×</span> {d.b.name}
        </div>
        <div className="truncate text-sm text-muted-foreground">{d.venue?.venue ?? (d.status === "scheduled" ? "Waiting for a table…" : "Choosing a venue…")}</div>
      </div>
      {d.status === "done" && d.mutual != null ? (
        <ScoreRing value={d.mutual} size={44} />
      ) : d.status === "live" ? (
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-live">
          <span className="size-2 animate-pulse rounded-full bg-live" /> live
        </span>
      ) : (
        <span className="font-mono text-[11px] text-muted-foreground">{d.status}</span>
      )}
    </Link>
  );
}

export default function Dates() {
  const { data: dates, isLoading } = useQuery({
    queryKey: ["dates"],
    queryFn: () => api<DateDTO[]>("/api/dates"),
    refetchInterval: (q) => (q.state.data?.some((d) => d.status === "live" || d.status === "scheduled") ? 2500 : false),
  });

  const live = dates?.filter((d) => d.status === "live") ?? [];
  const done = dates?.filter((d) => d.status === "done").sort((a, b) => (b.mutual ?? 0) - (a.mutual ?? 0)) ?? [];
  const waiting = dates?.filter((d) => d.status === "scheduled" || d.status === "error") ?? [];

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24">
      <section className="flex flex-col gap-4 py-12 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-5xl leading-none">Date night</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Each agent dates its person's best-fit matches. They talk, think privately, and report back.
          </p>
        </div>
        <Link to="/" className="inline-flex items-center gap-2 self-start rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground sm:self-auto">
          <HeartHandshake className="size-4" /> Add someone & send them on dates
        </Link>
      </section>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      ) : !dates?.length ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">No dates yet. Add someone on the home page and send them on dates from their profile.</p>
      ) : (
        <div className="grid gap-10">
          {live.length > 0 && (
            <section className="grid gap-3">
              <h2 className="font-mono text-xs uppercase tracking-wide text-live">Happening now · {live.length}</h2>
              <div className="grid gap-3 md:grid-cols-2">{live.map((d) => <DateCard key={d.id} d={d} />)}</div>
            </section>
          )}
          {done.length > 0 && (
            <section className="grid gap-3">
              <h2 className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Finished · {done.length}</h2>
              <div className="grid gap-3 md:grid-cols-2">{done.map((d) => <DateCard key={d.id} d={d} />)}</div>
            </section>
          )}
          {waiting.length > 0 && (
            <section className="grid gap-3">
              <h2 className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Up next · {waiting.length}</h2>
              <div className="grid gap-3 md:grid-cols-2">{waiting.map((d) => <DateCard key={d.id} d={d} />)}</div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
