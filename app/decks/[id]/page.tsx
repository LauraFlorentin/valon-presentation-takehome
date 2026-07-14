"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { appendEvalRun, getDeck, saveDeck } from "../../../lib/storage";
import { getVoice } from "../../../lib/voices";
import type { Deck, EvalRun, Slide, SlideLayout } from "../../../lib/types";

type Status = { text: string; error?: boolean } | null;

function newSlide(layout: SlideLayout): Slide {
  return {
    id: crypto.randomUUID(),
    layout,
    heading: layout === "section" ? "A statement worth its own slide" : "New slide",
    bullets: layout === "content" ? ["First point"] : [],
  };
}

export default function DeckEditorPage() {
  const params = useParams<{ id: string }>();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [missing, setMissing] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [redraftInstruction, setRedraftInstruction] = useState("");
  const [redrafting, setRedrafting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const found = getDeck(params.id);
    if (!found) {
      setMissing(true);
      return;
    }
    setDeck(found);
    setSelectedId(found.slides[0]?.id ?? "");
  }, [params.id]);

  function flash(text: string, error = false) {
    setStatus({ text, error });
    if (statusTimer.current) {
      clearTimeout(statusTimer.current);
    }
    statusTimer.current = setTimeout(() => setStatus(null), 5000);
  }

  /** Single write path: every mutation persists through here. */
  function updateDeck(mutate: (current: Deck) => Deck) {
    setDeck((current) => {
      if (!current) {
        return current;
      }
      const next = mutate(current);
      return saveDeck(next);
    });
  }

  function patchSlide(id: string, patch: Partial<Slide>) {
    updateDeck((current) => ({
      ...current,
      slides: current.slides.map((slide) =>
        slide.id === id ? { ...slide, ...patch } : slide
      ),
    }));
  }

  function fireEval(current: Deck, trigger: "draft" | "redraft") {
    void fetch("/api/eval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deck: {
          id: current.id,
          title: current.title,
          audience: current.audience,
          voiceId: current.voiceId,
          brief: current.brief,
          contextDoc: current.contextDoc,
        },
        slides: current.slides,
        trigger,
      }),
    })
      .then(async (response) => {
        const payload = (await response.json()) as { evalRun?: EvalRun };
        if (payload.evalRun) {
          appendEvalRun(payload.evalRun);
          flash(
            payload.evalRun.verdict === "on-brand"
              ? "Brand check: on-brand. Logged to Evals."
              : "Brand check: needs revision — see the Evals tab."
          );
        }
      })
      .catch(() => {
        // Non-blocking by design.
      });
  }

  if (missing) {
    return (
      <main className="page">
        <div className="empty-state">
          <h3>Deck not found</h3>
          <p>It may have been deleted from this browser&rsquo;s library.</p>
          <Link href="/" className="button-primary">
            Back to Library
          </Link>
        </div>
      </main>
    );
  }

  if (!deck) {
    return <main className="page" />;
  }

  const selected = deck.slides.find((slide) => slide.id === selectedId) ?? deck.slides[0];
  const selectedIndex = deck.slides.findIndex((slide) => slide.id === selected?.id);

  function addSlide() {
    const slide = newSlide("content");
    updateDeck((current) => {
      const slides = [...current.slides];
      slides.splice(selectedIndex + 1, 0, slide);
      return { ...current, slides };
    });
    setSelectedId(slide.id);
  }

  function removeSlide(id: string) {
    if (!deck) {
      return;
    }
    if (deck.slides.length === 1) {
      flash("A deck needs at least one slide.", true);
      return;
    }
    const index = deck.slides.findIndex((slide) => slide.id === id);
    updateDeck((current) => ({
      ...current,
      slides: current.slides.filter((slide) => slide.id !== id),
    }));
    const remaining = deck.slides.filter((slide) => slide.id !== id);
    setSelectedId(remaining[Math.max(0, index - 1)]?.id ?? "");
  }

  function moveSlide(id: string, direction: -1 | 1) {
    updateDeck((current) => {
      const index = current.slides.findIndex((slide) => slide.id === id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= current.slides.length) {
        return current;
      }
      const slides = [...current.slides];
      [slides[index], slides[target]] = [slides[target], slides[index]];
      return { ...current, slides };
    });
  }

  async function redraftSlide() {
    if (!deck) {
      return;
    }
    if (!selected || !redraftInstruction.trim()) {
      flash("Tell the AI what to change first.", true);
      return;
    }

    setRedrafting(true);

    try {
      const response = await fetch("/api/redraft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deck: {
            title: deck.title,
            brief: deck.brief,
            audience: deck.audience,
            voiceId: deck.voiceId,
            contextDoc: deck.contextDoc,
          },
          slide: selected,
          slideNumber: selectedIndex + 1,
          totalSlides: deck.slides.length,
          instruction: redraftInstruction.trim(),
          neighborHeadings: deck.slides
            .filter((slide) => slide.id !== selected.id)
            .map((slide) => slide.heading),
        }),
      });

      const payload = (await response.json()) as { slide?: Slide; error?: string };

      if (!response.ok || !payload.slide) {
        throw new Error(payload.error ?? "Redraft failed.");
      }

      // Replace the slide wholesale (a merge could never clear fields the
      // model dropped, e.g. a removed subheading), and build the next deck
      // synchronously so the brand check sees the revision — reading
      // localStorage here would race React's batched persist.
      const revised = payload.slide;
      const nextDeck: Deck = {
        ...deck,
        slides: deck.slides.map((slide) => (slide.id === revised.id ? revised : slide)),
      };
      updateDeck(() => nextDeck);
      setRedraftInstruction("");
      flash("Slide revised. Running the brand check…");
      fireEval(nextDeck, "redraft");
    } catch (cause) {
      flash(cause instanceof Error ? cause.message : "Redraft failed.", true);
    } finally {
      setRedrafting(false);
    }
  }

  async function generateImage() {
    if (!selected?.imageIdea?.trim()) {
      flash("Describe the image first.", true);
      return;
    }

    setGenerating(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: selected.imageIdea.trim() }),
      });

      const payload = (await response.json()) as { imageData?: string; error?: string };

      if (!response.ok || !payload.imageData) {
        throw new Error(payload.error ?? "Image generation failed.");
      }

      patchSlide(selected.id, { imageData: payload.imageData });
      flash("Image added to the slide.");
    } catch (cause) {
      flash(cause instanceof Error ? cause.message : "Image generation failed.", true);
    } finally {
      setGenerating(false);
    }
  }

  async function exportDeck() {
    if (!deck) {
      return;
    }
    setExporting(true);

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deck }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Export failed.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${deck.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "valon-deck"}.pptx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      flash("PowerPoint download started.");
    } catch (cause) {
      flash(cause instanceof Error ? cause.message : "Export failed.", true);
    } finally {
      setExporting(false);
    }
  }

  function setBullet(index: number, value: string) {
    if (!selected) {
      return;
    }
    const bullets = [...selected.bullets];
    bullets[index] = value;
    patchSlide(selected.id, { bullets });
  }

  function removeBullet(index: number) {
    if (!selected) {
      return;
    }
    patchSlide(selected.id, {
      bullets: selected.bullets.filter((_, i) => i !== index),
    });
  }

  return (
    <main className="page">
      <div className="editor-bar">
        <input
          aria-label="Deck title"
          className="title-input"
          value={deck.title}
          onChange={(event) => updateDeck((current) => ({ ...current, title: event.target.value }))}
        />
        <span className="tag gold">{getVoice(deck.voiceId).name}</span>
        <span className="tag">{deck.audience}</span>
        {deck.contextDoc ? <span className="tag">ctx: {deck.contextDoc.filename}</span> : null}
        <div className="editor-actions">
          <button className="button-ghost button-small" onClick={addSlide} type="button">
            Add slide
          </button>
          <button
            className="button-primary button-small"
            disabled={exporting}
            onClick={() => void exportDeck()}
            type="button"
          >
            {exporting ? "Exporting…" : "Export .pptx"}
          </button>
        </div>
      </div>

      <div className="editor-shell">
        <div className="slide-rail">
          {deck.slides.map((slide, index) => (
            <button
              className={`rail-thumb ${slide.id === selected?.id ? "active" : ""}`}
              key={slide.id}
              onClick={() => setSelectedId(slide.id)}
              type="button"
            >
              <span className="n">
                {index + 1} · {slide.layout}
              </span>
              <span className="t">{slide.heading}</span>
            </button>
          ))}
        </div>

        <div>
          {selected ? (
            <div className="canvas-16x9">
              {selected.layout === "title" ? (
                <div className="sl sl-title">
                  <hr className="gold-rule" />
                  <input
                    aria-label="Slide heading"
                    className="sl-heading"
                    value={selected.heading}
                    onChange={(event) => patchSlide(selected.id, { heading: event.target.value })}
                  />
                  <input
                    aria-label="Slide subtitle"
                    className="sl-sub"
                    placeholder="Add a subtitle"
                    value={selected.subheading ?? ""}
                    onChange={(event) =>
                      patchSlide(selected.id, { subheading: event.target.value })
                    }
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="Valon" className="sl-wordmark" src="/brand/logo-wordmark.svg" />
                </div>
              ) : null}

              {selected.layout === "content" ? (
                <div className="sl sl-content">
                  <input
                    aria-label="Slide heading"
                    className="sl-heading"
                    value={selected.heading}
                    onChange={(event) => patchSlide(selected.id, { heading: event.target.value })}
                  />
                  <hr className="gold-rule" />
                  <div className="sl-body">
                    <ul className="sl-bullets">
                      {selected.bullets.map((bullet, index) => (
                        <li key={index}>
                          <input
                            aria-label={`Bullet ${index + 1}`}
                            value={bullet}
                            onChange={(event) => setBullet(index, event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Backspace" && bullet === "") {
                                event.preventDefault();
                                removeBullet(index);
                              }
                            }}
                          />
                        </li>
                      ))}
                      <li>
                        <button
                          className="button-ghost button-small"
                          onClick={() =>
                            patchSlide(selected.id, { bullets: [...selected.bullets, ""] })
                          }
                          type="button"
                        >
                          + Bullet
                        </button>
                      </li>
                    </ul>
                    {selected.imageData ? (
                      <div className="sl-image">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img alt={selected.imageIdea ?? "Slide image"} src={selected.imageData} />
                      </div>
                    ) : null}
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt=""
                    className="sl-wordmark-corner"
                    src="/brand/logo-wordmark.svg"
                  />
                </div>
              ) : null}

              {selected.layout === "section" ? (
                <div className="sl sl-section">
                  <hr className="gold-rule" />
                  <textarea
                    aria-label="Section statement"
                    className="sl-heading"
                    rows={3}
                    value={selected.heading}
                    onChange={(event) => patchSlide(selected.id, { heading: event.target.value })}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt=""
                    className="sl-wordmark-corner"
                    src="/brand/logo-wordmark-white.svg"
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="inspector">
          <div className="inspector-card">
            <h3>Revise with AI</h3>
            <textarea
              placeholder='e.g. "Tighter — lead with the number" or "add a bullet about customer satisfaction"'
              rows={3}
              value={redraftInstruction}
              onChange={(event) => setRedraftInstruction(event.target.value)}
            />
            <button
              className="button-primary button-small"
              disabled={redrafting}
              onClick={() => void redraftSlide()}
              type="button"
            >
              {redrafting ? "Revising…" : "Revise this slide"}
            </button>
            <span className="field-hint">
              Keeps the {getVoice(deck.voiceId).name} voice; the brand check re-runs
              automatically.
            </span>
          </div>

          {selected?.layout === "content" ? (
            <div className="inspector-card">
              <h3>Supporting image</h3>
              {selected.imageData ? (
                <>
                  <div className="image-preview">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt="" src={selected.imageData} />
                  </div>
                  <button
                    className="button-ghost button-small"
                    onClick={() => patchSlide(selected.id, { imageData: undefined })}
                    type="button"
                  >
                    Remove image
                  </button>
                </>
              ) : (
                <>
                  <textarea
                    placeholder="Describe the image (the AI may have proposed one)"
                    rows={3}
                    value={selected.imageIdea ?? ""}
                    onChange={(event) =>
                      patchSlide(selected.id, { imageIdea: event.target.value })
                    }
                  />
                  <button
                    className="button-gold button-small"
                    disabled={generating || !selected.imageIdea?.trim()}
                    onClick={() => void generateImage()}
                    type="button"
                  >
                    {generating ? "Generating…" : "Generate image"}
                  </button>
                  <span className="field-hint">
                    Brand-styled, abstract, text-free — per the design system.
                  </span>
                </>
              )}
            </div>
          ) : null}

          {selected ? (
            <div className="inspector-card">
              <h3>Slide</h3>
              <div className="field">
                <label className="field-label" htmlFor="layout-select">
                  Layout
                </label>
                <select
                  id="layout-select"
                  value={selected.layout}
                  onChange={(event) => {
                    const layout = event.target.value as SlideLayout;
                    // Only content slides render images; drop the (multi-MB)
                    // image on switch so it can't linger invisibly in storage.
                    patchSlide(selected.id, {
                      layout,
                      ...(layout !== "content" ? { imageData: undefined } : {}),
                    });
                  }}
                >
                  <option value="title">Title</option>
                  <option value="content">Content</option>
                  <option value="section">Section</option>
                </select>
              </div>
              <div className="editor-actions">
                <button
                  className="button-ghost button-small"
                  disabled={selectedIndex === 0}
                  onClick={() => moveSlide(selected.id, -1)}
                  type="button"
                >
                  ↑ Move up
                </button>
                <button
                  className="button-ghost button-small"
                  disabled={selectedIndex === deck.slides.length - 1}
                  onClick={() => moveSlide(selected.id, 1)}
                  type="button"
                >
                  ↓ Move down
                </button>
              </div>
              <button
                className="button-ghost button-small"
                onClick={() => removeSlide(selected.id)}
                type="button"
              >
                Delete slide
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {status ? (
        <div className={`status-line ${status.error ? "error" : ""}`}>{status.text}</div>
      ) : null}
    </main>
  );
}
