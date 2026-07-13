import { stripCodeFences } from "./deck-schema";
import type { Deck, EvalFinding, EvalRun, EvalTrigger, Verdict } from "./types";

/**
 * Builds Evals-tab rows (date · document · verdict · findings) from raw
 * eval-model output. Degrades safely: an unrecognized verdict is treated as
 * "needs-revision", never a crash — better a false alarm than false confidence.
 */

function parseVerdict(value: unknown): Verdict {
  return value === "on-brand" ? "on-brand" : "needs-revision";
}

function parseFindings(value: unknown): EvalFinding[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const findings: EvalFinding[] = [];

  for (const raw of value) {
    if (typeof raw === "string" && raw.trim()) {
      findings.push({ slideNumber: null, issue: raw.trim() });
      continue;
    }

    if (typeof raw === "object" && raw !== null) {
      const record = raw as Record<string, unknown>;
      const issue = typeof record.issue === "string" ? record.issue.trim() : "";
      if (!issue) {
        continue;
      }
      const slideNumber =
        typeof record.slide === "number" && Number.isInteger(record.slide) && record.slide > 0
          ? record.slide
          : null;
      findings.push({ slideNumber, issue });
    }
  }

  return findings;
}

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

export function buildEvalRun(
  deck: Pick<Deck, "id" | "title" | "contextDoc">,
  trigger: EvalTrigger,
  rawModelOutput: string,
  now: Date = new Date()
): EvalRun {
  let verdict: Verdict = "needs-revision";
  let findings: EvalFinding[] = [
    { slideNumber: null, issue: "Brand check did not return a readable result." },
  ];

  try {
    const parsed: unknown = JSON.parse(stripCodeFences(rawModelOutput));
    if (typeof parsed === "object" && parsed !== null) {
      const record = parsed as Record<string, unknown>;
      verdict = parseVerdict(record.verdict);
      findings = parseFindings(record.findings);
    }
  } catch {
    // keep the safe defaults above
  }

  return {
    id: newId(),
    deckId: deck.id,
    deckTitle: deck.title,
    contextFilename: deck.contextDoc?.filename ?? null,
    trigger,
    date: now.toISOString(),
    verdict,
    findings,
  };
}
