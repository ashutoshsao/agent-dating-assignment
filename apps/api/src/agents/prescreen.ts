import type { Persona } from "@dating/shared";

const STOP = new Set(["and", "the", "of", "a", "to", "in", "for", "with", "on", "their", "his", "her", "about", "life", "personal"]);
const tokens = (items: string[]) =>
  new Set(
    items
      .join(" ")
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((w) => w.length > 3 && !STOP.has(w)),
  );

const jaccard = (a: Set<string>, b: Set<string>) => {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
};

const labels = (p: Persona) => [...p.interests, ...p.hobbies, ...p.values].flatMap((t) => [t.label, t.detail]);

/** Cheap, LLM-free compatibility estimate in [0, 1] used to decide who goes on dates. */
export function prescreen(a: Persona, b: Persona): number {
  const overlap = jaccard(tokens(labels(a)), tokens(labels(b)));
  const topics = jaccard(tokens(a.conversationTopics), tokens(b.conversationTopics));
  const bf = (k: keyof Persona["personality"]["bigFive"]) => 1 - Math.abs(a.personality.bigFive[k] - b.personality.bigFive[k]) / 100;
  const big5 = (bf("agreeableness") + bf("conscientiousness") + bf("openness")) / 3;
  const energy = a.lifestyle.socialEnergy === b.lifestyle.socialEnergy ? 1 : a.lifestyle.socialEnergy === "ambivert" || b.lifestyle.socialEnergy === "ambivert" ? 0.7 : 0.4;

  // Dealbreaker hits: a's dealbreaker words that show up in b's self-description, and vice versa
  const desc = (p: Persona) => tokens([p.summary, ...labels(p)]);
  const hits = (x: Persona, y: Persona) => jaccard(tokens(x.dealbreakers), desc(y));
  const penalty = Math.min(0.3, (hits(a, b) + hits(b, a)) * 2);

  return Math.max(0, Math.min(1, 0.35 * overlap * 4 + 0.15 * topics * 4 + 0.3 * big5 + 0.2 * energy - penalty));
}

/** Pick each person's top-k partners; returns unique unordered pairs with scores. */
export function pickPairs(people: { id: string; persona: Persona }[], k = 4, onlyFor?: string) {
  const pairs = new Map<string, { aId: string; bId: string; score: number }>();
  const sources = onlyFor ? people.filter((p) => p.id === onlyFor) : people;
  for (const p of sources) {
    const ranked = people
      .filter((q) => q.id !== p.id)
      .map((q) => ({ q, score: prescreen(p.persona, q.persona) }))
      .sort((x, y) => y.score - x.score)
      .slice(0, k);
    for (const { q, score } of ranked) {
      const [aId, bId] = [p.id, q.id].sort() as [string, string];
      pairs.set(`${aId}:${bId}`, { aId, bId, score });
    }
  }
  return [...pairs.values()];
}
