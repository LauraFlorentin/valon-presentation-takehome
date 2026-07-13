import { describe, expect, it } from "vitest";
import { parseDeckDraft } from "../lib/deck-schema";

const validDraft = {
  deckTitle: "Q3 Servicing Review",
  slides: [
    {
      layout: "title",
      heading: "Q3 Servicing Review",
      subheading: "What we shipped and what it saved",
    },
    {
      layout: "content",
      heading: "Portfolio growth",
      bullets: ["Loans serviced up 18%", "Onboarding time cut to 4 days"],
      imageIdea: "abstract upward gold line on cream",
    },
    {
      layout: "content",
      heading: "Cost per loan",
      bullets: ["Servicing cost down 12%", "Zero-touch payoffs at 41%", "Call volume flat"],
    },
    {
      layout: "section",
      heading: "What comes next",
    },
  ],
};

describe("parseDeckDraft", () => {
  it("parses a well-formed draft, preserving headings, bullets, and imageIdea", () => {
    const result = parseDeckDraft(JSON.stringify(validDraft));

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);

    expect(result.value.deckTitle).toBe("Q3 Servicing Review");
    expect(result.value.slides).toHaveLength(4);
    expect(result.value.slides.map((s) => s.layout)).toEqual([
      "title",
      "content",
      "content",
      "section",
    ]);
    expect(result.value.slides.map((s) => s.heading)).toEqual([
      "Q3 Servicing Review",
      "Portfolio growth",
      "Cost per loan",
      "What comes next",
    ]);
    expect(result.value.slides[0].subheading).toBe("What we shipped and what it saved");
    expect(result.value.slides[1].bullets).toEqual([
      "Loans serviced up 18%",
      "Onboarding time cut to 4 days",
    ]);
    expect(result.value.slides[1].imageIdea).toBe("abstract upward gold line on cream");
    expect(result.value.slides[2].bullets).toHaveLength(3);

    // Same payload wrapped in markdown fences parses identically.
    const fenced = "```json\n" + JSON.stringify(validDraft) + "\n```";
    const fencedResult = parseDeckDraft(fenced);
    expect(fencedResult.ok).toBe(true);
    if (!fencedResult.ok) throw new Error(fencedResult.error);
    expect(fencedResult.value.deckTitle).toBe("Q3 Servicing Review");
    expect(fencedResult.value.slides).toHaveLength(4);
  });

  it("rejects malformed JSON with a readable error", () => {
    const result = parseDeckDraft("{nope");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.error).toBe("The model returned malformed JSON instead of a deck draft.");
  });

  it("rejects an unknown layout and names the offending slide number", () => {
    const draft = {
      deckTitle: "Bad layout deck",
      slides: [
        { layout: "title", heading: "Cover" },
        { layout: "banana", heading: "Fruit slide" },
      ],
    };

    const result = parseDeckDraft(JSON.stringify(draft));

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.error).toContain("Slide 2");
  });

  it("defaults a missing heading to 'Untitled slide' instead of failing", () => {
    const draft = {
      deckTitle: "Resilient deck",
      slides: [
        { layout: "title", heading: "Cover" },
        { layout: "content", bullets: ["One point survives"] },
      ],
    };

    const result = parseDeckDraft(JSON.stringify(draft));

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    expect(result.value.slides[1].heading).toBe("Untitled slide");
    expect(result.value.slides[1].bullets).toEqual(["One point survives"]);
  });
});
