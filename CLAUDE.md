# Valon Deck Studio

AI deck-authoring tool: Next.js 16 (App Router) + React 19 + TypeScript. Gemini
drafts full decks as structured JSON and generates supporting imagery via
`@google/genai`; `pptxgenjs` exports branded, editable-text decks. State lives
client-side in localStorage (no database — ADR-0002).

## Commands

- Dev server: `npm run dev` (http://localhost:3000)
- Typecheck: `npm run typecheck` — run after every change
- Tests: `npm test` — vitest over the AI-seam validators and export mapping
- Build check: `npm run build`

## Architecture

- `app/page.tsx` — Library: every deck with audience/voice metadata.
- `app/new/page.tsx` — setup screen: brief, audience, voice, length, optional
  context document. Standards are established BEFORE drafting.
- `app/decks/[id]/page.tsx` — editor: slide rail, 16:9 canvas (3 layouts,
  inline editing), AI revise-per-slide, on-demand supporting images.
- `app/evals/page.tsx` — Evals tab: brand-check audit trail
  (date · document · verdict · findings).
- `app/api/draft|redraft|eval/route.ts` — Gemini text calls; every response
  passes a validator in `lib/` before becoming state.
- `app/api/extract/route.ts` — PDF/DOCX text extraction (unpdf, mammoth).
- `app/api/generate/route.ts` — Gemini image model; the only routes reading
  `GOOGLE_API_KEY` are the API routes via `lib/gemini.ts`.
- `app/api/export/route.ts` — renders `lib/pptx-map.ts` specs with pptxgenjs
  (13.333 × 7.5 in, LAYOUT_WIDE).
- `lib/` — domain types, voices, prompt builders, validators, storage,
  pure pptx mapping. Business logic lives here, unit-tested.
- `app/globals.css` — plain CSS with custom properties, no Tailwind. Keep it
  that way.
- `.claude/skills/valon-brand/` — brand/design-system skill. **Consult it
  before touching image-prompt styling, CSS tokens, or pptx export styling.**
- `CONTEXT.md` — the ubiquitous language; use its terms in code and copy.
- `docs/adr/` — decisions; flag conflicts rather than silently overriding.

## Environment

- `.env.local` from `.env.example`: `GOOGLE_API_KEY` (required),
  `GOOGLE_TEXT_MODEL` (optional, default `gemini-3-flash-preview`),
  `GOOGLE_IMAGE_MODEL` (optional, default `gemini-3-pro-image-preview`).
- Never read env vars in client components. Never commit `.env.local`.
- Reviewers will clone, drop in keys, and run — any new setup step must go in
  README "Setup" and stay under 3 commands.

## Rules

- Slide dimensions are 16:9 everywhere: canvas via container queries, pptx in
  inches on the 13.333 × 7.5 grid.
- Slide text (headings, bullets) is exported as editable PowerPoint text —
  never rasterized into images; generated images carry no text.
- Prompts, briefs, and internal metadata never appear on the slide face.
- All Gemini output passes a validator (`lib/deck-schema.ts`,
  `lib/eval-schema.ts`) before use; handle refusals and prose-wrapped JSON
  explicitly. Eval failures degrade to a `needs-revision` row, never a gap.
- Images are large base64 data URLs stored in localStorage under guarded
  writes (ADR-0002); never log them.
- Storage keys are versioned (`valon-deck-studio:*:v1`); bump the version and
  write a migration rather than mutating the shape in place.
- User-visible copy is professional and plain — no jokes, no filler words.
- One gold accent per surface; all neutrals from the warm base scale (see the
  brand skill's do-not list).

## Workflow

- Plan mode before any multi-file change; one feature per session.
- Commit style: atomic, imperative, with a one-line "why". Reference the
  GitHub issue the change delivers (`Closes #N` / `Part of #N`).
- After each task: `npm run typecheck` && `npm test`, then manually verify
  the draft → edit → eval → export path still works.
- Log notable tradeoffs in `docs/adr/` (significant, hard-to-reverse) as you go.

## Agent skills

### Issue tracker

Issues and PRDs live as GitHub issues on this repo, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout — one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
