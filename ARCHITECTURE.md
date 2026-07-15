# Architecture

Condensed summary of the decisions governing this codebase. The full architecture and production document ("ritchot.me Redesign — Architecture & Production Document") is maintained locally, outside the tracked tree.

## Purpose

Personal site for ritchot.me: long-form writing, project case studies, and a resume — built for a low-frequency publisher and doubling as a portfolio artifact. Two audiences: readers and hiring managers.

## Principles

1. **Efficiency.** Tiny, optimized pages. Static HTML by default; JavaScript is the exception.
2. **Simplicity.** One framework, one host, one repo. No CMS, no database.
3. **Ownership.** Content is markdown in git. The only runtime third party is the host.
4. **Honesty.** "No trackers, no ads, no third-party scripts" — made literally true by a strict CSP. Every page works with JS disabled.
5. **Concentrated expression.** One full-viewport ink moment (the homepage hero); restraint everywhere else. Aesthetic register: ink, water, machine.
6. **Durability.** Both color modes first-class; WCAG 2.2 AA; designed to age well.

## Stack

- **Astro**, TypeScript strict, `output: 'static'`. No UI-framework runtime; islands are vanilla TS.
- **Plain CSS** with custom-property design tokens (`src/styles/tokens.css`); light/dark via `prefers-color-scheme` (no toggle).
- **Shiki** build-time highlighting; **astro:assets** for images (AVIF/WebP, explicit dimensions).
- **Cloudflare Workers (static assets)** via Workers Builds; `main` = production, branch previews for review.
- Security: strict CSP, no cookies, no storage, no third-party requests. Analytics are edge-side only (host request metrics); zero bytes added to pages.

## Content Model

- `src/content/writing/` — one markdown file per published piece. Frontmatter: `title`, `date`, `updated?`, `type` (essay | analysis | notes), `summary`, optional explicit `slug` (preserved from the previous host). Reading time computed at build.
- `src/content/projects/` — case studies: `title`, `role`, `period`, `stack[]`, `status`, `links`, `weight`, `summary`.
- `src/data/resume.yaml` — single source rendering the resume page, its print stylesheet, and `public/resume.pdf` (`npm run resume:pdf`, local Playwright step).

## Feeds and Subscription

- Full-content RSS (`/feed.xml`) and Atom (`/atom.xml`) with autodiscovery links; legacy feed path 301-redirects.
- Email is deliberately dormant: a subscribe partial exists but renders nothing until an endpoint is configured. Activation paths (managed service or a `POST /api/subscribe` route in this same Worker with D1 + a sending API) both consume the same feed.

## Islands

Two sanctioned islands, both first-party, dependency-free at runtime, and removable without breakage:

1. **`suminagashi`** (homepage only, `client:idle`): WebGL ink-dissolution hero (D21) — a stable-fluids dye field, continuously alive with autonomous multi-hue token-ink pours; pigment compositing keeps it matte ink, never neon. There is no poster art: the typographic page is the permanent state, and the field fades in over the plain ground when the island runs — no-JS, reduced motion, island failure, and lost GL contexts simply keep the plain page. Decorative (`aria-hidden`); simulation pauses when hidden or off-view.
2. **`pretext-justify`** (writing pages, idle-loaded): upgrades CSS justification to Knuth–Plass optimal line breaking (D22) — a hand-built optimizer over [pretext](https://github.com/chenglou/pretext) segmentation and measurement, adapted from the library's own MIT-licensed comparison demo. Soft hyphens are baked at build time so the no-JS baseline (`text-align: justify; hyphens: manual`) shares the same break opportunities. Only paragraphs below the initial viewport are enhanced (imperceptible, CLS 0), by text-node surgery that never clones or splits an element; a closed measurement loop fits every line to the edge and any disagreement with the browser restores the pristine baseline for that paragraph. Requires `Intl.Segmenter`; skips silently otherwise — the CSS baseline is a permanent acceptable state.

## Performance Budgets (gate criteria)

| Page type | HTML | CSS | JS | Total first view |
|---|---|---|---|---|
| Writing page | ≤ 25 KB | ≤ 15 KB | 0 (baseline) | ≤ 160 KB |
| Homepage | ≤ 20 KB | ≤ 15 KB | ≤ 25 KB gz | ≤ 180 KB |

LCP < 1.5 s, CLS = 0, Lighthouse 100 on writing pages. Fonts: self-hosted subset woff2 with metric-compatible fallbacks.

## Design System (essentials)

- **Grounds:** light "washi" paper (`#F7F4EF`) / dark "sumi" (`#101014`), each with a full ink scale.
- **Accents:** vermilion (seal mark, focus, scarce), signal teal-cyan (links), ember orange (hero/illustration only).
- **Typography:** serif prose (Source Serif 4 proposed) + mono chrome (IBM Plex Mono proposed); base 19px, 65–70ch justified measure, hyphenation.
- **Mark:** serif wordmark "Michael Ritchot" (Source Serif 4) — header and OG identity; favicon is a mode-aware serif "M" SVG; no graphic mark.
- **Motion:** cross-document CSS View Transitions (160 ms fade, zero JS); all motion collapses under `prefers-reduced-motion`.

## Build Phases

0 Scaffold → 1 Design system → 2 Content engine → 3 Content migration → 4 Islands → 5 Portfolio & resume → 6 Launch (public repo flip, DNS cutover). Each phase ends at an explicit approval gate with budget checks.

## Licensing

Code: MIT. Content under `src/content/**`: © Michael Ritchot, all rights reserved.
