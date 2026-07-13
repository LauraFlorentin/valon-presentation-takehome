# Valon Deck Studio

A take-home submission that rebuilds the starter into a **Valon-internal deck
authoring tool**: describe what you need, establish the standards first, and the
AI drafts a complete on-brand presentation — with a brand-check audit trail and
a real PowerPoint at the end.

## The product

1. **Set the standards first.** A new presentation starts with a one-screen
   setup: a brief, the audience (internal/external), a **voice** (named writing
   standards baked into the app), target length, and optionally a **context
   document** (PDF/Word) the deck must address.
2. **The AI drafts the whole deck** — structured slides (title / content /
   section layouts), written in the established voice, grounded in the context
   document when provided. Never text baked into images.
3. **Refine like an author.** Edit any text inline on the canvas, or ask the AI
   to revise one slide with an instruction ("tighter — lead with the number").
   Revisions keep the deck's voice and context.
4. **Governance is automatic.** Every draft and revision triggers a brand
   check against the voice rules. Results land in the **Evals** tab as an
   audit trail: date · document · verdict · findings. Verdicts inform — they
   never block.
5. **Supporting imagery on demand.** The draft proposes image ideas where they
   help; one click generates a brand-styled, text-free illustration (the
   starter's hidden Comic Sans sabotage appendix is deleted — the brand style
   layer is documented in `.claude/skills/valon-brand/SKILL.md`).
6. **Export a real deck.** The `.pptx` has editable text in Valon brand
   styling, the wordmark on non-cover slides, and no internal metadata leaked
   onto slides.

Decks accumulate in a **Library** (localStorage — see ADR-0002).

## Setup

```bash
npm install
cp .env.example .env.local   # add GOOGLE_API_KEY
npm run dev                  # http://localhost:3000
```

Optional env overrides: `GOOGLE_TEXT_MODEL` (default `gemini-3-flash-preview`),
`GOOGLE_IMAGE_MODEL` (default `gemini-3-pro-image-preview`).

```bash
npm test        # 10 targeted checks on the fragile seams
npm run typecheck
```

## How it's built

- **Domain model** in `lib/types.ts`; vocabulary in [`CONTEXT.md`](./CONTEXT.md).
- **AI seams are guarded**: model output never becomes state without passing a
  validator (`lib/deck-schema.ts`, `lib/eval-schema.ts`). Malformed responses
  produce clean errors; unknown eval verdicts degrade to `needs-revision`.
- **Every prompt is documented** in `lib/prompts.ts` — nothing hidden.
- **Export is a pure mapping** (`lib/pptx-map.ts`) from slides to a declarative
  spec, unit-tested without touching pptxgenjs.
- **Design system**: `.claude/skills/valon-brand/` (sampled from valon.ai, with
  provenance in its MANIFEST). Same tokens drive the UI, the editor canvas,
  generated imagery, and the PPTX.
- **Decisions** are recorded in [`docs/adr/`](./docs/adr). The AI-native
  workflow trail (issues, agent config) lives in the repo and the fork's issue
  tracker.

## Consciously descoped

- Server-side persistence and multi-user (localStorage per ADR-0002)
- Editable/creatable voice standards (baked-in by decision; a governance
  admin surface is the natural next step)
- Richer layouts (two-column, quote, stat — ADR-0004), drag-reorder, undo
- Deck-level chat refinement (per-slide instruction revision shipped instead)

## Tests

Ten checks on the three seams that actually break: AI draft validation, eval
row construction, and slide→PPTX mapping. Run `npm test`.
