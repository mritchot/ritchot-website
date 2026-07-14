import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const writing = defineCollection({
  loader: glob({ base: './src/content/writing', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    type: z.enum(['essay', 'analysis', 'notes']),
    summary: z.string(),
    // Explicit slug preserved from the previous host; migrated slugs are immutable.
    slug: z.string().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    role: z.string(),
    period: z.string(),
    stack: z.array(z.string()),
    status: z.enum(['live', 'archived', 'in-progress']),
    links: z.object({
      live: z.url().optional(),
      repo: z.url().optional(),
    }),
    weight: z.number(),
    summary: z.string(),
  }),
});

export const collections = { writing, projects };
