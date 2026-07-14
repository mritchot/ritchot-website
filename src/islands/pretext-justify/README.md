# pretext-justify

Placeholder — built in Phase 4; adoption gated on Phase 4 measurement.

Writing-page island, loaded `client:visible`, upgrading CSS justification to
Knuth–Plass optimal line breaking via pretext. Requires `Intl.Segmenter` and
skips silently otherwise. Ships only if measured size stays in budget with
zero visible reflow — the CSS justification baseline is the permanent,
acceptable fallback.
