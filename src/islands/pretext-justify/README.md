# pretext-justify

Knuth–Plass paragraph justification as a progressive enhancement. The CSS
baseline (`text-align: justify` with build-time soft hyphens under
`hyphens: manual`) is the permanent no-JS state; this island upgrades
below-viewport paragraphs on writing pages to globally optimal line
breaks. The optimizer is hand-built over
[pretext](https://github.com/chenglou/pretext) segmentation and
measurement, adapted from the MIT-licensed justification-comparison demo
that ships inside the package, generalized to mixed-font rich text.

## Architecture

- **Build time** (`src/lib/rehype-shy.ts`): en-US soft hyphens are baked
  into prose text (TeX hyphenation patterns via the `hyphen` package),
  skipping headings, code, links, footnote refs, and sidenote copies.
  Baseline and island share one set of break opportunities; the feeds
  strip the marks.
- **Measure**: each text node is whitespace-normalized (offset-mapped) and
  segmented with `prepareWithSegments` under its own computed font, so
  links, emphasis, code, and footnote refs measure style-correctly.
  Multi-part words (soft hyphens, UAX14 boundaries after visible hyphens
  and dashes) are measured as shaped canvas prefixes — a break anywhere
  inside a word costs exactly what the browser renders. Elements with
  horizontal padding/border/margin (footnote-ref anchors) are atomic
  boxes measured by DOM rect.
- **Optimize** (`kp.ts`): Knuth–Plass dynamic programming over
  box/glue/penalty items; every candidate the browser knows (spaces, soft
  hyphens, UAX14 intra-word boundaries) is a candidate for the optimizer,
  so the browser can never re-break a planned line at a point the plan
  didn't consider.
- **Apply**: text-node surgery only. Chosen breaks are forced newlines
  under `white-space: pre-line`; each justified line's spaces are wrapped
  in `.kp-s` spans carrying the line's word-spacing delta (CSSOM — the CSP
  blocks style attributes, not CSSOM); soft hyphens are stripped (clean
  copy); `.kp-h` spans render break hyphens as CSS content. No element is
  ever cloned or split: links stay single focusable elements, sidenote
  floats keep their native anchors.
- **Two-pass fit**: pass 1 plans against the measure minus 2.5px so no
  engine's sub-pixel drift can overflow a line; pass 2 measures each
  rendered line (ranges anchored on the forced breaks) and corrects its
  spans to end 0.4px from the edge — closed-loop, engine-independent.
- **Honesty guards**: a paragraph is restored to its pristine clone if the
  break count or any line's extent disagrees with the plan. Only
  paragraphs below the initial viewport are enhanced (imperceptible by
  construction, CLS 0); resize restores everything and re-enhances below
  the current viewport; `beforeprint` restores the baseline.

## Measured

- island chunk ~15.6 KB gz (budget ≤ 35 KB)
- full corpus × {1280px, 600px}: 390 paragraphs enhanced, 0 reverts,
  2,384 justified lines, right-edge residue avg 0.40px / max 0.66px,
  0 overfull
- enhancement pass ≤ 42ms per page, idle-chunked
- selection/copy: real text nodes; copied text carries line breaks at line
  ends, zero soft hyphens, zero hyphen artifacts
- `?kp=0` disables the island (debug); `Intl.Segmenter` + canvas gated;
  `saveData` respected

Known trade-offs: copied paragraphs are hard-wrapped at rendered line
breaks; list items and endnote text keep the CSS baseline (scope is
paragraphs); above-the-fold paragraphs always render baseline.
