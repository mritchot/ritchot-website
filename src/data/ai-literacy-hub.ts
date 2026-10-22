/**
 * Hub collections for the AI-literacy program, rendered on the case-study
 * page at /projects/ai-literacy-platform/.
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
  { label: 'Course', url: '/courses/ai-literacy/' },
  { label: 'Source on GitHub', url: 'https://github.com/mritchot/ai-literacy-platform' },
];

export const writing: HubLink[] = [
  { label: 'I built an AI Literacy Course', url: '/writing/i-built-an-ai-literacy-course/' },
];

export const documents: HubGroup[] = [
  {
    title: 'Needs Analysis',
    items: [
      { label: 'Executive Problem Statement (PDF)', url: '/courses/ai-literacy/needs-analysis/executive-problem-statement.pdf' },
      { label: 'Capability Gap Analysis (PDF)', url: '/courses/ai-literacy/needs-analysis/capability-gap-analysis.pdf' },
      { label: 'Learner Persona (PDF)', url: '/courses/ai-literacy/needs-analysis/learner-persona.pdf' },
      { label: 'Action Map (PDF)', url: '/courses/ai-literacy/needs-analysis/action-map.pdf' },
      { label: 'Interactive versions in the course', url: '/courses/ai-literacy/#/needs-analysis' },
    ],
  },
  {
    title: 'Evaluation Framework',
    items: [
      { label: 'Level 1: Reaction (PDF)', url: '/courses/ai-literacy/evaluation/level-1-reaction.pdf' },
      { label: 'Level 2: Learning (PDF)', url: '/courses/ai-literacy/evaluation/level-2-learning.pdf' },
      { label: 'Level 3: Behavior (PDF)', url: '/courses/ai-literacy/evaluation/level-3-behavior.pdf' },
      { label: 'Level 4: Results (PDF)', url: '/courses/ai-literacy/evaluation/level-4-results.pdf' },
      { label: 'Interactive versions in the course', url: '/courses/ai-literacy/#/evaluation' },
    ],
  },
  {
    title: 'Behind the Build',
    items: [
      { label: 'Learning Architecture (PDF)', url: '/courses/ai-literacy/build/learning-architecture.pdf' },
      { label: 'Technical Architecture (PDF)', url: '/courses/ai-literacy/build/architecture.pdf' },
      { label: 'Project Timeline (PDF)', url: '/courses/ai-literacy/build/timeline.pdf' },
      { label: 'Responsibility Matrix / RACI (PDF)', url: '/courses/ai-literacy/build/raci.pdf' },
      { label: 'Resource & Budget Plan (PDF)', url: '/courses/ai-literacy/build/resources.pdf' },
      { label: 'Stakeholder Communications (PDF)', url: '/courses/ai-literacy/build/communications.pdf' },
      { label: 'QA Documentation (PDF)', url: '/courses/ai-literacy/build/quality.pdf' },
      { label: 'Interactive versions in the course', url: '/courses/ai-literacy/#/build' },
    ],
  },
];
