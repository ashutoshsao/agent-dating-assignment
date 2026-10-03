import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { ArrowLeft, ExternalLink, RefreshCw, Sparkles } from "lucide-react";
import type { AnalysisEvent, AnalysisStep, AnalysisTraceStep, Persona, PersonDTO } from "@dating/shared";
import { api, streamSse } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { AnalysisTimeline } from "@/components/AnalysisTimeline";
import { TraitList } from "@/components/TraitList";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type TraceState = Partial<Record<AnalysisStep, AnalysisTraceStep | "running">>;

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: string }) {
  return (
    <section className="grid gap-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-serif text-2xl">{title}</h3>
        {aside && <span className="font-mono text-[11px] text-muted-foreground">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function BigFive({ scores }: { scores: Persona["personality"]["bigFive"] }) {
  return (
    <div className="grid gap-2.5 rounded-xl border bg-card p-4">
      {Object.entries(scores).map(([k, v]) => (
        <div key={k} className="grid grid-cols-[9rem_1fr_2rem] items-center gap-3 text-sm">
          <span className="capitalize text-muted-foreground">{k}</span>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${v}%` }} />
          </div>
          <span className="text-right font-mono text-xs">{v}</span>
        </div>
      ))}
    </div>
  );
}

function Pills({ items, tone = "default" }: { items: string[]; tone?: "default" | "warn" }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((i) => (
        <li key={i} className={tone === "warn" ? "rounded-full border border-destructive/30 px-3 py-1 text-sm text-destructive" : "rounded-full bg-secondary px-3 py-1 text-sm"}>
          {i}
        </li>
      ))}
    </ul>
  );
}

function PersonaView({ persona }: { persona: Persona }) {
  return (
    <div className="grid gap-10">
      <Section title="Needs" aside="what they need from a partner">
        <TraitList traits={persona.needs} />
      </Section>
      <div className="grid gap-10 md:grid-cols-2">
        <Section title="Hobbies">
          <TraitList traits={persona.hobbies} />
        </Section>
        <Section title="Interests">
          <TraitList traits={persona.interests} />
        </Section>
      </div>
      <Section title="Values">
        <TraitList traits={persona.values} />
      </Section>
      <Section title="Personality">
        <div className="grid gap-4 md:grid-cols-2">
          <BigFive scores={persona.personality.bigFive} />
          <div className="grid gap-3 rounded-xl border bg-card p-4 text-sm">
            <div>
              <div className="font-mono text-[11px] uppercase text-muted-foreground">Communication</div>
              <p className="mt-1">{persona.personality.communicationStyle}</p>
            </div>
            <div>
              <div className="font-mono text-[11px] uppercase text-muted-foreground">Humor</div>
              <p className="mt-1">{persona.personality.humor}</p>
            </div>
            <div>
              <div className="font-mono text-[11px] uppercase text-muted-foreground">Lifestyle</div>
              <p className="mt-1">
                {persona.lifestyle.socialEnergy} · {persona.lifestyle.pace} · {persona.lifestyle.workLifeBalance}
              </p>
            </div>
          </div>
        </div>
        <TraitList traits={persona.personality.traits} />
      </Section>
      <div className="grid gap-10 md:grid-cols-2">
        <Section title="Looking for">
          <Pills items={persona.lookingFor} />
        </Section>
        <Section title="Dealbreakers">
          <Pills items={persona.dealbreakers} tone="warn" />
        </Section>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <div className="font-mono text-[11px] uppercase text-muted-foreground">Ideal first date</div>
          <p className="mt-2 font-serif text-xl leading-snug">{persona.idealFirstDate}</p>
        </div>
        <div className="rounded-xl border bg-accent p-5 text-accent-foreground">
          <div className="font-mono text-[11px] uppercase opacity-70">How their agent talks</div>
          <p className="mt-2 font-serif text-xl leading-snug">“{persona.voice.sampleLine}”</p>
          <p className="mt-2 text-sm opacity-80">{persona.voice.tone}</p>
        </div>
      </div>
      <Section title="Talks about">
        <Pills items={persona.conversationTopics} />
      </Section>
      <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Caveats. </span>
        {persona.caveats}
      </p>
    </div>
  );
}

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const { data: person, isLoading } = useQuery({ queryKey: ["person", id], queryFn: () => api<PersonDTO>(`/api/people/${id}`) });
  const [live, setLive] = useState<TraceState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const runAnalysis = async () => {
    started.current = true;
    setError(null);
    setLive({});
    try {
      await streamSse<AnalysisEvent>(`/api/people/${id}/analyze`, (e) => {
        if (e.type === "step") setLive((t) => ({ ...t, [e.step]: e.status === "start" ? "running" : { step: e.step, title: e.title, notes: e.notes, ms: e.ms } }));
        if (e.type === "error") setError(e.message);
      });
    } catch (e) {
      setError((e as Error).message);
    }
    await qc.invalidateQueries({ queryKey: ["person", id] });
    qc.invalidateQueries({ queryKey: ["people"] });
    setLive(null);
    setParams({}, { replace: true });
  };

  useEffect(() => {
    if (person && !started.current && (params.get("analyze") === "1" || person.status === "scraped") && !person.persona) runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person]);

  if (isLoading) return <div className="mx-auto max-w-5xl px-4 py-12"><div className="h-40 animate-pulse rounded-2xl bg-muted" /></div>;
  if (!person) return <div className="mx-auto max-w-5xl px-4 py-12">Person not found. <Link to="/" className="underline">Back to the pool</Link></div>;

  const trace: TraceState = live ?? Object.fromEntries((person.trace ?? []).map((t) => [t.step, t]));
  const persona = person.persona;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <Link to="/" className="mt-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> The pool
      </Link>

      <header className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar seed={person.avatarSeed} name={person.name} className="size-24" />
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-5xl leading-none">{person.name}</h1>
          {person.headline && <p className="mt-2 text-muted-foreground">{person.headline}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { kind: "linkedin", href: person.linkedinUrl, label: "LinkedIn" },
              { kind: "instagram", href: person.instagramUrl, label: "Instagram" },
            ].map((l) => {
              const s = person.sources?.find((x) => x.kind === l.kind);
              return (
                <a key={l.kind} href={l.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm hover:border-foreground/30">
                  {l.label} <ExternalLink className="size-3" />
                  {s && <Badge variant="secondary" className="font-mono text-[10px]">{s.status}</Badge>}
                </a>
              );
            })}
          </div>
        </div>
        {persona && !live && (
          <Button variant="outline" className="rounded-full" onClick={runAnalysis}>
            <RefreshCw className="size-4" /> Re-analyze
          </Button>
        )}
      </header>

      {persona && !live && <p className="mt-8 max-w-3xl font-serif text-2xl leading-snug">{persona.summary}</p>}

      <div className="mt-10 grid gap-10 lg:grid-cols-[18rem_1fr]">
        <aside className="grid content-start gap-3">
          <h3 className="flex items-center gap-2 font-serif text-2xl">
            <Sparkles className="size-4 text-primary" /> Agent reading
          </h3>
          {Object.keys(trace).length ? (
            <AnalysisTimeline trace={trace} running={!!live} />
          ) : (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              Not analyzed yet.
              <Button size="sm" className="mt-3 w-full rounded-full" onClick={runAnalysis}>Analyze now</Button>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </aside>
        <div>
          {persona && !live ? (
            <PersonaView persona={persona} />
          ) : (
            <div className="grid gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
              ))}
              <p className="text-sm text-muted-foreground">The agent is reading their profiles. This takes about 30 seconds.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
