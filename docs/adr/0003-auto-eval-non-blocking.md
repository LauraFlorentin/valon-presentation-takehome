# Brand checks run automatically, never block, and always log

Every deck draft and slide redraft automatically triggers an LLM brand check
against the deck's voice rules. The verdict (`on-brand` / `needs-revision`) and
findings are appended to the Evals tab — date · document · verdict · findings —
but never gate the author. Rationale: governance that blocks gets bypassed;
governance that informs gets read. The eval route degrades instead of failing
(any error still produces a `needs-revision` row) so the audit trail has no
gaps. An unrecognized verdict from the model is treated as `needs-revision` —
a false alarm is safer than false confidence.
