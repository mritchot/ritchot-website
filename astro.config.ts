import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://ritchot.me',
  output: 'static',
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
