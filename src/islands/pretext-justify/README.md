# pretext-justify

**Rejected at the Phase 4 measurement gate (14-07-2026).** The CSS baseline
(`text-align: justify` + `hyphens: auto`) is the permanent state for writing
pages, per the architecture's standing fallback position.

Measured on post 006 (65 paragraphs, `@chenglou/pretext` 0.0.8):

- island payload 14.4 KB gz (criterion ≤ 35 KB: pass)
- `layout()` hot path 2.3 ms full-page, 1.0 ms re-layout on resize (pass)
- one-time `prepare()` 47 ms desktop main-thread (~190 ms on a 4× throttle)

Failing criterion: **zero visible reflow is structurally unmeetable.** The
library (v0.0.8) provides text measurement and greedy line-range layout for
canvas/manual rendering; it has no Knuth–Plass or justification API and no
automatic hyphenation. The envisioned enhancement would require an in-island
typesetting engine (K–P over segment widths, manual line-box re-rendering that
breaks native selection and the sidenote floats, plus custom soft-hyphen
insertion to replace the lost `hyphens: auto`), and re-breaking visible
justified paragraphs is by definition a visible reflow.

Revisit only if pretext ships a justification/optimal-breaking API that can
enhance live DOM paragraphs without re-rendering them.
