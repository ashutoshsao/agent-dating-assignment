import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import type { RankingDTO } from "@dating/shared";
import { api } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { RankList } from "@/components/RankList";
import { ScoreRing } from "@/components/ScoreRing";
import { cn } from "@/lib/utils";

export default function Rankings() {
  const [params, setParams] = useSearchParams();
  const { data, isLoading } = useQuery({ queryKey: ["rankings"], queryFn: () => api<RankingDTO[]>("/api/rankings"), refetchInterval: 10000 });
  const selectedId = params.get("p") ?? data?.[0]?.person.id;
  const selected = data?.find((r) => r.person.id === selectedId);

  // Best couples: unique pairs by mutual
  const couples = new Map<string, { a: RankingDTO["person"]; b: RankingDTO["matches"][number] }>();
  data?.forEach((r) =>
    r.matches.filter((m) => m.dated).forEach((m) => {
      const key = [r.person.id, m.other.id].sort().join(":");
      if (!couples.has(key)) couples.set(key, { a: r.person, b: m });
    }),
  );
  const best = [...couples.values()].sort((x, y) => y.b.mutual! - x.b.mutual!).slice(0, 5);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24">
      <section className="py-12">
        <h1 className="font-serif text-5xl leading-none">Rankings</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">Who fits each person best, ranked by how both agents scored the date they actually went on.</p>
      </section>

      {isLoading ? (
        <div className="h-60 animate-pulse rounded-xl bg-muted" />
      ) : !data?.length ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">No rankings yet — analyze some people and run a dating round.</p>
      ) : (
        <>
          {best.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-3 font-mono text-xs uppercase tracking-wide text-muted-foreground">Best couples</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {best.map(({ a, b }) => (
                  <Link key={b.dateId} to={`/dates/${b.dateId}`} className="flex items-center gap-3 rounded-xl border bg-card p-3 hover:border-foreground/30 lg:flex-col lg:items-start">
                    <div className="flex -space-x-3">
                      <Avatar seed={a.avatarSeed} name={a.name} className="size-10 ring-2 ring-card" />
                      <Avatar seed={b.other.avatarSeed} name={b.other.name} className="size-10 ring-2 ring-card" />
                    </div>
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="truncate font-medium">{a.name.split(" ")[0]} & {b.other.name.split(" ")[0]}</div>
                    </div>
                    <ScoreRing value={b.mutual!} size={40} />
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
            <nav className="grid content-start gap-1 md:sticky md:top-20 md:max-h-[calc(100dvh-6rem)] md:overflow-y-auto">
              {data.map((r) => (
                <button
                  key={r.person.id}
                  onClick={() => setParams({ p: r.person.id }, { replace: true })}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors duration-150",
                    r.person.id === selectedId ? "bg-foreground text-background" : "hover:bg-muted",
                  )}
                >
                  <Avatar seed={r.person.avatarSeed} name={r.person.name} className="size-7" />
                  <span className="truncate">{r.person.name}</span>
                </button>
              ))}
            </nav>
            {selected && (
              <section>
                <div className="mb-4 flex items-center gap-3">
                  <Avatar seed={selected.person.avatarSeed} name={selected.person.name} className="size-12" />
                  <div>
                    <h2 className="font-serif text-3xl leading-none">
                      <Link to={`/people/${selected.person.id}`} className="hover:underline">{selected.person.name}</Link>
                    </h2>
                    <p className="text-sm text-muted-foreground">{selected.matches.filter((m) => m.dated).length} dates · best fits first</p>
                  </div>
                </div>
                <RankList personId={selected.person.id} rows={selected.matches} />
              </section>
            )}
          </div>
        </>
      )}
    </main>
  );
}
