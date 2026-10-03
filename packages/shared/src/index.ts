import { z } from "zod";

export const HealthSchema = z.object({
  ok: z.boolean(),
  db: z.enum(["ok", "error"]),
  llm: z.enum(["ok", "error", "missing_key"]),
});
export type Health = z.infer<typeof HealthSchema>;

export const ScrapeStatusSchema = z.enum(["ok", "blocked", "private", "not_found", "manual"]);
export type ScrapeStatus = z.infer<typeof ScrapeStatusSchema>;

export const LinkedInDataSchema = z.object({
  name: z.string(),
  headline: z.string().optional(),
  about: z.string().optional(),
  location: z.string().optional(),
  experience: z.array(z.object({ org: z.string(), startYear: z.number().optional() })),
  education: z.array(z.object({ school: z.string() })),
  languages: z.array(z.string()),
  awards: z.array(z.string()),
  memberships: z.array(z.string()),
  posts: z.array(z.object({ title: z.string().optional(), text: z.string() })),
  manualText: z.string().optional(),
});
export type LinkedInData = z.infer<typeof LinkedInDataSchema>;

export const InstagramDataSchema = z.object({
  username: z.string(),
  fullName: z.string().optional(),
  bio: z.string().optional(),
  isPrivate: z.boolean(),
  followers: z.number().optional(),
  following: z.number().optional(),
  postsCount: z.number().optional(),
  captions: z.array(z.string()),
  manualText: z.string().optional(),
});
export type InstagramData = z.infer<typeof InstagramDataSchema>;

export const CreatePersonInputSchema = z.object({
  linkedinUrl: z.string().min(1),
  instagramUrl: z.string().min(1),
  linkedinText: z.string().max(20000).optional(),
  instagramText: z.string().max(20000).optional(),
});
export type CreatePersonInput = z.infer<typeof CreatePersonInputSchema>;

export type SourceKind = "linkedin" | "instagram";
export type PersonStatus = "pending" | "scraped" | "analyzed" | "error";

export interface SourceDTO {
  kind: SourceKind;
  status: ScrapeStatus;
  data: LinkedInData | InstagramData | null;
  fetchedAt: string;
}

export interface PersonDTO {
  id: string;
  name: string;
  linkedinUrl: string;
  instagramUrl: string;
  avatarSeed: string;
  status: PersonStatus;
  headline?: string;
  sources?: SourceDTO[];
  persona?: Persona;
  trace?: AnalysisTraceStep[];
}

// ---------- M2: Persona ----------
export const EvidenceSchema = z.object({
  source: z.enum(["linkedin", "instagram"]),
  quote: z.string(),
  verified: z.boolean().optional(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const TraitSchema = z.object({
  label: z.string(),
  detail: z.string(),
  evidence: z.array(EvidenceSchema),
});
export type Trait = z.infer<typeof TraitSchema>;

const score = z.number().min(0).max(100);

export const PersonaSchema = z.object({
  summary: z.string(),
  needs: z.array(TraitSchema),
  hobbies: z.array(TraitSchema),
  interests: z.array(TraitSchema),
  values: z.array(TraitSchema),
  personality: z.object({
    traits: z.array(TraitSchema),
    bigFive: z.object({
      openness: score,
      conscientiousness: score,
      extraversion: score,
      agreeableness: score,
      neuroticism: score,
    }),
    communicationStyle: z.string(),
    humor: z.string(),
  }),
  lifestyle: z.object({
    pace: z.string(),
    socialEnergy: z.enum(["introvert", "ambivert", "extrovert"]),
    workLifeBalance: z.string(),
    location: z.string().optional(),
  }),
  lookingFor: z.array(z.string()),
  dealbreakers: z.array(z.string()),
  idealFirstDate: z.string(),
  conversationTopics: z.array(z.string()),
  voice: z.object({ tone: z.string(), quirks: z.array(z.string()), sampleLine: z.string() }),
  caveats: z.string(),
});
export type Persona = z.infer<typeof PersonaSchema>;

export type AnalysisStep = "linkedin" | "instagram" | "synthesis" | "evidence";
export interface AnalysisTraceStep {
  step: AnalysisStep;
  title: string;
  notes: string;
  ms: number;
}
export type AnalysisEvent =
  | { type: "step"; step: AnalysisStep; status: "start" }
  | { type: "step"; step: AnalysisStep; status: "done"; title: string; notes: string; ms: number }
  | { type: "persona"; persona: Persona }
  | { type: "error"; message: string };

// ---------- M3: Dates ----------
export const VenueSchema = z.object({
  venue: z.string(),
  setting: z.string(),
  why: z.string(),
});
export type Venue = z.infer<typeof VenueSchema>;

export const TurnOutputSchema = z.object({
  thought: z.string(),
  message: z.string(),
  interest: z.number().min(0).max(10),
  wantsToLeave: z.boolean(),
});
export type TurnOutput = z.infer<typeof TurnOutputSchema>;

const ten = z.number().min(0).max(10);
export const DebriefOutputSchema = z.object({
  score: ten,
  chemistry: ten,
  valuesAlignment: ten,
  lifestyleFit: ten,
  wouldSeeAgain: z.boolean(),
  highlights: z.array(z.string()),
  concerns: z.array(z.string()),
  reportToPerson: z.string(),
});
export type DebriefOutput = z.infer<typeof DebriefOutputSchema>;

export type DateStatus = "scheduled" | "live" | "done" | "error";

export interface TurnDTO {
  idx: number;
  speakerId: string | null;
  message: string;
  thought?: string | null;
  interest?: number | null;
}

export interface DebriefDTO {
  personId: string;
  score: number;
  data: DebriefOutput;
}

export interface DatePersonDTO {
  id: string;
  name: string;
  avatarSeed: string;
  headline?: string;
}

export interface DateDTO {
  id: string;
  status: DateStatus;
  a: DatePersonDTO;
  b: DatePersonDTO;
  venue: Venue | null;
  prescreen: number;
  mutual: number | null;
  createdAt: string;
  turns?: TurnDTO[];
  debriefs?: DebriefDTO[];
}

export type DateEvent =
  | { type: "status"; status: DateStatus }
  | { type: "venue"; venue: Venue }
  | { type: "typing"; speakerId: string | null }
  | { type: "turn"; turn: TurnDTO }
  | { type: "debrief"; debrief: DebriefDTO }
  | { type: "done"; mutual: number }
  | { type: "error"; message: string };

// ---------- M4: Rankings ----------
export interface RankRow {
  rank: number;
  other: DatePersonDTO;
  dated: boolean;
  dateId?: string;
  dateStatus?: DateStatus;
  mutual?: number;
  myScore?: number;
  theirScore?: number;
  iWouldSeeAgain?: boolean;
  theyWouldSeeAgain?: boolean;
  report?: string;
  estimate: number; // pre-screen fit, 0–100
}

export interface RankingDTO {
  person: DatePersonDTO;
  matches: RankRow[];
}
