# Slides use exactly three layouts

A slide is one of `title`, `content` (heading + 2–5 bullets + optional
supporting image), or `section` (single statement on espresso). Each layout is
rendered twice — once in the editor canvas (CSS container units) and once in
the PPTX export (`lib/pptx-map.ts`) — so every layout added costs double.
Three is the smallest set where decks don't look monotonous; richer layouts
(two-column, quote, stat) are deliberate future work, not oversights.
