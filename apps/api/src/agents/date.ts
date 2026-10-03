import { generateText } from "ai";
import {
  DebriefOutputSchema,
  TurnOutputSchema,
  VenueSchema,
  type DateEvent,
  type DebriefDTO,
  type Persona,
  type TurnDTO,
  type Venue,
} from "@dating/shared";
import { prisma } from "../db";
import { generateJson, model } from "../llm";
import { bus } from "../bus";

const TURNS = 10;
const TWIST_AT = 5;

interface Side {
  id: string;
  name: string;
  persona: Persona;
}

function personaBrief(p: Persona) {
  return JSON.stringify({
    summary: p.summary,
    needs: p.needs.map((n) => `${n.label}: ${n.detail}`),
    hobbies: p.hobbies.map((h) => h.label),
    interests: p.interests.map((i) => i.label),
    values: p.values.map((v) => v.label),
    personality: { traits: p.personality.traits.map((t) => t.label), communication: p.personality.communicationStyle, humor: p.personality.humor },
    lifestyle: p.lifestyle,
    lookingFor: p.lookingFor,
    dealbreakers: p.dealbreakers,
    voice: p.voice,
    talksAbout: p.conversationTopics,
  });
}

const publicCard = (s: Side) => `${s.name} — ${s.persona.summary}`;

function agentSystem(me: Side, other: Side, venue: Venue) {
  return `You are the dating agent for ${me.name}. You are on a first date on ${me.name}'s behalf with ${other.name}'s agent, and you speak AS ${me.name}, in first person.

Who you represent (private — only you know this):
${personaBrief(me.persona)}

What you know about your date (only their public intro): ${publicCard(other)}

The date: ${venue.venue}. ${venue.setting}

Your job:
- Sound like ${me.name} (use the voice and quirks above). Be natural, warm, specific; 1–3 sentences per message, no speeches.
- Find out whether this person meets ${me.name}'s NEEDS and avoid their DEALBREAKERS. Ask real questions, follow up on answers, share real things about ${me.name}.
- Be honest: only claim things consistent with the profile. Don't fake enthusiasm — if it's not clicking, your interest should drop.
- "thought" is your private reasoning as an agent (what you noticed, what to probe next, how it maps to ${me.name}'s needs). The date never sees it.
- "interest" is how interested ${me.name} would be right now (0–10). "wantsToLeave" only if this is clearly going badly.`;
}

type Transcript = { speaker: string; message: string }[];
const render = (t: Transcript) => t.map((x) => `${x.speaker}: ${x.message}`).join("\n");

async function pickVenue(a: Side, b: Side): Promise<Venue> {
  return generateJson({
    schema: VenueSchema,
    system: `You are a thoughtful matchmaker planning a first date between two people. Pick a specific, real-feeling venue and activity that suits BOTH of them (use their hobbies, lifestyle and ideal first dates). "setting" is 1–2 vivid sentences of scene-setting. "why" explains the choice in one sentence.`,
    prompt: `Person A: ${a.name}\n${personaBrief(a.persona)}\nIdeal first date: ${a.persona.idealFirstDate}\n\nPerson B: ${b.name}\n${personaBrief(b.persona)}\nIdeal first date: ${b.persona.idealFirstDate}`,
    temperature: 0.8,
  });
}

async function twist(venue: Venue, t: Transcript): Promise<string> {
  const { text } = await generateText({
    model,
    system: `You narrate a first date. Write ONE short sentence (max 25 words), in present tense, describing a small real-world moment at the venue that gives the two people something to react to (weather, a stranger, a song, a menu mix-up, a dog). No dialogue. Don't resolve anything.`,
    prompt: `Venue: ${venue.venue}. ${venue.setting}\n\nConversation so far:\n${render(t)}`,
    temperature: 0.9,
    maxOutputTokens: 80,
  });
  return text.trim().replace(/^"|"$/g, "");
}

