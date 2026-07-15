/**
 * Shared hub collections for the AI-literacy program (5c finding 17):
 * one module drives both /ai-courses/ and the case-study page at
 * /projects/ai-literacy-platform/, so the two can never drift.
 */
export interface HubLink {
  label: string;
  url: string;
}

export interface HubGroup {
  title: string;
  items: HubLink[];
}

export const links: HubLink[] = [
  { label: 'Course', url: 'https://ai-literacy.ritchot.me/' },
  { label: 'Source on GitHub', url: 'https://github.com/mritchot/ai-literacy-platform' },
];

export const writing: HubLink[] = [
  { label: 'I built an AI Literacy Course', url: '/writing/i-built-an-ai-literacy-course/' },
];

export const documents: HubGroup[] = [
  {
    title: 'Needs Analysis',
    items: [
      { label: 'Executive Problem Statement (PDF)', url: 'https://ai-literacy.ritchot.me/needs-analysis/executive-problem-statement.pdf' },
      { label: 'Capability Gap Analysis (PDF)', url: 'https://ai-literacy.ritchot.me/needs-analysis/capability-gap-analysis.pdf' },
      { label: 'Learner Persona (PDF)', url: 'https://ai-literacy.ritchot.me/needs-analysis/learner-persona.pdf' },
      { label: 'Action Map (PDF)', url: 'https://ai-literacy.ritchot.me/needs-analysis/action-map.pdf' },
      { label: 'Interactive versions in the course', url: 'https://ai-literacy.ritchot.me/#/needs-analysis' },
    ],
  },
  {
    title: 'Evaluation Framework',
    items: [
      { label: 'Level 1: Reaction (PDF)', url: 'https://ai-literacy.ritchot.me/evaluation/level-1-reaction.pdf' },
      { label: 'Level 2: Learning (PDF)', url: 'https://ai-literacy.ritchot.me/evaluation/level-2-learning.pdf' },
      { label: 'Level 3: Behavior (PDF)', url: 'https://ai-literacy.ritchot.me/evaluation/level-3-behavior.pdf' },
      { label: 'Level 4: Results (PDF)', url: 'https://ai-literacy.ritchot.me/evaluation/level-4-results.pdf' },
      { label: 'Interactive versions in the course', url: 'https://ai-literacy.ritchot.me/#/evaluation' },
    ],
  },
  {
    title: 'Behind the Build',
    items: [
      { label: 'Learning Architecture (PDF)', url: 'https://ai-literacy.ritchot.me/build/learning-architecture.pdf' },
      { label: 'Technical Architecture (PDF)', url: 'https://ai-literacy.ritchot.me/build/architecture.pdf' },
      { label: 'Project Timeline (PDF)', url: 'https://ai-literacy.ritchot.me/build/timeline.pdf' },
      { label: 'Responsibility Matrix / RACI (PDF)', url: 'https://ai-literacy.ritchot.me/build/raci.pdf' },
      { label: 'Resource & Budget Plan (PDF)', url: 'https://ai-literacy.ritchot.me/build/resources.pdf' },
      { label: 'Stakeholder Communications (PDF)', url: 'https://ai-literacy.ritchot.me/build/communications.pdf' },
      { label: 'QA Documentation (PDF)', url: 'https://ai-literacy.ritchot.me/build/quality.pdf' },
      { label: 'Interactive versions in the course', url: 'https://ai-literacy.ritchot.me/#/build' },
    ],
  },
];
