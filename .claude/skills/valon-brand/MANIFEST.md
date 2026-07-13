# Valon Brand Skill — Build Manifest

Provenance for every value in this skill. Rebuilt from the anthropic-brand skill template on **July 11, 2026**.

## Sources

| Content | Source | Fetched |
|---|---|---|
| Color scales (gold-50…950, base-white…950, alpha tints) | `https://www.valon.ai/_next/static/chunks/65e143a5babaae7d.css` — `:root` custom properties, verbatim | 2026-07-11 |
| Font families (Season Serif, Melange Grotesk, Geist Mono) | Same production CSS — `--font-display/body/mono` declarations | 2026-07-11 |
| Web type scale (display/heading/body sizes, leading, tracking) | Same production CSS — `--text-*`, `--leading-*`, `--tracking-*` | 2026-07-11 |
| Spacing system (section/content/element, container) | Same production CSS — `--spacing-*`, `--container-*` | 2026-07-11 |
| Wordmark SVG (`logo-wordmark*.svg`) | Inline `<svg aria-label="Valon" viewBox="0 0 399 96">` on valon.ai homepage; `var(--color-base-950)` → `#231810`, `var(--color-gold)` → `#E19614` | 2026-07-11 |
| Sunburst glyph (`logo-glyph*.svg`) | Inline `<svg aria-label="Valon" viewBox="0 0 12.8 12.8">` on valon.ai homepage; fills resolved as above | 2026-07-11 |
| Mission, tagline, platform pillars | https://valon.ai homepage copy | 2026-07-11 |
| Proof points ($100B+, $230M, 3x, 92%+) | https://valon.ai homepage stat band | 2026-07-11 |
| Investor/exec quotes (Mayopoulos, Strange, Nierenberg) | https://valon.ai homepage + /about | 2026-07-11 |
| Leadership (Wang, Du, McGrath, Hsu) | https://www.valon.ai/about | 2026-07-11 |

## Derived / interpreted values (not verbatim from source)

- **PPTX pt sizes** — translated from the web px scale to a 16:9 deck grid (e.g., display-lg 60px → 60pt title). Judgment calls, not official.
- **WCAG contrast ratios** — computed from the hex values (WCAG 2.1 relative luminance formula).
- **Functional colors** (success/warning/error) — success and error are proposed muted tones; warning reuses gold-600. Valon's CSS defines no functional palette.
- **Fallback stacks** — Playfair Display/Georgia/Inter/JetBrains Mono are stand-ins; Season Serif and Melange Grotesk fallback names in Valon's CSS are auto-generated metric fallbacks only.
- **Logo min sizes and clear space rule** — proposed conventions, not from an official brand guide.
- **Italic accent rule** — inferred from valon.ai headline treatment ("A *Revolution* in Regulated Industries"); the one-word constraint is a proposed discipline.

## Verification checklist (when auditing/updating)

- [ ] Re-fetch the production CSS chunk (path is deploy-hashed — re-discover via `grep '\.css' on the homepage HTML`)
- [ ] Confirm `--color-gold` is still `#E19614` and base-950 still `#231810`
- [ ] Confirm font family names haven't changed
- [ ] Re-check homepage stats ($100B+, $230M, 3x, 92%+) — these will drift
- [ ] Diff the inline wordmark/glyph SVG paths against `assets/*.svg`
- [ ] Confirm valon.ai vs valon.com split still holds (valon.com = legacy consumer brand, do not sample)
