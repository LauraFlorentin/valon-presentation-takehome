import { GoogleGenAI } from "@google/genai";

/**
 * Server-side Gemini access shared by the API routes.
 * Text model is env-overridable, mirroring the image model convention.
 */

export const DEFAULT_TEXT_MODEL = "gemini-3-flash-preview";
export const DEFAULT_IMAGE_MODEL = "gemini-3-pro-image-preview";

export function textModel(): string {
  return process.env.GOOGLE_TEXT_MODEL || DEFAULT_TEXT_MODEL;
}

export function imageModel(): string {
  return process.env.GOOGLE_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;
}

export function getClient(): GoogleGenAI | null {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

/** Flatten a generateContent response to its concatenated text parts. */
export function responseText(response: {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}): string {
  return (response.candidates ?? [])
    .flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text)
    .filter((text): text is string => typeof text === "string")
    .join("");
}
