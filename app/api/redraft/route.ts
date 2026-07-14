import { NextResponse } from "next/server";
import { getClient, responseText, textModel } from "../../../lib/gemini";
import { buildRedraftPrompt } from "../../../lib/prompts";
import { parseSlideRedraft } from "../../../lib/deck-schema";
import type { Audience, ContextDoc, Slide, VoiceId } from "../../../lib/types";

type RedraftRequest = {
  deck?: {
    title?: string;
    brief?: string;
    audience?: Audience;
    voiceId?: VoiceId;
    contextDoc?: ContextDoc | null;
  };
  slide?: Slide;
  slideNumber?: number;
  totalSlides?: number;
  instruction?: string;
  neighborHeadings?: string[];
};

export async function POST(request: Request) {
  try {
    const client = getClient();

    if (!client) {
      return NextResponse.json(
        { error: "Missing GOOGLE_API_KEY in your local environment." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as RedraftRequest;

    const instruction = body.instruction?.trim();
    if (!instruction) {
      return NextResponse.json(
        { error: "A revision instruction is required." },
        { status: 400 }
      );
    }

    const slide = body.slide;
    if (!slide) {
      return NextResponse.json({ error: "A slide is required." }, { status: 400 });
    }

    const deck = body.deck;
    if (!deck) {
      return NextResponse.json({ error: "Deck context is required." }, { status: 400 });
    }

    const neighborHeadings = Array.isArray(body.neighborHeadings)
      ? body.neighborHeadings.filter(
          (heading): heading is string => typeof heading === "string" && heading.trim() !== ""
        )
      : [];

    const prompt = buildRedraftPrompt({
      deck: {
        title: deck.title ?? "",
        brief: deck.brief ?? "",
        audience: deck.audience ?? "internal",
        voiceId: deck.voiceId ?? "executive-brief",
        contextDoc: deck.contextDoc ?? null,
      },
      slide,
      slideNumber: body.slideNumber ?? 1,
      totalSlides: body.totalSlides ?? 1,
      instruction,
      neighborHeadings,
    });

    // One retry when the model's output fails validation — flash-tier models
    // occasionally wrap the JSON in prose; a second attempt usually lands.
    let result = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await client.models.generateContent({
        model: textModel(),
        contents: prompt,
      });
      result = parseSlideRedraft(responseText(response));
      if (result.ok) {
        break;
      }
    }

    if (!result || !result.ok) {
      return NextResponse.json(
        { error: result?.error ?? "The model did not return a usable slide." },
        { status: 502 }
      );
    }

    // Keep the original slide's identity and generated image: a text revision
    // must not orphan the image or break React keys downstream.
    const revised: Slide = {
      ...result.value,
      id: slide.id,
      imageData: slide.imageData,
    };

    return NextResponse.json({ slide: revised });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong while redrafting.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
