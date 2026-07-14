export const meta = {
  name: 'build-routes-and-tests',
  description: 'Parallel build of API routes and unit tests against the foundation contracts',
  phases: [
    { title: 'Build', detail: 'six agents on disjoint files' },
  ],
}

const REPO = '/Users/laura-florentine/Documents/Valon Take Home Excercise/valon-presentation-takehome'

const COMMON = `
You are implementing one module of "Valon Deck Studio", a Next.js 16 (App Router) app.
Repo: ${REPO}

MANDATORY first steps: Read these foundation files — they define every contract you must use:
- lib/types.ts (domain model)
- lib/gemini.ts (client + model helpers + responseText)
- lib/prompts.ts (all prompt builders + BRAND_STYLE_LAYER)
- lib/deck-schema.ts (parseDeckDraft, parseSlideRedraft, ParseResult)
- lib/eval-schema.ts (buildEvalRun)
- lib/voices.ts
Also read app/api/export/route.ts and app/api/generate/route.ts to absorb the existing route conventions (NextResponse.json errors as { error: string } with proper status codes, try/catch wrapping).

Rules:
- TypeScript, no \`any\` at module boundaries. Match the existing code style (double quotes, 2-space indent).
- Import from "@/lib/..."? CHECK tsconfig.json first — if no path alias exists, use relative imports like "../../../lib/types".
- Do NOT run npm/tsc/build/dev — other modules are being written concurrently; the integrator typechecks later.
- Do NOT create or modify ANY file outside the ones assigned to you.
- Missing GOOGLE_API_KEY must return { error: "Missing GOOGLE_API_KEY in your local environment." } with status 500 (matches existing convention).
- Your final message: return JSON {"files": [...], "notes": "anything the integrator must know"}.
`

