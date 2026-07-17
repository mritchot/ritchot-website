/**
 * Inline icon paths on a 24×24 viewBox, filled with currentColor — no icon
 * font, no CDN. The three brand marks are the official simple paths (shared
 * with the footer since 5b finding 4); pin, envelope, and globe are drawn
 * here for the resume contact line.
 */
export interface IconDef {
  d: string;
  /** Nested subpaths punch holes deterministically regardless of winding. */
  fillRule?: 'evenodd';
  /** Line art rather than a solid silhouette (the globe's meridians). */
  stroke?: boolean;
}

export const icons = {
  linkedin: {
    d: 'M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0z',
  },
  github: {
    d: 'M12 .3a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.21.7.82.58A12 12 0 0 0 12 .3z',
  },
  x: {
    d: 'M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23zm-1.16 17.52h1.83L7.08 4.13H5.12z',
  },
  pin: {
    d: 'M12 2.5a6.5 6.5 0 0 1 6.5 6.5c0 4.6-6.5 12.5-6.5 12.5S5.5 13.6 5.5 9A6.5 6.5 0 0 1 12 2.5Zm0 4.1a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Z',
    fillRule: 'evenodd',
  },
  envelope: {
    d: 'M2.5 5.5h19a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-19a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Zm1.6 2.2 7.9 5.7 7.9-5.7Z',
    fillRule: 'evenodd',
  },
  globe: {
    d: 'M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6ZM3.4 12h17.2M12 3.2c2.5 2.4 3.9 5.5 3.9 8.8s-1.4 6.4-3.9 8.8c-2.5-2.4-3.9-5.5-3.9-8.8s1.4-6.4 3.9-8.8Z',
    stroke: true,
  },
} as const satisfies Record<string, IconDef>;

export type IconName = keyof typeof icons;
