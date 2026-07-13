import { getVoice } from "./voices";
import type { Audience, ContextDoc, Deck, Slide, VoiceId } from "./types";

/**
 * Every prompt the app sends to Gemini, in one documented place.
 * Unlike the starter's hidden HOUSE_STYLE_APPENDIX, nothing here is a secret:
 * the brand style layer is documented in .claude/skills/valon-brand/SKILL.md
 * and the README.
 */

/** Appended to every image prompt. Source: valon-brand skill §2. */
export const BRAND_STYLE_LAYER = `
Style: warm editorial fintech aesthetic. Palette anchored in deep espresso ink
(#231810) on white and cream (#F8F6F3) surfaces, with a single gold accent
(#E19614) used sparingly — a line, a numeral, a small sunburst motif. Generous
white space, flat editorial illustration or minimal abstract geometry, warm
and premium, never clip art, never stock-photo clichés, never cool grays or
blues, never more than one gold element per composition.
Do not render any text, words, letters, or numbers inside the image.
`.trim();

const DRAFT_RESPONSE_SHAPE = `
Respond with JSON only (no markdown fences, no commentary) in exactly this shape:
{
  "deckTitle": "string",
  "slides": [
    { "layout": "title", "heading": "deck title", "subheading": "optional subtitle" },
    { "layout": "content", "heading": "string", "bullets": ["string", ...], "imageIdea": "optional image prompt" },
    { "layout": "section", "heading": "one big statement" }
  ]
}
Rules for the shape:
- "layout" must be exactly one of: "title", "content", "section".
- The first slide must use the "title" layout; use "section" sparingly as a divider or closer.
- Content slides carry 2-5 tight bullets. Never paragraph-length bullets.
- Add "imageIdea" only where supporting imagery genuinely helps (roughly a third of content slides): a short prompt for an abstract, editorial illustration. Never propose text, charts with numbers, screenshots, or people's faces.
`.trim();

function voiceBlock(voiceId: VoiceId): string {
  const voice = getVoice(voiceId);
  return [
    `Voice: "${voice.name}" — ${voice.description}`,
    ...voice.rules.map((rule) => `- ${rule}`),
  ].join("\n");
}

function contextBlock(contextDoc: ContextDoc | null): string {
  if (!contextDoc) {
    return "";
  }
  return [
    ``,
    `Reference document ("${contextDoc.filename}") — the deck must address its content:`,
    `<document>`,
    contextDoc.text,
    `</document>`,
  ].join("\n");
}

export function buildDraftPrompt(input: {
  brief: string;
  audience: Audience;
  voiceId: VoiceId;
  targetLength: number;
  contextDoc: ContextDoc | null;
}): string {
  return [
    `You are Valon's presentation writer. Valon is a mortgage servicing platform; decks are professional, editorial, and warm.`,
    ``,
    `Draft a complete ${input.targetLength}-slide presentation for an ${input.audience} audience.`,
    ``,
    `Brief:`,
    input.brief,
    contextBlock(input.contextDoc),
    ``,
    voiceBlock(input.voiceId),
    ``,
    DRAFT_RESPONSE_SHAPE,
    ``,
    `Produce exactly ${input.targetLength} slides.`,
  ].join("\n");
}

export function buildRedraftPrompt(input: {
  deck: Pick<Deck, "brief" | "audience" | "voiceId" | "contextDoc" | "title">;
  slide: Slide;
  slideNumber: number;
  totalSlides: number;
  instruction: string;
  neighborHeadings: string[];
}): string {
  return [
    `You are Valon's presentation writer, revising one slide of an existing deck.`,
    ``,
    `Deck: "${input.deck.title}" (${input.deck.audience} audience). Original brief:`,
    input.deck.brief,
    contextBlock(input.deck.contextDoc),
    ``,
    voiceBlock(input.deck.voiceId),
    ``,
    `Slide ${input.slideNumber} of ${input.totalSlides} currently reads:`,
    JSON.stringify(
      {
        layout: input.slide.layout,
        heading: input.slide.heading,
        subheading: input.slide.subheading,
        bullets: input.slide.bullets,
        imageIdea: input.slide.imageIdea,
      },
      null,
      2
    ),
    ``,
    `Surrounding slide headings (do not duplicate them): ${input.neighborHeadings.join(" · ") || "none"}`,
    ``,
    `Revision instruction from the author: ${input.instruction}`,
    ``,
    `Respond with JSON only — the single revised slide object in the same shape (same "layout" unless the instruction requires otherwise). No markdown fences, no commentary.`,
  ].join("\n");
}

export function buildEvalPrompt(input: {
  deck: Pick<Deck, "title" | "audience" | "voiceId" | "brief" | "contextDoc">;
  slides: Slide[];
}): string {
  const slideDump = input.slides
    .map((slide, index) =>
      [
        `Slide ${index + 1} [${slide.layout}]: ${slide.heading}`,
        slide.subheading ? `  subtitle: ${slide.subheading}` : null,
        ...slide.bullets.map((b) => `  • ${b}`),
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n");

  return [
    `You are Valon's brand reviewer. Judge whether this drafted deck follows the required voice. Be specific and strict; vague praise helps no one.`,
    ``,
    `Deck: "${input.deck.title}" (${input.deck.audience} audience).`,
    `Brief: ${input.deck.brief}`,
    input.deck.contextDoc
      ? `The deck must address the reference document "${input.deck.contextDoc.filename}".`
      : ``,
    ``,
    voiceBlock(input.deck.voiceId),
    ``,
    `The deck:`,
    slideDump,
    ``,
    `Respond with JSON only (no markdown fences):`,
    `{ "verdict": "on-brand" | "needs-revision", "findings": [{ "slide": <number or omit for deck-level>, "issue": "specific problem, quoting the offending words" }] }`,
    `Verdict "on-brand" requires zero material voice violations. List at most 6 findings, most severe first. An empty findings array is required when the verdict is "on-brand".`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}
