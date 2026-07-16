import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { absolutizeHtml, sortedWriting, urlOf } from '../lib/writing';

export async function GET(context: APIContext): Promise<Response> {
  const entries = await sortedWriting();
  const self = new URL('/feed.xml', context.site).href;
  return rss({
    title: 'ritchot.me',
    description: 'Writing by Michael Ritchot.',
    site: context.site!,
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    customData:
      '<language>en</language>' +
      `<atom:link href="${self}" rel="self" type="application/rss+xml"/>`,
    items: entries.map((entry) => ({
      title: entry.data.title,
      description: entry.data.summary,
      pubDate: entry.data.date,
      link: urlOf(entry),
      // Full content (rendered at build by the content layer), per D2/§3.5.
      // Baked soft hyphens are a page-rendering concern; feeds get clean text.
      content: absolutizeHtml(
        (entry.rendered?.html ?? '').replaceAll('\u00ad', ''),
        context.site!,
        new URL(urlOf(entry), context.site!).href,
      ),
      categories: [entry.data.type],
    })),
  });
}
