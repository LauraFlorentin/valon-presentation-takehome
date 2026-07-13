# Deck library and eval log persist in localStorage

The library and the eval audit trail are stored per-browser in localStorage
(`valon-deck-studio:decks:v1`, `valon-deck-studio:evals:v1`), not a server-side
store. The exercise scopes out hosting and states "deck state in the browser, no
database"; a server store would buy durability the demo doesn't need at the cost
of infra the exercise excludes. Known consequence: decks are per-browser and
generated images (~1 MB data URLs) count against the ~5 MB quota — acceptable
for a prototype, and the first thing to replace (SQLite/Postgres) if this became
a real internal tool.
