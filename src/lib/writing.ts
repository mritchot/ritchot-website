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
