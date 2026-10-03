import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Link, useParams } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Brain, MapPin, RotateCcw } from "lucide-react";
import type { DateDTO, DatePersonDTO, DebriefDTO, TurnDTO } from "@dating/shared";
import { api } from "@/lib/api";
import { useDateStream } from "@/lib/useDateStream";
import { Avatar } from "@/components/Avatar";
import { ScoreRing } from "@/components/ScoreRing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const enter = { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.18, ease: [0.23, 1, 0.32, 1] as const } };

function Meter({ person, value, side }: { person: DatePersonDTO; value: number | null; side: "left" | "right" }) {
  return (
    <div className={cn("flex items-center gap-3", side === "right" && "flex-row-reverse text-right")}>
      <Avatar seed={person.avatarSeed} name={person.name} className="size-14" />
      <div className="min-w-0">
        <Link to={`/people/${person.id}`} className="block truncate font-medium hover:underline">{person.name}'s agent</Link>
        <div className={cn("mt-1.5 flex items-center gap-2", side === "right" && "flex-row-reverse")}>
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
            <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${(value ?? 0) * 10}%` }} transition={{ duration: 0.4 }} />
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">interest {value ?? "–"}/10</span>
        </div>
      </div>
    </div>
  );
}

function Bubble({ turn, person, side }: { turn: TurnDTO; person: DatePersonDTO; side: "left" | "right" }) {
  return (
    <motion.div {...enter} className={cn("flex gap-3", side === "right" && "flex-row-reverse")}>
      <Avatar seed={person.avatarSeed} name={person.name} className="mt-1 size-8" />
      <div className={cn("grid max-w-[78%] gap-1.5", side === "right" && "justify-items-end")}>
        <div className={cn("rounded-2xl px-4 py-2.5 leading-relaxed", side === "left" ? "rounded-tl-sm bg-card border" : "rounded-tr-sm bg-primary text-primary-foreground")}>
          {turn.message}
        </div>
        {turn.thought && (
          <details className={cn("group max-w-full text-xs text-muted-foreground", side === "right" && "text-right")}>
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 font-mono hover:text-foreground">
              <Brain className="size-3" /> agent thinking · interest {turn.interest}/10
            </summary>
            <p className="mt-1 italic leading-relaxed">{turn.thought}</p>
          </details>
        )}
      </div>
    </motion.div>
  );
}

function DebriefCard({ d, person }: { d: DebriefDTO; person: DatePersonDTO }) {
  const x = d.data;
  return (
    <motion.div {...enter} className="grid gap-4 rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-3">
        <Avatar seed={person.avatarSeed} name={person.name} className="size-10" />
        <div className="flex-1">
          <div className="font-mono text-[11px] uppercase text-muted-foreground">Private report to {person.name.split(" ")[0]}</div>
          <div className="font-medium">{x.wouldSeeAgain ? "Would see again" : "Wouldn't see again"}</div>
        </div>
        <span className="font-serif text-4xl">{x.score}<span className="text-lg text-muted-foreground">/10</span></span>
      </div>
      <p className="font-serif text-lg leading-snug">“{x.reportToPerson}”</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ["Chemistry", x.chemistry],
          ["Values", x.valuesAlignment],
          ["Lifestyle", x.lifestyleFit],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-muted py-2">
            <div className="font-mono text-sm">{v}</div>
            <div className="text-[11px] text-muted-foreground">{k}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <div className="mb-1 font-mono text-[11px] uppercase text-success">Highlights</div>
          <ul className="grid gap-1">{x.highlights.map((h) => <li key={h}>· {h}</li>)}</ul>
        </div>
        <div>
          <div className="mb-1 font-mono text-[11px] uppercase text-destructive">Concerns</div>
          <ul className="grid gap-1">{x.concerns.map((h) => <li key={h}>· {h}</li>)}</ul>
        </div>
      </div>
    </motion.div>
  );
}

export default function DateView() {
  const { id } = useParams<{ id: string }>();
  const { data: d, refetch } = useQuery({
    queryKey: ["date", id],
    queryFn: () => api<DateDTO>(`/api/dates/${id}`),
    // SSE carries live updates; polling is a fallback for dates run by another process (batch script)
    refetchInterval: (q) => (q.state.data?.status === "live" || q.state.data?.status === "scheduled" ? 4000 : false),
  });
  const typing = useDateStream(id, !!d);
  const bottom = useRef<HTMLDivElement>(null);
  const rerun = useMutation({ mutationFn: () => api(`/api/dates/${id}/rerun`, { method: "POST" }), onSuccess: () => refetch() });

  const turns = d?.turns ?? [];
  useEffect(() => {
    if (d?.status === "live") bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, d?.debriefs?.length, typing, d?.status]);

  if (!d) return <div className="mx-auto max-w-3xl px-4 py-12"><div className="h-60 animate-pulse rounded-2xl bg-muted" /></div>;

  const sideOf = (pid: string | null) => (pid === d.a.id ? "left" : "right");
  const lastInterest = (pid: string) => [...turns].reverse().find((t) => t.speakerId === pid)?.interest ?? null;
  const typingName = typing === null ? "The scene" : typing === d.a.id ? d.a.name : typing === d.b.id ? d.b.name : null;

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24">
      <Link to="/dates" className="mt-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All dates
      </Link>

      <header className="sticky top-14 z-10 -mx-4 mt-4 border-b bg-background/90 px-4 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <Meter person={d.a} value={lastInterest(d.a.id)} side="left" />
          {d.status === "done" && d.mutual != null ? (
            <ScoreRing value={d.mutual} size={52} />
          ) : d.status === "live" ? (
            <span className="flex items-center gap-1.5 font-mono text-xs text-live"><span className="size-2 animate-pulse rounded-full bg-live" />live</span>
          ) : (
            <span className="font-mono text-xs text-muted-foreground">{d.status}</span>
          )}
          <Meter person={d.b} value={lastInterest(d.b.id)} side="right" />
        </div>
      </header>

      {d.venue && (
        <motion.section {...enter} className="mt-6 rounded-2xl border bg-accent p-5 text-accent-foreground">
          <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase opacity-70"><MapPin className="size-3" /> The matchmaker picked</div>
          <h1 className="mt-1 font-serif text-3xl leading-tight">{d.venue.venue}</h1>
          <p className="mt-2 text-sm opacity-90">{d.venue.setting}</p>
          <p className="mt-2 text-xs opacity-70">Why: {d.venue.why}</p>
        </motion.section>
      )}

      <section className="mt-6 grid gap-5">
        {turns.map((t) =>
          t.speakerId === null ? (
            <motion.p key={t.idx} {...enter} className="mx-auto max-w-md text-center font-serif text-lg italic text-muted-foreground">
              {t.message}
            </motion.p>
          ) : (
            <Bubble key={t.idx} turn={t} person={t.speakerId === d.a.id ? d.a : d.b} side={sideOf(t.speakerId)} />
          ),
        )}
        <AnimatePresence>
          {d.status === "live" && typingName && (
            <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-live" /> {typingName === "The scene" ? "something happens…" : `${typingName}'s agent is thinking…`}
            </motion.div>
          )}
        </AnimatePresence>
        {d.status === "live" && !d.venue && <p className="font-mono text-xs text-muted-foreground">The matchmaker is choosing a venue…</p>}
      </section>

      {(d.debriefs?.length ?? 0) > 0 && (
        <section className="mt-12 grid gap-4">
          <h2 className="font-serif text-3xl">After the date</h2>
          <p className="-mt-2 text-sm text-muted-foreground">Each agent reports privately to its person. Mutual fit is the geometric mean of both scores.</p>
          <div className="grid gap-4">
            {d.debriefs!.map((x) => (
              <DebriefCard key={x.personId} d={x} person={x.personId === d.a.id ? d.a : d.b} />
            ))}
          </div>
        </section>
      )}

      {d.owned && (d.status === "done" || d.status === "error") && (
        <div className="mt-8 flex justify-center">
          <Button variant="outline" className="rounded-full" onClick={() => rerun.mutate()}>
            <RotateCcw className="size-4" /> Send them on this date again
          </Button>
        </div>
      )}
      {d.status === "scheduled" && <p className="mt-8 text-center text-sm text-muted-foreground">This date is queued — it starts when a table frees up.</p>}
      <div ref={bottom} />
    </main>
  );
}
