import { describe, expect, it } from "vitest";
import { buildEvalRun } from "../lib/eval-schema";
import type { ContextDoc, Deck } from "../lib/types";

const contextDoc: ContextDoc = {
  filename: "q3-briefing.pdf",
  text: "Quarterly servicing highlights.",
  truncated: false,
};

const deckWithContext: Pick<Deck, "id" | "title" | "contextDoc"> = {
  id: "deck-1",
  title: "Q3 Servicing Review",
  contextDoc,
};

const deckWithoutContext: Pick<Deck, "id" | "title" | "contextDoc"> = {
  id: "deck-2",
  title: "Homeowner Onboarding",
  contextDoc: null,
};

const FIXED_DATE = new Date("2026-07-13T09:30:00.000Z");

describe("buildEvalRun", () => {
  it("maps a clean on-brand result and copies deck metadata", () => {
    const raw = JSON.stringify({ verdict: "on-brand", findings: [] });

    const run = buildEvalRun(deckWithContext, "draft", raw, FIXED_DATE);

    expect(run.verdict).toBe("on-brand");
    expect(run.findings).toEqual([]);
    expect(run.deckId).toBe("deck-1");
    expect(run.deckTitle).toBe("Q3 Servicing Review");
    expect(run.contextFilename).toBe("q3-briefing.pdf");
    expect(run.trigger).toBe("draft");
    expect(run.date).toBe("2026-07-13T09:30:00.000Z");
  });

  it("degrades an unknown verdict to needs-revision", () => {
    const raw = JSON.stringify({ verdict: "amazing!!", findings: [] });

    const run = buildEvalRun(deckWithoutContext, "redraft", raw, FIXED_DATE);

    expect(run.verdict).toBe("needs-revision");
    expect(run.contextFilename).toBeNull();
  });

  it("normalizes mixed findings and falls back safely on unreadable output", () => {
    const raw = JSON.stringify({
      verdict: "needs-revision",
      findings: [{ slide: 3, issue: "jargon — LTV" }, "deck-level issue string"],
    });

    const run = buildEvalRun(deckWithContext, "redraft", raw, FIXED_DATE);

    expect(run.verdict).toBe("needs-revision");
    expect(run.findings).toHaveLength(2);
    expect(run.findings[0]).toEqual({ slideNumber: 3, issue: "jargon — LTV" });
    expect(run.findings[1]).toEqual({ slideNumber: null, issue: "deck-level issue string" });

    const fallback = buildEvalRun(deckWithContext, "draft", "not json", FIXED_DATE);
    expect(fallback.verdict).toBe("needs-revision");
    expect(fallback.findings).toEqual([
      { slideNumber: null, issue: "Brand check did not return a readable result." },
    ]);
  });
});
