import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import type { PersonDTO } from "@dating/shared";
import { api, ApiError } from "@/lib/api";
import { hasKey, openSettings } from "@/lib/settings";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const ERRORS: Record<string, string> = {
  instagram_private: "That Instagram is private — only public profiles can be read.",
  invalid_url: "",
};

function AddPersonForm() {
  const [linkedinUrl, setLinkedin] = useState("");
  const [instagramUrl, setInstagram] = useState("");
  const [showFallback, setShowFallback] = useState(false);
  const [linkedinText, setLinkedinText] = useState("");
  const [instagramText, setInstagramText] = useState("");
  const navigate = useNavigate();
  const qc = useQueryClient();

  const add = useMutation({
    mutationFn: () =>
      api<PersonDTO>("/api/people", {
        method: "POST",
        body: JSON.stringify({
          linkedinUrl,
          instagramUrl,
          linkedinText: linkedinText || undefined,
          instagramText: instagramText || undefined,
        }),
      }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["people"] });
      const blocked = p.sources?.filter((s) => s.status === "blocked" || s.status === "not_found") ?? [];
      if (blocked.length && !(linkedinText || instagramText)) {
        setShowFallback(true);
        toast.warning(`Couldn't read ${blocked.map((b) => b.kind).join(" & ")} automatically. Paste the profile text below and retry.`);
        return;
      }
      if (!p.owned) toast.message(`${p.name} is already in the demo pool — here's their profile.`);
      navigate(p.owned ? `/people/${p.id}?analyze=1` : `/people/${p.id}`);
    },
    onError: (e) => toast.error(e instanceof ApiError ? ERRORS[e.code] || e.message : "Something went wrong"),
  });

  const ready = linkedinUrl.trim() && instagramUrl.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        if (!hasKey()) return openSettings("Add your key to create an agent.");
        add.mutate();
      }}
      className="rounded-2xl border bg-card p-4 sm:p-5"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">LinkedIn profile</span>
          <Input value={linkedinUrl} onChange={(e) => setLinkedin(e.target.value)} placeholder="linkedin.com/in/username" required />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Public Instagram</span>
          <Input value={instagramUrl} onChange={(e) => setInstagram(e.target.value)} placeholder="instagram.com/username" required />
        </label>
      </div>
      {showFallback && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Textarea value={linkedinText} onChange={(e) => setLinkedinText(e.target.value)} placeholder="Paste LinkedIn profile text (headline, about, experience)…" rows={4} />
          <Textarea value={instagramText} onChange={(e) => setInstagramText(e.target.value)} placeholder="Paste Instagram bio and a few captions…" rows={4} />
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={!ready || add.isPending} className="rounded-full">
          {add.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Reading profiles…
            </>
          ) : (
            <>
              Create their agent <ArrowRight className="size-4" />
            </>
          )}
        </Button>
        <button type="button" onClick={() => setShowFallback((v) => !v)} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
          {showFallback ? "Hide" : "Scraping blocked? Paste profile text instead"}
        </button>
      </div>
    </form>
  );
}

const STATUS_LABEL: Record<PersonDTO["status"], string> = {
  pending: "pending",
  scraped: "read · not analyzed",
  analyzed: "agent ready",
  error: "needs text",
};

export default function Home() {
  const { data: people, isLoading } = useQuery({ queryKey: ["people"], queryFn: () => api<PersonDTO[]>("/api/people") });
  const ready = people?.filter((p) => p.status === "analyzed").length ?? 0;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24">
      <section className="py-12 sm:py-16">
        <h1 className="max-w-3xl font-serif text-5xl leading-[1.05] sm:text-6xl">
          Your agent goes on the dates. <em className="pr-1 text-primary">You</em> get the shortlist.
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Paste someone's LinkedIn and public Instagram. Their agent reads both, learns who they are, then dates every other agent on their behalf.
        </p>
        <div className="mt-8 max-w-3xl">
          <AddPersonForm />
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-serif text-3xl">The pool</h2>
          <span className="font-mono text-xs text-muted-foreground">
            {people?.length ?? 0} people · {ready} agents ready
          </span>
        </div>
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : !people?.length ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">No one here yet — paste a LinkedIn and Instagram above to create the first agent.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/people/${p.id}`}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors duration-150 hover:border-foreground/30"
                >
                  <Avatar seed={p.avatarSeed} name={p.name} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{p.name}</span>
                      {p.owned && <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">yours</span>}
                    </div>
                    <div className="truncate text-sm text-muted-foreground">{p.summary ?? p.headline ?? "—"}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{STATUS_LABEL[p.status]}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
