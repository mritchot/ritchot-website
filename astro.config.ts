import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import rehypeCodeClasses from './src/lib/rehype-code-classes';
import rehypeFigures from './src/lib/rehype-figures';
import rehypeSidenotes from './src/lib/rehype-sidenotes';
import rehypeShy from './src/lib/rehype-shy';

export default defineConfig({
  site: 'https://ritchot.me',
  output: 'static',
  markdown: {
    // Built-in Shiki emits inline style attributes; the CSP forbids them.
    // rehypeCodeClasses re-highlights fences with class-based output.
    syntaxHighlight: false,
    // figures first (structure), then code classes and sidenotes; rehypeShy
    // runs last so the sidenote copies exist (and are skipped) before soft
    // hyphens are baked into the remaining prose text.
    rehypePlugins: [rehypeFigures, rehypeCodeClasses, rehypeSidenotes, rehypeShy],
  },
  integrations: [
    sitemap({
      // The specimen page is a review surface, deleted before launch.
      filter: (page) => !page.includes('/specimen'),
    }),
  ],
  build: {
    // The CSP in public/_headers is style-src 'self': inline <style> is blocked,
    // so stylesheets must always be emitted as external files.
    inlineStylesheets: 'never',
  },
  vite: {
    build: {
      // script-src 'self' likewise blocks inline scripts: small bundled
      // scripts (the D24 motion script) must never be inlined into HTML.
      assetsInlineLimit: 0,
    },
  },
});
