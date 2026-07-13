/**
 * Domain model for Valon Deck Studio.
 * Vocabulary defined in CONTEXT.md — keep the two in sync.
 */

export type Audience = "internal" | "external";

export type VoiceId = "executive-brief" | "client-warm" | "team-candid";

export type Voice = {
  id: VoiceId;
  name: string;
  description: string;
  /** Audience this voice is preselected for on the setup screen. */
  defaultFor: Audience | null;
  /** Do/don't rules — injected into draft, redraft, and eval prompts. */
  rules: string[];
};

export type SlideLayout = "title" | "content" | "section";

export type Slide = {
  id: string;
  layout: SlideLayout;
  /** Deck title (title layout), heading (content), or big claim (section). */
  heading: string;
  /** Subtitle — title layout only. */
  subheading?: string;
  /** Content layout only; empty elsewhere. */
  bullets: string[];
  /** AI-proposed image prompt, user-editable. Content layout only. */
  imageIdea?: string;
  /** Generated image as a data URL, once the user triggers generation. */
  imageData?: string;
};

export type ContextDoc = {
  filename: string;
  /** Extracted text, capped at CONTEXT_DOC_CHAR_CAP. Raw bytes never persist. */
  text: string;
  truncated: boolean;
};

export type Deck = {
  id: string;
  title: string;
  brief: string;
  audience: Audience;
  voiceId: VoiceId;
  targetLength: number;
  contextDoc: ContextDoc | null;
  slides: Slide[];
  createdAt: string;
  updatedAt: string;
};

export type Verdict = "on-brand" | "needs-revision";

export type EvalFinding = {
  /** 1-based slide number; null for deck-level findings. */
  slideNumber: number | null;
  issue: string;
};

export type EvalTrigger = "draft" | "redraft";

/** One row in the Evals tab: date · document · verdict · findings. */
export type EvalRun = {
  id: string;
  deckId: string;
  deckTitle: string;
  contextFilename: string | null;
  trigger: EvalTrigger;
  date: string;
  verdict: Verdict;
  findings: EvalFinding[];
};

export const CONTEXT_DOC_CHAR_CAP = 24_000;
