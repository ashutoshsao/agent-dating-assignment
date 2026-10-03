import { generateText } from "ai";
import {
  PersonaSchema,
  type AnalysisEvent,
  type AnalysisStep,
  type AnalysisTraceStep,
  type Evidence,
  type InstagramData,
  type LinkedInData,
  type Persona,
} from "@dating/shared";
import { prisma } from "../db";
import { generateJson, model, MODEL_ID } from "../llm";
import { instagramText, linkedinText } from "./sources";

const READER_RULES = `Only use what is in the text. Quote short exact phrases (copied verbatim) as evidence. If something is unclear, say so instead of guessing. Write compact bullet notes, max ~180 words.`;

const LINKEDIN_READER = `You are a matchmaker's analyst reading someone's PUBLIC LinkedIn profile to understand them as a potential romantic partner.
Note: career arc and ambition, work style, what they care about professionally, what they write/post about, signals about values, schedule intensity, and anything personal that leaks through. ${READER_RULES}`;

const INSTAGRAM_READER = `You are a matchmaker's analyst reading someone's PUBLIC Instagram (bio + recent captions) to understand them as a potential romantic partner.
Note: lifestyle, hobbies, what they celebrate, aesthetics, humor, tone of voice, relationships/family/friends mentions, travel, food, fitness, causes. Separate their authentic voice from brand/sponsored content. ${READER_RULES}`;

const SYNTHESIZER = `You are the agent who will represent this person on dates. Using the reader notes and the raw source text, build their dating persona.
Rules:
- Ground everything in the sources. Each trait's evidence quotes must be copied VERBATIM from the raw source text (short, 3–15 words), tagged with the source they came from.
- "needs" = what they need from a partner and relationship (emotional, practical, lifestyle), inferred from how they live and what they value. Explain the inference in "detail".
- 3–5 items each for needs, hobbies, interests, values; 3–5 personality traits.
- bigFive are 0–100 estimates.
- "voice" describes how you, their agent, should speak on dates so it sounds like them; sampleLine is one line they would plausibly say.
- "caveats": be honest about the limits of inferring this from public, often curated profiles.`;

type Emit = (e: AnalysisEvent) => void;

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Mark each evidence quote verified if it appears (normalized) in the source it claims. */
export function verifyEvidence(persona: Persona, texts: Record<"linkedin" | "instagram", string>) {
  const hay = { linkedin: norm(texts.linkedin), instagram: norm(texts.instagram) };
  let total = 0;
  let verified = 0;
  const check = (e: Evidence) => {
    const q = norm(e.quote);
    const ok = q.length > 0 && (hay[e.source].includes(q) || (q.length > 30 && hay[e.source].includes(q.slice(0, 30))));
    total++;
    if (ok) verified++;
    e.verified = ok;
  };
  const traitLists = [persona.needs, persona.hobbies, persona.interests, persona.values, persona.personality.traits];
  for (const list of traitLists) for (const t of list) t.evidence.forEach(check);
  return { total, verified };
}

export async function analyzePerson(personId: string, emit: Emit = () => {}): Promise<Persona> {
  const person = await prisma.person.findUniqueOrThrow({ where: { id: personId }, include: { sources: true } });
  const li = person.sources.find((s) => s.kind === "linkedin")?.data as LinkedInData | null;
  const ig = person.sources.find((s) => s.kind === "instagram")?.data as InstagramData | null;
  const texts = { linkedin: linkedinText(li), instagram: instagramText(ig) };
  const trace: AnalysisTraceStep[] = [];

  async function step<T>(step: AnalysisStep, title: string, run: () => Promise<{ value: T; notes: string }>) {
    emit({ type: "step", step, status: "start" });
    const t0 = performance.now();
    const { value, notes } = await run();
    const ms = Math.round(performance.now() - t0);
    trace.push({ step, title, notes, ms });
    emit({ type: "step", step, status: "done", title, notes, ms });
    return value;
  }

  const read = (system: string, text: string) =>
    generateText({ model, system, prompt: `Person: ${person.name}\n\n${text}`, temperature: 0.3, maxOutputTokens: 700 }).then((r) => ({
      value: r.text,
      notes: r.text,
    }));

  const [liNotes, igNotes] = await Promise.all([
    step("linkedin", "Reading LinkedIn", () => read(LINKEDIN_READER, texts.linkedin)),
    step("instagram", "Reading Instagram", () => read(INSTAGRAM_READER, texts.instagram)),
  ]);

  const persona = await step("synthesis", "Building the persona", async () => {
    const p = await generateJson({
      schema: PersonaSchema,
      system: SYNTHESIZER,
      prompt: `Person: ${person.name}

## LinkedIn reader notes
${liNotes}

## Instagram reader notes
${igNotes}

## RAW LINKEDIN TEXT (source: "linkedin")
${texts.linkedin}

## RAW INSTAGRAM TEXT (source: "instagram")
${texts.instagram}`,
    });
    return { value: p, notes: p.summary };
  });

  await step("evidence", "Checking evidence against sources", async () => {
    const { total, verified } = verifyEvidence(persona, texts);
    return { value: null, notes: `${verified}/${total} evidence quotes found verbatim in the sources.` };
  });

  await prisma.analysis.upsert({
    where: { personId },
    create: { personId, persona: persona as any, trace: trace as any, model: MODEL_ID },
    update: { persona: persona as any, trace: trace as any, model: MODEL_ID, createdAt: new Date() },
  });
  await prisma.person.update({ where: { id: personId }, data: { status: "analyzed" } });
  emit({ type: "persona", persona });
  return persona;
}