async function debrief(me: Side, other: Side, venue: Venue, t: Transcript) {
  return generateJson({
    schema: DebriefOutputSchema,
    system: `You are ${me.name}'s dating agent. The date is over. Write your PRIVATE debrief for ${me.name}, judged strictly against ${me.name}'s needs, values, lifestyle and dealbreakers — not against politeness. Be candid; a pleasant but mismatched date should score low. Scores 0–10. "reportToPerson" is a short, personal note addressed to ${me.name} (2–4 sentences, second person), citing specific moments from the date.`,
    prompt: `Who you represent:\n${personaBrief(me.persona)}\n\nYour date: ${publicCard(other)}\nVenue: ${venue.venue}\n\nTranscript:\n${render(t)}`,
    temperature: 0.4,
  });
}

/** Run one full date between a and b, persisting turns and publishing live events. */
export async function runDate(dateId: string): Promise<number> {
  const date = await prisma.date.findUniqueOrThrow({
    where: { id: dateId },
    include: { a: { include: { analysis: true } }, b: { include: { analysis: true } } },
  });
  const side = (p: typeof date.a): Side => {
    if (!p.analysis) throw new Error(`${p.name} has not been analyzed`);
    return { id: p.id, name: p.name, persona: p.analysis.persona as unknown as Persona };
  };
  const A = side(date.a);
  const B = side(date.b);
  const emit = (e: DateEvent) => bus.publish(dateId, e);

  try {
    await prisma.$transaction([prisma.turn.deleteMany({ where: { dateId } }), prisma.debrief.deleteMany({ where: { dateId } })]);
    await prisma.date.update({ where: { id: dateId }, data: { status: "live", mutual: null } });
    emit({ type: "status", status: "live" });

    const venue = await pickVenue(A, B);
    await prisma.date.update({ where: { id: dateId }, data: { venue } });
    emit({ type: "venue", venue });

    const transcript: Transcript = [];
    let idx = 0;
    const leaves: Record<string, number> = { [A.id]: 0, [B.id]: 0 };
    const save = async (turn: TurnDTO) => {
      await prisma.turn.create({ data: { dateId, ...turn } });
      emit({ type: "turn", turn });
    };

    for (let i = 0; i < TURNS; i++) {
      if (i === TWIST_AT) {
        emit({ type: "typing", speakerId: null });
        const moment = await twist(venue, transcript);
        transcript.push({ speaker: "(Narrator)", message: moment });
        await save({ idx: idx++, speakerId: null, message: moment });
      }
      const [me, other] = i % 2 === 0 ? [A, B] : [B, A];
      emit({ type: "typing", speakerId: me.id });
      const out = await generateJson({
        schema: TurnOutputSchema,
        system: agentSystem(me, other, venue),
        prompt:
          transcript.length === 0
            ? `You've just arrived and met ${other.name}. Open the conversation.`
            : `Conversation so far:\n${render(transcript)}\n\nYour turn (${i >= TURNS - 2 ? "the date is wrapping up — close naturally, and say honestly whether you'd like to meet again" : "keep it flowing"}).`,
        temperature: 0.85,
      });
      transcript.push({ speaker: me.name, message: out.message });
      await save({ idx: idx++, speakerId: me.id, message: out.message, thought: out.thought, interest: out.interest });
      if (out.wantsToLeave && ++leaves[me.id]! >= 2) break;
    }

    const [dA, dB] = await Promise.all([debrief(A, B, venue, transcript), debrief(B, A, venue, transcript)]);
    for (const [s, d] of [[A, dA], [B, dB]] as const) {
      const dto: DebriefDTO = { personId: s.id, score: d.score, data: d };
      await prisma.debrief.create({ data: { dateId, personId: s.id, score: d.score, data: d } });
      emit({ type: "debrief", debrief: dto });
    }

    const mutual = Math.round(10 * Math.sqrt(dA.score * dB.score));
    await prisma.date.update({ where: { id: dateId }, data: { status: "done", mutual } });
    emit({ type: "done", mutual });
    return mutual;
  } catch (err) {
    await prisma.date.update({ where: { id: dateId }, data: { status: "error" } });
    emit({ type: "error", message: (err as Error).message });
    throw err;
  }
}
