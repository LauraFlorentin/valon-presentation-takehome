import type { Deck, EvalRun } from "./types";

/**
 * localStorage-backed deck library + eval log (ADR-0002).
 * Fresh keys: the starter's single-deck format is incompatible and discarded.
 * All functions are safe to call during SSR (no-op / empty results).
 */

const DECKS_KEY = "valon-deck-studio:decks:v1";
const EVALS_KEY = "valon-deck-studio:evals:v1";

function isBrowser(): boolean {
  try {
    // The localStorage accessor itself throws when storage is blocked
    // (Safari "Block all cookies", some webviews) — not just its methods.
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
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
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (cause) {
    // Most likely QuotaExceededError: decks carry ~1 MB image data URLs
    // (ADR-0002). Never crash the editor over a failed persist.
    console.warn("Deck Studio: could not persist to localStorage.", cause);
  }
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
