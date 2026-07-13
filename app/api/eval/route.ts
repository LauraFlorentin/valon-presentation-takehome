import { NextResponse } from "next/server";
import { buildEvalRun } from "../../../lib/eval-schema";
import { getClient, responseText, textModel } from "../../../lib/gemini";
import { buildEvalPrompt } from "../../../lib/prompts";
import type { Audience, Deck, EvalTrigger, Slide, VoiceId } from "../../../lib/types";
import { defaultVoiceFor, VOICES } from "../../../lib/voices";

/**
 * Brand-check eval endpoint. Runs the deck through Gemini as Valon's brand
 * reviewer and returns one Evals-tab row. The row is guaranteed: even when
 * the model call fails, buildEvalRun degrades to a needs-revision verdict so
 * the audit trail never silently drops a run.
 */

type EvalDeckPayload = Pick<
  Deck,
  "id" | "title" | "audience" | "voiceId" | "brief" | "contextDoc"
>;

type EvalRequestBody = {
  deck?: Partial<EvalDeckPayload> | null;
  slides?: Slide[] | null;
  trigger?: EvalTrigger;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EvalRequestBody;
    const rawDeck = body.deck;

    if (
      !rawDeck ||
      typeof rawDeck.id !== "string" ||
      !rawDeck.id.trim() ||
      typeof rawDeck.title !== "string" ||
      !rawDeck.title.trim()
    ) {
      return NextResponse.json(
        { error: "Deck id and title are required." },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.slides) || body.slides.length === 0) {
      return NextResponse.json(
        { error: "At least one slide is required to run a brand check." },
        { status: 400 }
      );
    }

    const client = getClient();

    if (!client) {
      return NextResponse.json(
        { error: "Missing GOOGLE_API_KEY in your local environment." },
        { status: 500 }
      );
    }

    const audience: Audience = rawDeck.audience === "external" ? "external" : "internal";
    const voiceId: VoiceId =
      rawDeck.voiceId && VOICES.some((voice) => voice.id === rawDeck.voiceId)
        ? rawDeck.voiceId
        : defaultVoiceFor(audience).id;

    const deck: EvalDeckPayload = {
      id: rawDeck.id.trim(),
      title: rawDeck.title.trim(),
      audience,
      voiceId,
      brief: typeof rawDeck.brief === "string" ? rawDeck.brief : "",
      contextDoc: rawDeck.contextDoc ?? null
    };

    const trigger: EvalTrigger = body.trigger === "redraft" ? "redraft" : "draft";

    let rawText = "";

    try {
      const prompt = buildEvalPrompt({ deck, slides: body.slides });
      const response = await client.models.generateContent({
        model: textModel(),
        contents: prompt
      });
      rawText = responseText(response);
    } catch {
      // Model call failed — keep rawText empty so buildEvalRun degrades to a
      // needs-revision row and the audit trail still records this run.
      rawText = "";
    }

    const evalRun = buildEvalRun(deck, trigger, rawText);

    return NextResponse.json({ evalRun });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong while running the brand check.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