const SCHEMA = {
  type: 'object',
  properties: {
    files: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['files', 'notes'],
}

const TASKS = [
  {
    key: 'draft-route',
    prompt: COMMON + `
Create app/api/draft/route.ts — the full-deck drafting endpoint.

POST body: { brief: string, audience: "internal"|"external", voiceId: VoiceId, targetLength: number, contextDoc: ContextDoc | null }
- 400 if brief missing/blank; clamp targetLength to an integer between 3 and 15 (default 8 when absent/invalid).
- Build the prompt with buildDraftPrompt(...) from lib/prompts.ts.
- Call Gemini via getClient() + textModel() from lib/gemini.ts using client.models.generateContent({ model, contents: prompt }).
- Extract text with responseText(response); validate with parseDeckDraft(...).
- On validation failure: 502 with { error: result.error }.
- On success: 200 with { deckTitle, slides } (the DraftDeck fields).
- Wrap everything in try/catch → 500 { error: message }.`,
  },
  {
    key: 'redraft-route',
    prompt: COMMON + `
Create app/api/redraft/route.ts — single-slide revision endpoint.

POST body: { deck: { title, brief, audience, voiceId, contextDoc }, slide: Slide, slideNumber: number, totalSlides: number, instruction: string, neighborHeadings: string[] }
- 400 if instruction missing/blank or slide missing.
- Build prompt with buildRedraftPrompt(...) from lib/prompts.ts (it takes exactly these inputs — read its signature).
- Call Gemini via getClient() + textModel(), extract with responseText, validate with parseSlideRedraft(...).
- On validation failure: 502 { error }.
- On success: 200 with { slide } — the revised slide. NOTE: parseSlideRedraft assigns a fresh id; preserve the ORIGINAL incoming slide's id and imageData on the returned slide (revision must not orphan the generated image or break React keys): return { slide: { ...revised, id: originalSlide.id, imageData: originalSlide.imageData } }.`,
  },
  {
    key: 'extract-route',
    prompt: COMMON + `
Create app/api/extract/route.ts — context-document text extraction endpoint.

POST: multipart/form-data with a single "file" field (use request.formData(), file.arrayBuffer()).
- Accept .pdf (use unpdf: import { extractText, getDocumentProxy } from "unpdf" — const pdf = await getDocumentProxy(new Uint8Array(buffer)); const { text } = await extractText(pdf, { mergePages: true })) and .docx (use mammoth: import mammoth from "mammoth"; const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buffer) })).
- Decide pdf vs docx by filename extension (case-insensitive). Anything else: 400 { error: "Only PDF and Word (.docx) documents are supported." }.
- 400 if no file; 413 { error } if file > 15 MB.
- Normalize whitespace (collapse runs of 3+ newlines to 2, trim).
- If extraction yields no text (e.g. scanned PDF): 422 { error: "No readable text found in the document." }.
- Cap text at CONTEXT_DOC_CHAR_CAP from lib/types.ts; set truncated flag.
- 200 with { filename: file.name, text, truncated } (a ContextDoc).
- Add: export const runtime = "nodejs" (mammoth/unpdf need Node, not edge).`,
  },
  {
    key: 'eval-route',
    prompt: COMMON + `
Create app/api/eval/route.ts — brand-check eval endpoint.

POST body: { deck: { id, title, audience, voiceId, brief, contextDoc }, slides: Slide[], trigger: "draft"|"redraft" }
- 400 if slides missing/empty or deck.id/title missing.
- Build prompt with buildEvalPrompt({ deck, slides }) from lib/prompts.ts.
- Call Gemini via getClient() + textModel(), extract with responseText.
- Build the row with buildEvalRun(deck, trigger, rawText) from lib/eval-schema.ts — note it NEVER throws; it degrades to needs-revision safely.
- 200 with { evalRun }.
- If the Gemini call itself throws, still return 200 with a degraded evalRun built as buildEvalRun(deck, trigger, "") so the audit trail always gets a row — include notes about this behavior in your final JSON.`,
  },
  {
    key: 'generate-export-rewrite',
    prompt: COMMON + `
Rewrite TWO existing files (you own both):

1. app/api/generate/route.ts — supporting-image generation.
- DELETE the HOUSE_STYLE_APPENDIX entirely (it is deliberate sabotage from the starter).
- Import BRAND_STYLE_LAYER from lib/prompts.ts and append it to the user prompt instead.
- Use getClient() + imageModel() from lib/gemini.ts instead of inline client/model constants.
- Keep the same request/response contract as the current file ({ prompt } in; { imageData, text } out; same error handling shape). Keep responseModalities: ["TEXT", "IMAGE"].

2. app/api/export/route.ts — branded PPTX export.
- New POST body: { deck: Deck } (import Deck from lib/types.ts). 400 if no deck/slides.
- Use mapDeckToSpecs(deck, marks) from lib/pptx-map.ts. marks = { light: <abs path>, dark: <abs path> } where light = path.join(process.cwd(), "public/brand/logo-wordmark.svg") and dark = .../logo-wordmark-white.svg.
- Render each PptxSlideSpec with pptxgenjs: deck.layout = "LAYOUT_WIDE"; slide.background = { color: spec.background }; shapes → slide.addShape("rect", { x,y,w,h, fill: { color: shape.fill }, line: { type: "none" } }); texts → slide.addText(t.text, { x,y,w,h, fontFace, fontSize, color, bold, align, valign, ...(t.bullet ? { bullet: { code: "2022" }, lineSpacing: t.lineSpacing } : {}) }); images → spec.isData ? slide.addImage({ data: img.path, x,y,w,h }) : slide.addImage({ path: img.path, x,y,w,h }).
- IMPORTANT pptxgenjs quirk: for SVG file paths, addImage({ path }) works in Node; keep as-is.
- Set deck metadata: author/company "Valon", title = deck.title.
- Response: same nodebuffer→ArrayBuffer dance as the current file; Content-Disposition filename derived from deck.title slugified (lowercase, alphanumerics + hyphens, fallback "valon-deck") + ".pptx".
- Do NOT leak prompt/brief/notes text onto slides — that was a starter flaw being removed.`,
  },
  {
    key: 'tests',
    prompt: COMMON + `
Create the test suite — exactly these files:

1. vitest.config.ts at repo root: minimal — export default defineConfig({ test: { include: ["tests/**/*.test.ts"] } }).
2. tests/deck-schema.test.ts — 4 tests:
   a. a well-formed draft JSON (title + 2 content + section slides) parses ok:true with right slide count, headings, bullets preserved, imageIdea kept on content slide;
   b. malformed JSON (e.g. "{nope") → ok:false with readable error;
   c. a slide with layout "banana" → ok:false mentioning the slide number;
   d. a content slide missing "heading" → ok:true and heading defaulted to "Untitled slide". Also cover stripCodeFences: the same valid payload wrapped in \\\`\\\`\\\`json fences parses fine (fold into test a or d).
3. tests/eval-schema.test.ts — 3 tests:
   a. valid eval JSON {verdict:"on-brand", findings:[]} + deck WITH contextDoc → EvalRun has verdict "on-brand", empty findings, contextFilename set, deckTitle/deckId copied, ISO date (pass a fixed \`new Date(...)\` as the 4th arg and assert exact ISO string);
   b. verdict "amazing!!" (unknown) → "needs-revision";
   c. findings as mixed array [{slide:3, issue:"jargon — LTV"}, "deck-level issue string"] → two findings, first slideNumber 3, second slideNumber null; malformed raw ("not json") → needs-revision with the fallback finding.
4. tests/pptx-map.test.ts — 3 tests (marks = {light:"/L.svg", dark:"/D.svg"}):
   a. title slide with heading+subheading → background FFFFFF, first text is the heading in Georgia serif, subheading present, a gold shape (E19614) exists;
   b. content slide with 3 bullets and NO imageData → all 3 bullet texts present with bullet:true, exactly one image (the wordmark, path /L.svg), no data image;
   c. content slide WITH imageData ("data:image/png;base64,x") → two images, one isData; section slide → background 231810, wordmark uses /D.svg.
Import types from ../lib/types and build minimal Slide fixtures (id, layout, heading, bullets).
Keep tests deterministic and fast; no network, no react.`,
  },
]

phase('Build')
const results = await parallel(
  TASKS.map((t) => () =>
    agent(t.prompt, { label: t.key, phase: 'Build', schema: SCHEMA })
  )
)

const out = {}
TASKS.forEach((t, i) => {
  out[t.key] = results[i]
  log(`${t.key}: ${results[i] ? 'done — ' + (results[i].files || []).join(', ') : 'FAILED'}`)
})
return out