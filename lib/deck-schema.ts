import type { Slide, SlideLayout } from "./types";

/**
 * Validator for the AI drafting seam — the least reliable input in the app.
 * Raw model text goes in; either a clean draft or a clean error comes out.
 * Never let a malformed response become a broken deck.
 */

export type DraftDeck = {
  deckTitle: string;
  slides: Slide[];
};

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const LAYOUTS: SlideLayout[] = ["title", "content", "section"];

function isLayout(value: unknown): value is SlideLayout {
  return typeof value === "string" && (LAYOUTS as string[]).includes(value);
}

/** Models love wrapping JSON in markdown fences; strip them before parsing. */
export function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}

function newId(): string {
  // crypto.randomUUID exists in Node 19+ and all modern browsers.
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

/**
 * Parse one raw slide object. Returns null only for structurally hopeless
 * input (not an object / unknown layout). A missing heading is tolerated and
 * defaulted so one weak slide doesn't sink an otherwise good draft.
 */
function parseSlide(raw: unknown): Slide | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const record = raw as Record<string, unknown>;

  if (!isLayout(record.layout)) {
    return null;
  }

  const heading =
    typeof record.heading === "string" && record.heading.trim()
      ? record.heading.trim()
      : "Untitled slide";

  const bullets =
    record.layout === "content" && Array.isArray(record.bullets)
      ? record.bullets.filter((b): b is string => typeof b === "string" && b.trim() !== "")
      : [];

  const slide: Slide = {
    id: newId(),
    layout: record.layout,
    heading,
    bullets,
  };

  if (typeof record.subheading === "string" && record.subheading.trim()) {
    slide.subheading = record.subheading.trim();
  }

  if (
    record.layout === "content" &&
    typeof record.imageIdea === "string" &&
    record.imageIdea.trim()
  ) {
    slide.imageIdea = record.imageIdea.trim();
  }

  return slide;
}

export function parseDeckDraft(raw: string): ParseResult<DraftDeck> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripCodeFences(raw));
  } catch {
    return { ok: false, error: "The model returned malformed JSON instead of a deck draft." };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, error: "The model returned something other than a deck object." };
  }

  const record = parsed as Record<string, unknown>;

  if (!Array.isArray(record.slides) || record.slides.length === 0) {
    return { ok: false, error: "The draft contains no slides." };
  }

  const slides: Slide[] = [];

  for (const [index, rawSlide] of record.slides.entries()) {
    const slide = parseSlide(rawSlide);
    if (!slide) {
      return {
        ok: false,
        error: `Slide ${index + 1} is invalid (unknown layout or wrong shape).`,
      };
    }
    slides.push(slide);
  }

  const deckTitle =
    typeof record.deckTitle === "string" && record.deckTitle.trim()
      ? record.deckTitle.trim()
      : slides[0].heading;

  return { ok: true, value: { deckTitle, slides } };
}

/** Parse a single-slide redraft response (same slide shape, no wrapper). */
export function parseSlideRedraft(raw: string): ParseResult<Slide> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripCodeFences(raw));
  } catch {
    return { ok: false, error: "The model returned malformed JSON instead of a slide." };
  }

  const slide = parseSlide(parsed);

  if (!slide) {
    return { ok: false, error: "The redrafted slide has an unknown layout or wrong shape." };
  }

  return { ok: true, value: slide };
}
