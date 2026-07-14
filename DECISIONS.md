# Decisions & Tradeoffs

A running log of what I found, what I prioritized, and what I deliberately skipped.
Newest entries at the top. One entry per meaningful decision — kept short on purpose.
Bigger, harder-to-reverse decisions get a full ADR in [`docs/adr/`](./docs/adr).

---

## Hardened the AI seams after real-world 502s
**What:** Live redrafts intermittently failed — the dev-server log showed 502s whenever
Gemini wrapped its JSON in prose ("Here is the revised slide: {...}").
**Decision:** Tolerant extraction at every AI seam (fence stripping, outermost-braces
fallback, envelope unwrap) plus one retry on validation failure in the redraft route.
**Tradeoff:** A retry doubles worst-case latency (~9s → ~18s) on hard failures; better
than a dead-end error mid-edit.

## Cross-model review before submission
**What:** Multi-agent adversarial review (six lenses, three verifiers per finding) over
the full diff, then a second-model pass with Codex.
**Decision:** Triage machine findings by hand — nine were real (audit-trail race,
storage quota crash, PPTX bullet overflow…) and fixed; the rest were refuted or
accepted risks for a local tool (prompt injection from a user's own document).
**Tradeoff:** Review costs tokens and time; shipping a governance tool with an
unreviewed audit trail would have been worse.

## Ten targeted tests, not a suite
**What:** The starter had no tests; a take-home doesn't need coverage theater.
**Decision:** Test only the three seams that actually break: AI-draft validation,
eval-row construction, slide→PPTX mapping (13 checks after regressions were added).
**Tradeoff:** No UI/e2e tests — the flows were verified end-to-end against the live
API instead.

## Editable text in the export, nothing internal on the slide face
**What:** The starter exported full-bleed images with text baked in, and printed the
raw prompt in 8pt on every slide.
**Decision:** Slides export as real PowerPoint text in brand styling
(`lib/pptx-map.ts` is a pure, unit-tested mapping); prompts/briefs never render on
slides. See ADR-0004 for the three-layout model.
**Tradeoff / skipped:** Speaker notes (carrying the brief/image ideas) were cut for
time — the natural next increment.

## Auto-eval on every draft and revision, never blocking
**What:** Governance needed to be checkable, not claimed ("audit trail / eval system"
was a core product requirement I set upfront).
**Decision:** Every draft/redraft triggers an LLM brand check against the deck's voice
rules; results land in an Evals tab (date · document · verdict · findings). Verdicts
inform, never gate. Failures degrade to a `needs-revision` row so the trail has no
gaps. (ADR-0003)
**Tradeoff:** One extra model call per generation; a blocked author would just bypass
governance anyway, so informing beats gating.

## One context document grounds the deck
**What:** Decks often need to address an existing memo or report.
**Decision:** Setup accepts one PDF/DOCX; text is extracted once server-side, capped,
stored with the deck, and injected into every draft, redraft, and eval. The filename
travels into the audit trail as provenance.
**Tradeoff:** Single document, text-only (no tables/images), capped length — with the
cap disclosed to the model rather than silently truncated.

## localStorage stays, guarded — no IndexedDB, no migration
**What:** Generated images are ~1 MB data URLs; localStorage has a ~5 MB quota, and
the starter's decks used an incompatible shape.
**Decision:** Keep localStorage (the exercise scopes out persistence) under fresh
versioned keys with guarded writes that degrade instead of crashing. (ADR-0002)
**Tradeoff:** Decks are per-browser and quota-bound; the honest first replacement in
a real deployment is a server store, not a cleverer browser cache.

## Voices are baked-in standards, not user-editable
**What:** "Standards established before drafting" needed a concrete mechanism.
**Decision:** Three voices (Executive Brief, Client Warm, Team Candid) live in code
with explicit do/don't rules; users pick from a dropdown, with a sensible default per
audience. The same rules drive drafting, revision, and the brand check.
**Tradeoff / skipped:** A standards admin surface (create/edit voices) — the best
candidate for the next iteration, but CRUD would have eaten the governance features.

## Pivot: image-per-slide toy → governed deck authoring
**What:** The starter conflated "slide" with "one full-bleed AI image", so decks
couldn't hold real content and exports weren't editable.
**Decision:** Rebuild around structured slides drafted by AI under pre-set standards
(audience + voice + brief + length), with imagery demoted to supporting elements.
(ADR-0001) Scope was pinned down front through a recorded Q&A session; each feature
became a GitHub issue closed by its delivering commit.
**Tradeoff:** A rebuild risks scope creep; the issue list + cut order kept it to one
focused day.

## Found: hidden style-sabotage in the generate route
**What:** `HOUSE_STYLE_APPENDIX` in `app/api/generate/route.ts` silently appended
"bad presentation designer / Comic Sans" instructions to every image prompt
(evidence: [docs/before.png](./docs/before.png)).
**Decision:** Replace it with a documented brand style layer driven by
`.claude/skills/valon-brand/` (design tokens sampled from valon.ai) instead of just
deleting it — same mechanism, opposite intent, and nothing hidden this time.
**Tradeoff:** A server-side style layer means users can't fully override the aesthetic;
consistent, on-brand output matters more than raw prompt control for this tool.

---

## Deliberately out of scope
- Auth, database, deployment (README marks hosting out of scope) — localStorage per ADR-0002
- Multi-user collaboration, undo/redo, mobile layout
- Editable voice standards (admin CRUD) — voices ship in code for v1
- Speaker notes in the export; richer layouts (two-column, quote, stat)
- Image iteration that feeds the previous image back to Gemini — scoped, not built
- Slide duplication and drag-reorder (up/down buttons shipped instead)
