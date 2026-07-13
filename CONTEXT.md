# Valon Deck Studio

A Valon-internal tool that drafts on-brand presentations from a brief, under
standards established before drafting, with a brand-check audit trail.

## Language

**Deck**:
A presentation in the library: brief, audience, voice, slides, and optional context document.
_Avoid_: presentation file, project

**Slide**:
One unit of a deck with exactly one layout: `title`, `content`, or `section`.
_Avoid_: page, canvas

**Brief**:
The author's free-text statement of what the deck is about and should achieve; the drafting input.
_Avoid_: prompt, topic

**Audience**:
Who the deck is for — `internal` or `external`. Chosen at setup; drives the default voice.

**Voice**:
A named set of writing rules (baked into `lib/voices.ts`) the AI must follow when drafting and revising. The standard the brand check enforces.
_Avoid_: tone, style (style refers to visuals)

**Context document**:
One PDF/DOCX attached at setup whose extracted text the deck must address.
_Avoid_: upload, attachment

**Draft**:
The AI's initial generation of a full deck from the brief. A deck is drafted once, then revised.

**Redraft**:
An AI revision of a single slide under an author instruction, keeping deck context and voice.
_Avoid_: regenerate, retry

**Brand check**:
The automatic LLM evaluation of a deck against its voice rules after every draft and redraft.
_Avoid_: review, lint

**Eval run**:
One logged brand-check result: date · document · verdict · findings. Rows live in the Evals tab.
_Avoid_: audit entry, log line

**Verdict**:
The brand check's overall judgment: `on-brand` or `needs-revision`. Informational, never a gate.

**Finding**:
One specific issue in an eval run, optionally pinned to a slide number.

**Supporting image**:
An AI-generated, text-free, brand-styled illustration placed inside a content slide. Never a full slide.
_Avoid_: slide image, background
