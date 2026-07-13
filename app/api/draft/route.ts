import { NextResponse } from "next/server";
import { getClient, responseText, textModel } from "../../../lib/gemini";
import { buildDraftPrompt } from "../../../lib/prompts";
import { parseDeckDraft } from "../../../lib/deck-schema";
import { defaultVoiceFor, VOICES } from "../../../lib/voices";
import type { Audience, ContextDoc, VoiceId } from "../../../lib/types";

/**
 * Full-deck drafting endpoint. Takes the setup-screen inputs, builds the
 * draft prompt, calls the text model, and validates the response through
 * parseDeckDraft before anything reaches the editor.
 */

const MIN_SLIDES = 3;
const MAX_SLIDES = 15;
const DEFAULT_SLIDES = 8;

type DraftRequestBody = {
  brief?: unknown;
  audience?: unknown;
  voiceId?: unknown;
  targetLength?: unknown;
  contextDoc?: unknown;
};

function parseAudience(value: unknown): Audience {
  return value === "external" ? "external" : "internal";
}

function parseVoiceId(value: unknown, audience: Audience): VoiceId {
  const match = VOICES.find((voice) => voice.id === value);
  return match ? match.id : defaultVoiceFor(audience).id;
}

function clampTargetLength(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_SLIDES;
  }
  return Math.min(MAX_SLIDES, Math.max(MIN_SLIDES, Math.round(value)));
}

function parseContextDoc(value: unknown): ContextDoc | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.filename !== "string" || typeof record.text !== "string") {
    return null;
  }
  if (!record.text.trim()) {
    return null;
  }
  return {
    filename: record.filename,
    text: record.text,
    truncated: record.truncated === true,
  };
}

export async function POST(request: Request) {
  try {
    const client = getClient();

    if (!client) {
      return NextResponse.json(
        { error: "Missing GOOGLE_API_KEY in your local environment." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as DraftRequestBody;

    const brief = typeof body.brief === "string" ? body.brief.trim() : "";

    if (!brief) {
      return NextResponse.json({ error: "Brief is required." }, { status: 400 });
    }

    const audience = parseAudience(body.audience);
    const voiceId = parseVoiceId(body.voiceId, audience);
    const targetLength = clampTargetLength(body.targetLength);
    const contextDoc = parseContextDoc(body.contextDoc);

    const prompt = buildDraftPrompt({
      brief,
      audience,
      voiceId,
      targetLength,
      contextDoc,
    });

    const response = await client.models.generateContent({
      model: textModel(),
      contents: prompt,
    });

    const result = parseDeckDraft(responseText(response));

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json({
      deckTitle: result.value.deckTitle,
      slides: result.value.slides,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong while drafting.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
