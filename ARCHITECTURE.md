# Architecture

How ritchot.me is built and why. The site is a personal publication and
portfolio: long-form writing, project case studies, and a resume, serving
two audiences — readers and hiring managers.

## Principles

1. **Efficiency.** Tiny, optimized pages. Static HTML by default;
   JavaScript is the exception, never the rule.
2. **Simplicity.** One framework, one host, one repo. No CMS, no database,
   no build farm of services.
3. **Ownership.** Content is markdown in git. Assets are self-hosted —
   fonts, images, documents. The only runtime third party is the host.
4. **Honesty.** Zero trackers, ads, or third-party scripts — made
   literally true by a strict Content-Security-Policy. Every page works
   with JavaScript disabled.
5. **Concentrated expression.** One living ink moment (the homepage
   field); restraint everywhere else. Aesthetic register: ink, water,
   machine.
6. **Durability.** Both color modes first-class; WCAG 2.2 AA contrast;
   built to age well rather than to trend.

## Stack

- **Astro** (TypeScript strict, `output: 'static'`). No UI-framework
  runtime — the two interactive islands are dependency-free vanilla
  TypeScript.
- **Plain CSS** with custom-property design tokens
  (`src/styles/tokens.css`).
- **Shiki** at build time for syntax highlighting, emitted as classes —
  the CSP forbids inline styles, so highlighting is class-based against
  code-color tokens.
- **Cloudflare Workers (static assets)**; `main` is production, branch
  previews are the review surface.
- **Images ship in their original formats** (PNG/JPG — deliberately no
  WebP/AVIF), served from `public/` with intrinsic dimensions stamped at
  build time so layout space is always reserved. The build fails if a
  WebP or AVIF file reaches `dist/`.

## Content Model

- `src/content/writing/` — one markdown file per piece. Frontmatter:
  `title`, `date`, `updated?`, `type` (essay | analysis | notes),
  `summary`, optional explicit `slug` (URLs preserved from the previous
  host). Reading time is computed at build.
- `src/content/projects/` — case studies: `title`, `period`, `stack[]`,
  `links`, `weight`, `summary`, and an optional `hub` flag that renders a
  shared link-collection module (the same data drives `/ai-courses/`, so
  the two pages cannot drift).
- `src/data/resume.yaml` — the single source for the resume page, its
  print stylesheet, and `public/resume.pdf`. `npm run resume:pdf`
  regenerates the PDF locally (Playwright print-to-PDF), asserts a hard
  two-page maximum, absolutizes links to production, and stamps
  deliberate document metadata. Credential documents live in
  `public/docs/` and are linked from both the page and the PDF.

### Markdown pipeline

Build-time rehype passes, in order: caption patterns become
`figure`/`figcaption`; site-local images get intrinsic `width`/`height`;
code fences are re-highlighted as classes; GFM footnotes are mirrored as
inline sidenote copies (pure-CSS margin notes ≥1200px, numbered endnotes
below — zero runtime JS); en-US soft hyphens are baked into prose so the
CSS baseline and the justification island share one set of break
opportunities. Feeds strip the soft hyphens on output.

## Feeds and Subscription

Full-content RSS (`/feed.xml`) and Atom (`/atom.xml`) with autodiscovery
links; the legacy feed path 301-redirects. Email is deliberately dormant:
a subscribe partial exists in the codebase (markup, styles, states) but
renders nothing until an endpoint constant is configured — activation is
one constant, zero markup changes.

## Islands

Two islands, both first-party, dependency-free at runtime, and removable
without breakage. Every failure path — no JS, reduced motion, missing
platform support, script error — leaves a fully working typographic page.

1. **`suminagashi`** (homepage): a hand-written WebGL2 stable-fluids ink
   simulation — semi-Lagrangian advection, Jacobi pressure projection,
   splat pours and pointer traces. Dye composites as *pigment*:
   Beer–Lambert absorption over the paper ground in light mode, a matte
   screen-blend over the dark ground — ink, never neon. Five pigments are
   read from the live design tokens through a shuffle bag; theme changes
   retint the existing field in a single frame via a least-squares matrix
   in density space, so the composition survives the flip. It mounts
   after load + idle, pauses when hidden or off-screen, caps device-pixel
   ratio at 2, and steps resolution and solver iterations down on slow
   renderers. Content sits on ground-tinted panels that guarantee
   legibility over any pour.

2. **`pretext-justify`** (writing pages): upgrades CSS justification to
   Knuth–Plass optimal line breaking — a hand-built optimizer over
   [pretext](https://github.com/chenglou/pretext) segmentation and
   measurement, adapted from the library's MIT-licensed comparison demo
   and generalized to mixed-font rich text. Only paragraphs below the
   initial viewport are enhanced (imperceptible by construction, CLS 0),
   via text-node surgery that never clones or splits an element — links
   remain single focusable elements and sidenotes keep their native float
   anchors. A two-pass closed loop plans conservatively, then corrects
   each rendered line against the browser's own measurement; any
   disagreement restores that paragraph's pristine baseline. Requires
   `Intl.Segmenter`; skips silently otherwise — the CSS baseline
   (justify + baked soft hyphens) is a permanent, acceptable state.

## Theme

Dark applies via `prefers-color-scheme` when no choice is stored, or via
`:root[data-theme]` when forced; a header control cycles
system → light → dark. A tiny external script (CSP-conformant, <1 KB)
reads one localStorage key and sets the attribute before first paint —
no flash of the wrong theme. The hero simulation follows theme changes
instantly (see above). The SVG favicon follows the OS scheme by design.

## Performance Budgets

| Page type | HTML | CSS | JS |
|---|---|---|---|
| Writing page | ≤ 25 KB | ≤ 15 KB | ≤ 35 KB gz (justification island) |
| Homepage | ≤ 20 KB | ≤ 15 KB | ≤ 25 KB gz (fluid island) |

Image bytes are excluded from first-view byte caps (a deliberate
trade for original formats); text, CSS, and JS budgets are enforced.
Targets: CLS = 0, Lighthouse 100s, LCP under 1.5 s on a throttled run.
Fonts are self-hosted subset woff2 (~98 KB worst case) with
metric-compatible fallbacks.

## Security and Privacy

Strict CSP (`default-src 'none'`, self-only script/style/img/font,
no inline anything), no cookies, no third-party requests of any kind.
One localStorage key stores the theme override. Analytics are edge-side
request metrics at the host; the pages ship zero measurement bytes.

## Licensing

Code: MIT. Content under `src/content/**` and documents under
`public/docs/`: © Michael Ritchot, all rights reserved.
