# ritchot.me

Personal website: long-form writing, project case studies, and a resume.
Static HTML by default, zero third-party requests at runtime, light and dark
color modes both first-class.

**Stack:** Astro (TypeScript strict, `output: 'static'`) · vanilla-TS islands ·
plain CSS design tokens · Cloudflare Workers (static assets).

## Develop

Requires Node ≥ 22.12.

```sh
npm install
npm run dev        # local dev server
npm run build      # build to dist/
npm run preview    # preview the production build
npx astro check    # typecheck .astro and TS files
npx wrangler dev   # serve dist/ as it will run on Workers
```

## License

Code is licensed under the MIT License (see [LICENSE](LICENSE)). Site content
under `src/content/**` — essays, analyses, notes, and case studies — is
© Michael Ritchot, all rights reserved, and is not covered by the MIT License.
