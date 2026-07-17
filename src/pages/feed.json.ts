import type { APIContext } from 'astro';
import { absolutizeHtml, sortedWriting, urlOf, type Writing } from '../lib/writing';

/** JSON Feed 1.1 — https://jsonfeed.org/version/1.1 */
interface FeedAuthor {
  name: string;
  url: string;
}

interface FeedItem {
  id: string;
  url: string;
  title: string;
  summary: string;
  content_html: string;
  date_published: string;
  date_modified: string;
  tags: string[];
}

interface JsonFeed {
  version: string;
  title: string;
  home_page_url: string;
  feed_url: string;
  description: string;
  language: string;
  authors: FeedAuthor[];
  items: FeedItem[];
}

function feedItem(entry: Writing, site: string): FeedItem {
  const url = new URL(urlOf(entry), site).href;
  return {
    id: url,
    url,
    title: entry.data.title,
    summary: entry.data.summary,
    // Same treatment as the XML feeds: soft hyphens are a page-rendering
    // concern, and readers handle relative references unreliably.
    content_html: absolutizeHtml((entry.rendered?.html ?? '').replaceAll('\u00ad', ''), site, url),
    date_published: entry.data.date.toISOString(),
    date_modified: (entry.data.updated ?? entry.data.date).toISOString(),
    tags: [entry.data.type],
  };
}

export async function GET(context: APIContext): Promise<Response> {
  const site = context.site!.href;
  const entries = await sortedWriting();

  const feed: JsonFeed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'ritchot.me',
    home_page_url: site,
    feed_url: new URL('/feed.json', context.site).href,
    description: 'Writing by Michael Ritchot.',
    language: 'en',
    authors: [{ name: 'Michael Ritchot', url: site }],
    items: entries.map((entry) => feedItem(entry, site)),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: { 'Content-Type': 'application/feed+json; charset=utf-8' },
  });
}
