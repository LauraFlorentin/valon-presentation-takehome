"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { appendEvalRun, saveDeck } from "../../lib/storage";
import { defaultVoiceFor, VOICES } from "../../lib/voices";
import type {
  Audience,
  ContextDoc,
  Deck,
  EvalRun,
  Slide,
  VoiceId,
} from "../../lib/types";

type DraftResponse = { deckTitle?: string; slides?: Slide[]; error?: string };

/**
 * Fire the brand-check eval for a freshly drafted deck. Non-blocking by
 * design (decision: the verdict is information, not a gate) — the row lands
 * in the Evals tab whenever it completes.
 */
function fireEval(deck: Deck, trigger: "draft" | "redraft"): void {
  void fetch("/api/eval", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deck: {
        id: deck.id,
        title: deck.title,
        audience: deck.audience,
        voiceId: deck.voiceId,
        brief: deck.brief,
        contextDoc: deck.contextDoc,
      },
      slides: deck.slides,
      trigger,
    }),
  })
    .then(async (response) => {
      const payload = (await response.json()) as { evalRun?: EvalRun };
      if (payload.evalRun) {
        appendEvalRun(payload.evalRun);
      }
    })
    .catch(() => {
      // Non-blocking: a failed eval never interrupts authoring.
    });
}

export default function NewPresentationPage() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [brief, setBrief] = useState("");
  const [audience, setAudience] = useState<Audience>("internal");
  const [voiceId, setVoiceId] = useState<VoiceId>(defaultVoiceFor("internal").id);
  const [voiceTouched, setVoiceTouched] = useState(false);
  const [targetLength, setTargetLength] = useState(8);
  const [contextDoc, setContextDoc] = useState<ContextDoc | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState("");

  function pickAudience(next: Audience) {
    setAudience(next);
    if (!voiceTouched) {
      setVoiceId(defaultVoiceFor(next).id);
    }
  }

  async function handleFile(file: File) {
    setExtracting(true);
    setError("");

    try {
      const form = new FormData();
      form.append("file", file);

      const response = await fetch("/api/extract", { method: "POST", body: form });
      const payload = (await response.json()) as ContextDoc & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not read the document.");
      }

      setContextDoc({
        filename: payload.filename,
        text: payload.text,
        truncated: payload.truncated,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read the document.");
    } finally {
      setExtracting(false);
      if (fileInput.current) {
        fileInput.current.value = "";
      }
    }
  }

  async function draftDeck() {
    if (!brief.trim()) {
      setError("Add a brief first — it is what the deck gets drafted from.");
      return;
    }

    setDrafting(true);
    setError("");

    try {
      const response = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: brief.trim(),
          audience,
          voiceId,
          targetLength,
          contextDoc,
        }),
      });

      const payload = (await response.json()) as DraftResponse;

      if (!response.ok || !payload.slides?.length) {
        throw new Error(payload.error ?? "Drafting failed.");
      }

      const now = new Date().toISOString();
      const deck: Deck = {
        id: crypto.randomUUID(),
        title: payload.deckTitle || brief.trim().slice(0, 60),
        brief: brief.trim(),
        audience,
        voiceId,
        targetLength,
        contextDoc,
        slides: payload.slides,
        createdAt: now,
        updatedAt: now,
      };

      saveDeck(deck);
      fireEval(deck, "draft");
      router.push(`/decks/${deck.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Drafting failed.");
      setDrafting(false);
    }
  }

  if (drafting) {
    return (
      <main className="page">
        <div className="drafting-panel">
          <span className="spinner" />
          <h2>Drafting your deck</h2>
          <p>
            Writing {targetLength} slides in the {VOICES.find((v) => v.id === voiceId)?.name}{" "}
            voice{contextDoc ? `, grounded in ${contextDoc.filename}` : ""}. The brand check
            runs automatically and lands in Evals.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">New presentation</p>
          <h1>Set the standards first</h1>
          <p className="lede">
            Audience and voice are established before a single slide exists — every
            draft, revision, and brand check follows them.
          </p>
        </div>
      </div>

      <div className="form-card">
        <div className="field">
          <label className="field-label" htmlFor="brief">
            Brief
          </label>
          <textarea
            id="brief"
            rows={5}
            placeholder="What is this presentation about, and what should it achieve? e.g. Quarterly servicing performance update for the leadership team, focused on portfolio growth and customer-satisfaction wins."
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
          />
        </div>

        <div className="field-row">
          <div className="field">
            <span className="field-label">Audience</span>
            <div className="segmented" role="group" aria-label="Audience">
              <button
                className={audience === "internal" ? "active" : ""}
                onClick={() => pickAudience("internal")}
                type="button"
              >
                Internal
              </button>
              <button
                className={audience === "external" ? "active" : ""}
                onClick={() => pickAudience("external")}
                type="button"
              >
                External
              </button>
            </div>
            <span className="field-hint">
              External decks default to a plain-English, client-safe voice.
            </span>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="voice">
              Voice
            </label>
            <select
              id="voice"
              value={voiceId}
              onChange={(event) => {
                setVoiceId(event.target.value as VoiceId);
                setVoiceTouched(true);
              }}
            >
              {VOICES.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name} — {voice.description}
                </option>
              ))}
            </select>
            <span className="field-hint">
              The voice sets the writing rules the brand check enforces.
            </span>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor="length">
              Length
            </label>
            <input
              id="length"
              type="number"
              min={3}
              max={15}
              value={targetLength}
              onChange={(event) => {
                const next = Number.parseInt(event.target.value, 10);
                setTargetLength(Number.isNaN(next) ? 8 : Math.min(15, Math.max(3, next)));
              }}
            />
            <span className="field-hint">3–15 slides.</span>
          </div>

          <div className="field">
            <span className="field-label">Context document (optional)</span>
            <div className="upload-slot">
              {contextDoc ? (
                <>
                  <div>
                    <div className="filename">{contextDoc.filename}</div>
                    <div className="filemeta">
                      {contextDoc.truncated
                        ? "Long document — the first section will be used."
                        : "The draft will address this document."}
                    </div>
                  </div>
                  <button
                    className="button-ghost button-small"
                    onClick={() => setContextDoc(null)}
                    type="button"
                  >
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <div className="filemeta">
                    PDF or Word document the deck should address.
                  </div>
                  <button
                    className="button-ghost button-small"
                    disabled={extracting}
                    onClick={() => fileInput.current?.click()}
                    type="button"
                  >
                    {extracting ? "Reading…" : "Attach"}
                  </button>
                </>
              )}
              <input
                ref={fileInput}
                type="file"
                accept=".pdf,.docx"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleFile(file);
                  }
                }}
              />
            </div>
          </div>
        </div>

        <div>
          <button className="button-gold" disabled={extracting} onClick={() => void draftDeck()} type="button">
            Draft the deck
          </button>
        </div>
      </div>

      {error ? <div className="status-line error">{error}</div> : null}
    </main>
  );
}
