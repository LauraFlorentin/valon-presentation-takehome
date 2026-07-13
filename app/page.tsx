"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDate } from "../lib/format";
import { deleteDeck, listDecks } from "../lib/storage";
import { getVoice } from "../lib/voices";
import type { Deck } from "../lib/types";

export default function LibraryPage() {
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    setDecks(listDecks());
    setLoaded(true);
  }, []);

  function removeDeck(id: string) {
    if (confirmingId !== id) {
      setConfirmingId(id);
      return;
    }
    deleteDeck(id);
    setConfirmingId(null);
    setDecks(listDecks());
  }

  if (!loaded) {
    return <main className="page" />;
  }

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Library</p>
          <h1>Presentations</h1>
          <p className="lede">
            Every deck created in Deck Studio, with the audience and voice it was
            drafted under. Brand-check results live in the Evals tab.
          </p>
        </div>
        <Link href="/new" className="button-gold">
          New presentation
        </Link>
      </div>

      {decks.length === 0 ? (
        <div className="empty-state">
          <h3>No presentations yet</h3>
          <p>
            Start a new presentation: set the audience and voice, add a brief, and
            Deck Studio drafts the full deck for you.
          </p>
          <Link href="/new" className="button-primary">
            Draft your first deck
          </Link>
        </div>
      ) : (
        <div className="deck-grid">
          {decks.map((deck) => (
            <div className="deck-card" key={deck.id}>
              <h3>{deck.title}</h3>
              <div className="meta">
                <span className="tag gold">{getVoice(deck.voiceId).name}</span>
                <span className="tag">{deck.audience}</span>
                <span className="tag">
                  {deck.slides.length} slide{deck.slides.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="card-actions">
                <span className="field-hint">Edited {formatDate(deck.updatedAt)}</span>
                <div>
                  <button
                    className="button-ghost button-small"
                    onClick={() => removeDeck(deck.id)}
                    onBlur={() => setConfirmingId(null)}
                    type="button"
                  >
                    {confirmingId === deck.id ? "Really delete?" : "Delete"}
                  </button>{" "}
                  <button
                    className="button-primary button-small"
                    onClick={() => router.push(`/decks/${deck.id}`)}
                    type="button"
                  >
                    Open
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
