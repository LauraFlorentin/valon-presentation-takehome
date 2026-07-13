import type { Deck, EvalRun } from "./types";

/**
 * localStorage-backed deck library + eval log (ADR-0002).
 * Fresh keys: the starter's single-deck format is incompatible and discarded.
 * All functions are safe to call during SSR (no-op / empty results).
 */

const DECKS_KEY = "valon-deck-studio:decks:v1";
const EVALS_KEY = "valon-deck-studio:evals:v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

// --- Decks ---

export function listDecks(): Deck[] {
  return readJson<Deck[]>(DECKS_KEY, []).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
}

export function getDeck(id: string): Deck | null {
  return readJson<Deck[]>(DECKS_KEY, []).find((deck) => deck.id === id) ?? null;
}

export function saveDeck(deck: Deck): Deck {
  const stamped: Deck = { ...deck, updatedAt: new Date().toISOString() };
  const decks = readJson<Deck[]>(DECKS_KEY, []);
  const index = decks.findIndex((d) => d.id === deck.id);

  if (index === -1) {
    decks.push(stamped);
  } else {
    decks[index] = stamped;
  }

  writeJson(DECKS_KEY, decks);
  return stamped;
}

export function deleteDeck(id: string): void {
  writeJson(
    DECKS_KEY,
    readJson<Deck[]>(DECKS_KEY, []).filter((deck) => deck.id !== id)
  );
}

// --- Eval runs ---

export function listEvalRuns(): EvalRun[] {
  return readJson<EvalRun[]>(EVALS_KEY, []).sort((a, b) => b.date.localeCompare(a.date));
}

export function appendEvalRun(run: EvalRun): void {
  const runs = readJson<EvalRun[]>(EVALS_KEY, []);
  runs.push(run);
  writeJson(EVALS_KEY, runs);
}
