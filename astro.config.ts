import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import rehypeCodeClasses from './src/lib/rehype-code-classes';
import rehypeExternalLinks from './src/lib/rehype-external-links';
import rehypeFigures from './src/lib/rehype-figures';
import rehypeImgDims from './src/lib/rehype-img-dims';
import rehypeSidenotes from './src/lib/rehype-sidenotes';
import rehypeShy from './src/lib/rehype-shy';

export default defineConfig({
  site: 'https://ritchot.me',
  output: 'static',
  markdown: {
    // Built-in Shiki emits inline style attributes; the CSP forbids them.
    // rehypeCodeClasses re-highlights fences with class-based output.
    syntaxHighlight: false,
    // external links first, so the sidenote copies cloned from footnote
    // definitions inherit target/rel; then figures (structure), code classes,
    // and sidenotes; rehypeShy runs last so the sidenote copies exist (and are
    // skipped) before soft hyphens are baked into the remaining prose text.
    rehypePlugins: [
      rehypeExternalLinks,
      rehypeFigures,
      rehypeImgDims,
      rehypeCodeClasses,
      rehypeSidenotes,
      rehypeShy,
    ],
  },
  integrations: [sitemap()],
  build: {
    // The CSP in public/_headers is style-src 'self': inline <style> is blocked,
    // so stylesheets must always be emitted as external files.
    inlineStylesheets: 'never',
  },
  vite: {
    build: {
      // script-src 'self' likewise blocks inline scripts: small bundled
      // assets must never be inlined into the HTML.
      assetsInlineLimit: 0,
    },
  },
});
