import type { APIContext } from 'astro';
import { sortedWriting, urlOf, type Writing } from '../lib/writing';

const esc = (s: string): string =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

function entryXml(entry: Writing, site: string): string {
  const url = new URL(urlOf(entry), site).href;
  return `  <entry>
    <title>${esc(entry.data.title)}</title>
    <link href="${url}"/>
    <id>${url}</id>
    <published>${entry.data.date.toISOString()}</published>
    <updated>${(entry.data.updated ?? entry.data.date).toISOString()}</updated>
    <summary>${esc(entry.data.summary)}</summary>
    <category term="${esc(entry.data.type)}"/>
    <content type="html">${esc((entry.rendered?.html ?? '').replaceAll('\u00ad', ''))}</content>
  </entry>`;
}

export async function GET(context: APIContext): Promise<Response> {
  const site = context.site!.href;
  const entries = await sortedWriting();
  const updated =
    entries
      .map((e) => e.data.updated ?? e.data.date)
      .sort((a, b) => b.valueOf() - a.valueOf())[0] ?? new Date();

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>ritchot.me</title>
  <subtitle>Writing by Michael Ritchot.</subtitle>
  <link href="${site}"/>
  <link rel="self" type="application/atom+xml" href="${new URL('/atom.xml', site).href}"/>
  <id>${site}</id>
  <updated>${updated.toISOString()}</updated>
  <author><name>Michael Ritchot</name></author>
${entries.map((e) => entryXml(e, site)).join('\n')}
</feed>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
  });
}
