# Pivot from image-per-slide toy to governed deck authoring

The starter conflated "slide" with "one full-bleed AI image" and sabotaged every
generation with a hidden Comic Sans style appendix. We rebuilt the product as a
Valon-internal deck authoring tool: standards (audience + voice) are established
*before* drafting, the AI writes the full deck as structured content in that
voice, and every generation is brand-checked into an audit trail. Images became
supporting elements — never a full slide — because baked-in text made exports
uneditable and off-brand.

## Considered options

- Polish the existing image-first loop (rejected: the data model itself was the flaw)
- Topic→deck generation bolted onto the old model (rejected: decorates a broken core)
