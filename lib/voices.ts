import type { Audience, Voice, VoiceId } from "./types";

/**
 * Baked-in voice standards (decision: dropdown-only, rules live in code).
 * Tone derives from the Valon brand skill: editorial, warm, premium,
 * plain-spoken — never salesy, never corporate-euphemistic.
 */
export const VOICES: Voice[] = [
  {
    id: "executive-brief",
    name: "Executive Brief",
    description: "Crisp and numbers-first, for leadership and board audiences.",
    defaultFor: "internal",
    rules: [
      "Lead every slide with the takeaway, not the buildup.",
      "Back claims with a concrete number wherever one exists.",
      "Short declarative sentences; no filler, no throat-clearing.",
      'No buzzwords: never "synergy", "leverage", "revolutionize", "game-changing".',
      "Industry terms are fine, but expand any acronym on first use.",
    ],
  },
  {
    id: "client-warm",
    name: "Client Warm",
    description: "Plain-English and reassuring, for homeowners and partners.",
    defaultFor: "external",
    rules: [
      'Address the reader directly as "you".',
      "No internal acronyms or mortgage jargon (LTV, DTI, MSR) unless explained in plain words.",
      "Benefits before features — say what it means for the reader first.",
      "Warm and confident, never salesy or pushy.",
      "Short sentences; aim for an 8th-grade reading level.",
    ],
  },
  {
    id: "team-candid",
    name: "Team Candid",
    description: "Direct and informal, for internal team updates.",
    defaultFor: null,
    rules: [
      'Use first-person plural — "we shipped", "we missed".',
      "Celebrate specifics, not superlatives.",
      "Flag risks and misses plainly; no corporate euphemisms.",
      "Conversational but professional — contractions welcome, slang not.",
    ],
  },
];

export function getVoice(id: VoiceId): Voice {
  const voice = VOICES.find((v) => v.id === id);
  if (!voice) {
    throw new Error(`Unknown voice: ${id}`);
  }
  return voice;
}

export function defaultVoiceFor(audience: Audience): Voice {
  return VOICES.find((v) => v.defaultFor === audience) ?? VOICES[0];
}
