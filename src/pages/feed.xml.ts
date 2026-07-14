import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { sortedWriting, urlOf } from '../lib/writing';

export async function GET(context: APIContext): Promise<Response> {
  const entries = await sortedWriting();
  return rss({
    title: 'ritchot.me',
    description: 'Writing by Michael Ritchot.',
    site: context.site!,
    customData: '<language>en</language>',
    items: entries.map((entry) => ({
      title: entry.data.title,
      description: entry.data.summary,
      pubDate: entry.data.date,
      link: urlOf(entry),
      // Full content (rendered at build by the content layer), per D2/§3.5.
      content: entry.rendered?.html,
      categories: [entry.data.type],
    })),
  });
}
