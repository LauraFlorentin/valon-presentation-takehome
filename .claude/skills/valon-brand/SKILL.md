---
name: valon-brand
description: Valon design system for this presentation builder, sampled from valon.ai production CSS (NOT the older valon.com consumer site). Defines brand tokens (colors, typography, spacing), the image-generation style layer, and pptx export styling. ALWAYS consult this skill before writing or editing any image-generation prompt or style appendix, changing CSS variables or fonts in globals.css, styling the .pptx export in app/api/export/route.ts, or adding any new user-facing UI surface. Also use it whenever the user mentions "brand", "on-brand", "style", "theme", or "design system".
---

# Valon Design System

Replaces the starter repo's hidden `HOUSE_STYLE_APPENDIX` with a documented,
auditable design system. Every generated image, UI surface, and exported slide
traces back to the tokens below. Provenance for every value: `MANIFEST.md`.

Source of truth: **valon.ai** (editorial, warm, premium). Do NOT style against
valon.com — that is the consumer mortgage site with a different, older look.

## 1. Brand tokens

Verbatim from valon.ai production CSS (`:root` custom properties) — see MANIFEST.md.

```
color.accent:        #E19614   gold — the single accent (sunburst, key numerals, CTAs)
color.ink:           #231810   espresso — body text; dark-mode background
color.text-muted:    #827057   base-500 — captions, secondary text (4.8:1 AA on white)
color.surface:       #FFFFFF   default page/slide background
color.surface-warm:  #F8F6F3   base-100 — cards, panels
color.surface-gold:  #FFF7E9   gold-100 — highlight wells, sparingly
color.border:        #ECE4DD   base-200 (strong: #DCD2C6 base-300)

gold scale:  50 #FFFDFA · 100 #FFF7E9 · 200 #FCE7C2 · 300 #F5CA78 · 400 #EBB03C
             500 #E19614 · 600 #BE7E10 · 700 #9A6410 · 800 #7A4F10 · 900 #5C3C0C
base scale:  100 #F8F6F3 · 200 #ECE4DD · 300 #DCD2C6 · 400 #AF9F8A · 500 #827057
             600 #5C543C · 700 #4A402C · 800 #31231B · 900 #20190F · 950 #231810

font.display:  "Season Serif"    → fallback "Playfair Display", Georgia, serif
font.body:     "Melange Grotesk" → fallback "Inter", system-ui, sans-serif
font.mono:     "Geist Mono"      → fallback "JetBrains Mono", ui-monospace, monospace

type scale (web): display 68/60/52/44px · heading 32/24/20/18px · body 18/16/14px
tracking: −1px to −0.5px on display sizes only
spacing:  section 128/64/32px · content 48/24/16px · element 24/16/12px · container max 1300px
```

**Contrast rules (WCAG, computed):**
- Espresso on white = 17.4:1 AAA — always safe
- Gold `#E19614` on white = 2.4:1 — **decorative / large numerals only, never body text**
- Gold on espresso = 7.1:1 AAA — gold text is fine on dark
- Need gold *text* on light? Use gold-700 `#9A6410` (5.0:1 AA)

**Signature typographic move:** one Season Serif *italic* word per display headline
("A *Revolution* in Regulated Industries"). Exactly one word, never in body copy.

## 2. Image-generation style layer

Append to every image prompt in `app/api/generate/route.ts` as one exported constant
`BRAND_STYLE_LAYER` (server-side, documented here and in the README — unlike the
original sabotage appendix, nothing is hidden):

```
Style: warm editorial fintech aesthetic. Palette anchored in deep espresso ink
(#231810) on white and cream (#F8F6F3) surfaces, with a single gold accent
(#E19614) used sparingly — a line, a numeral, a small sunburst motif. Generous
white space, flat editorial illustration or minimal abstract geometry, warm
and premium, never clip art, never stock-photo clichés, never cool grays or
blues, never more than one gold element per composition.
```

## 3. PPTX export styling (`app/api/export/route.ts`)

- 16:9 wide (13.333" × 7.5"). Background white `FFFFFF`; cards `F8F6F3`.
- pptxgenjs hex values take **no `#` prefix** and no alpha digits.
- Titles: display serif (Georgia fallback), 36–60pt, espresso, sentence case.
- Body: sans (Aptos/Arial fallback), 14–18pt, espresso; captions 10–12pt in `827057`.
- One gold accent max per slide: a stat numeral group, a rule, or a quote mark.
- Section dividers: espresso background, cream `F8F6F3` text, gold rule.
- Code blocks: espresso fill, cream text, comments `AF9F8A`, strings gold, Geist/JetBrains Mono.
- Wordmark bottom-right on every non-cover slide, 0.7–1.0" wide, 0.3" margin.

## 4. Assets (`assets/`)

True vector paths extracted from valon.ai inline SVG, CSS vars resolved to hex:

| File | Use on |
|---|---|
| `logo-wordmark.svg` | light backgrounds |
| `logo-wordmark-white.svg` | espresso backgrounds |
| `logo-glyph.svg` (gold sunburst) | light or espresso; glyph-only contexts |
| `logo-glyph-white.svg` | espresso backgrounds |

Never recolor, stretch, rotate, or apply effects. Clear space = 0.5× sunburst height.

## 5. Do not

- Blues from valon.com (`#3762C3` family) — wrong brand
- Cool grays anywhere — all neutrals come from the warm base scale
- Multiple gold elements per frame; gradients across the gold
- Serif in body, subtitles, captions, or UI labels; more than one italic word per headline
- Gold body text on light surfaces (fails contrast — see rules above)
- Drop shadows, glow, 3D, decorative effects
