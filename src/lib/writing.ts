/** Shared helpers for the writing collection: ordering, slugs, URLs, dates. */
import { getCollection, type CollectionEntry } from 'astro:content';

export type Writing = CollectionEntry<'writing'>;

export const slugOf = (entry: Writing): string => entry.data.slug ?? entry.id;

export const urlOf = (entry: Writing): string => `/writing/${slugOf(entry)}/`;

export async function sortedWriting(): Promise<Writing[]> {
  const entries = await getCollection('writing');
  return entries.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export const formatDate = (d: Date): string =>
  d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

/** Feed content ships with absolute URLs: root-relative href/src values are
 * resolved against the site origin, and fragment-only anchors (e.g. footnote
 * links like #user-content-fn-1) against the page's own permalink, at
 * generation time — feed readers handle relative references unreliably.
 * Page HTML is untouched. */
export function absolutizeHtml(html: string, site: URL | string, pageUrl?: string): string {
  const origin = String(site).replace(/\/+$/, '');
  let out = html.replace(/(href|src)="\/(?!\/)/g, `$1="${origin}/`);
  if (pageUrl) out = out.replace(/(href|src)="(#[^"]*)"/g, `$1="${pageUrl}$2"`);
  return out;
}
