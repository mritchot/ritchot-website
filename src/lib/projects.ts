import { getCollection, type CollectionEntry } from 'astro:content';

export type Project = CollectionEntry<'projects'>;

export const slugOf = (entry: Project): string => entry.id;
export const urlOf = (entry: Project): string => `/projects/${slugOf(entry)}/`;

/** All projects, lightest weight first (§5: cards ordered by weight). */
export async function sortedProjects(): Promise<Project[]> {
  const entries = await getCollection('projects');
  return entries.sort((a, b) => a.data.weight - b.data.weight);
}
