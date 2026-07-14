import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import rehypeCodeClasses from './src/lib/rehype-code-classes';
import rehypeSidenotes from './src/lib/rehype-sidenotes';

export default defineConfig({
  site: 'https://ritchot.me',
  output: 'static',
  markdown: {
    // Built-in Shiki emits inline style attributes; the CSP forbids them.
    // rehypeCodeClasses re-highlights fences with class-based output.
    syntaxHighlight: false,
    rehypePlugins: [rehypeCodeClasses, rehypeSidenotes],
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
});
