import path from "node:path";

import { NextResponse } from "next/server";
import pptxgen from "pptxgenjs";

import { mapDeckToSpecs } from "../../../lib/pptx-map";
import type { Deck } from "../../../lib/types";

/** Lowercase alphanumerics and hyphens only; falls back to "valon-deck". */
function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "valon-deck";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { deck?: Deck };
    const deck = body.deck;

    if (!deck || !deck.slides?.length) {
      return NextResponse.json({ error: "No slides to export." }, { status: 400 });
    }

    const marks = {
      light: path.join(process.cwd(), "public/brand/logo-wordmark.svg"),
      dark: path.join(process.cwd(), "public/brand/logo-wordmark-white.svg")
    };

    const specs = mapDeckToSpecs(deck, marks);

    const pptx = new pptxgen();
    pptx.layout = "LAYOUT_WIDE";
    pptx.author = "Valon";
    pptx.company = "Valon";
    pptx.title = deck.title;

    for (const spec of specs) {
      const slide = pptx.addSlide();
      slide.background = { color: spec.background };

      for (const shape of spec.shapes) {
        slide.addShape("rect", {
          x: shape.x,
          y: shape.y,
          w: shape.w,
          h: shape.h,
          fill: { color: shape.fill },
          line: { type: "none" }
        });
      }

      for (const text of spec.texts) {
        slide.addText(text.text, {
          x: text.x,
          y: text.y,
          w: text.w,
          h: text.h,
          fontFace: text.fontFace,
          fontSize: text.fontSize,
          color: text.color,
          bold: text.bold,
          align: text.align,
          valign: text.valign,
          ...(text.bullet ? { bullet: { code: "2022" }, lineSpacing: text.lineSpacing } : {})
        });
      }

      for (const image of spec.images) {
        if (image.isData) {
          slide.addImage({ data: image.path, x: image.x, y: image.y, w: image.w, h: image.h });
        } else {
          slide.addImage({ path: image.path, x: image.x, y: image.y, w: image.w, h: image.h });
        }
      }
    }

    const file = await pptx.write({ outputType: "nodebuffer" });

    let responseBody: BodyInit;

    if (typeof file === "string" || file instanceof Blob || file instanceof ArrayBuffer) {
      responseBody = file;
    } else {
      const arrayBuffer = new ArrayBuffer(file.byteLength);
      new Uint8Array(arrayBuffer).set(file);
      responseBody = arrayBuffer;
    }

    return new Response(responseBody, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${slugify(deck.title)}.pptx"`
      }
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong while exporting.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
