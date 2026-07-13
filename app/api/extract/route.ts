import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { CONTEXT_DOC_CHAR_CAP } from "../../../lib/types";
import type { ContextDoc } from "../../../lib/types";

/**
 * Context-document text extraction. Accepts one PDF or Word (.docx) upload,
 * returns a ContextDoc. Raw bytes never persist — only the extracted text
 * (capped at CONTEXT_DOC_CHAR_CAP) leaves this route.
 */

// mammoth and unpdf need Node APIs, not the edge runtime.
export const runtime = "nodejs";

const MAX_FILE_BYTES = 15 * 1024 * 1024;

/** Collapse runs of 3+ newlines to 2 and trim the ends. */
function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "File is larger than the 15 MB limit." },
        { status: 413 }
      );
    }

    const lowerName = file.name.toLowerCase();
    const isPdf = lowerName.endsWith(".pdf");
    const isDocx = lowerName.endsWith(".docx");

    if (!isPdf && !isDocx) {
      return NextResponse.json(
        { error: "Only PDF and Word (.docx) documents are supported." },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    let rawText: string;

    if (isPdf) {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractText(pdf, { mergePages: true });
      rawText = text;
    } else {
      const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
      rawText = value;
    }

    const normalized = normalizeWhitespace(rawText);

    if (!normalized) {
      return NextResponse.json(
        { error: "No readable text found in the document." },
        { status: 422 }
      );
    }

    const truncated = normalized.length > CONTEXT_DOC_CHAR_CAP;

    const contextDoc: ContextDoc = {
      filename: file.name,
      text: truncated ? normalized.slice(0, CONTEXT_DOC_CHAR_CAP) : normalized,
      truncated
    };

    return NextResponse.json(contextDoc);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong while extracting.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
