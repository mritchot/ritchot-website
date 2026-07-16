# ritchot.me

The personal site of [Michael Ritchot](https://ritchot.me) — long-form
writing, project case studies, and a resume. Static HTML by default, zero
third-party requests at runtime, both color modes first-class.

**Stack:** Astro (TypeScript strict, static output) · two dependency-free
vanilla-TS islands · plain-CSS design tokens · Cloudflare Workers.

Some things in here are unusual for a personal site:

- **Hand-built Knuth–Plass justification.** Writing pages upgrade CSS
  justification to globally optimal line breaking, computed in the
  browser over [pretext](https://github.com/chenglou/pretext) text
  measurement, applied by text-node surgery that never splits an element,
  and verified line-by-line against the browser's own rendering — with a
  per-paragraph revert if anything disagrees. No JS still means fully
  justified, hyphenated text. ([details](src/islands/pretext-justify/README.md))
- **A real fluid simulation for a hero.** The homepage field is a
  hand-written WebGL2 stable-fluids solver whose dye composites as
  pigment (Beer–Lambert over paper; matte blend over dark ground), drawn
  from the live design tokens. Theme switches retint the moving field in
  one frame via a least-squares remap in density space.
  ([details](src/islands/suminagashi/README.md))
- **Honest by construction.** A strict CSP (`default-src 'none'`, no
  inline anything) makes "no trackers, no third-party scripts" literally
  true; every page works with JavaScript disabled; the build fails if a
  WebP/AVIF slips into the output.
- **Enforced budgets.** Lighthouse 100s, CLS 0, and per-page byte caps
  are gate criteria, not aspirations.

## Develop

Requires Node ≥ 22.12.

```sh
npm install
npm run dev        # local dev server
npm run build      # build to dist/ (fails on format violations)
npm run preview    # preview the production build
npm run resume:pdf # regenerate public/resume.pdf from resume.yaml
npx astro check    # typecheck
npx wrangler dev   # serve dist/ as it runs on Workers
```

## License

Code is MIT (see [LICENSE](LICENSE)). Site content — `src/content/**` and
the documents under `public/docs/` — is © Michael Ritchot, all rights
reserved, and is not covered by the MIT License.
