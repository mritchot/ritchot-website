/**
 * Build-time syntax highlighting core: Shiki tokenizes, output is class-based.
 * The CSP (style-src 'self') forbids the inline style attributes Shiki's HTML
 * renderer emits, so tokens map to semantic classes colored by the --code-*
 * design tokens (dual-mode via prefers-color-scheme, zero runtime JS).
 * Consumed by the rehype plugin (markdown code fences) and .astro pages.
 */
import { createHighlighter, type Highlighter } from 'shiki';

const LANGS = [
  'typescript',
  'javascript',
  'css',
  'html',
  'json',
  'yaml',
  'bash',
  'markdown',
];

let highlighterPromise: Promise<Highlighter> | null = null;
const getHighlighter = (): Promise<Highlighter> =>
  (highlighterPromise ??= createHighlighter({
    themes: ['github-light'], // tokenization only; colors come from CSS tokens
    langs: LANGS,
  }));

// TextMate scope prefix → token class (most specific scope wins)
const SCOPE_CLASSES: ReadonlyArray<readonly [string, string]> = [
  ['comment', 'tok-comment'],
  ['punctuation.definition.comment', 'tok-comment'],
  ['string', 'tok-str'],
  ['constant', 'tok-const'],
  ['support.constant', 'tok-const'],
  ['keyword', 'tok-kw'],
  ['storage', 'tok-kw'],
  ['variable.language', 'tok-kw'],
  ['entity.name', 'tok-name'],
  ['support.function', 'tok-name'],
  ['support.class', 'tok-name'],
];

function classFor(scopes: readonly string[]): string | null {
  for (let i = scopes.length - 1; i >= 0; i--) {
    const scope = scopes[i]!;
    for (const [prefix, cls] of SCOPE_CLASSES) {
      if (scope === prefix || scope.startsWith(prefix + '.')) return cls;
    }
  }
  return null;
}

export function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export async function highlightHtml(code: string, lang: string): Promise<string> {
  const source = code.replace(/\n$/, '');
  const highlighter = await getHighlighter();

  if (!(highlighter.getLoadedLanguages() as string[]).includes(lang)) {
    return `<pre class="code-block"><code>${escapeHtml(source)}</code></pre>`;
  }

  const { tokens } = highlighter.codeToTokens(source, {
    lang: lang as Parameters<Highlighter['codeToTokens']>[1]['lang'],
    theme: 'github-light',
    includeExplanation: 'scopeName',
  });

  const lines = tokens.map((line) =>
    line
      .map((token) => {
        const segments = token.explanation ?? [];
        if (segments.length === 0) return escapeHtml(token.content);
        return segments
          .map((seg) => {
            const cls = classFor(seg.scopes.map((s) => s.scopeName));
            const text = escapeHtml(seg.content);
            return cls ? `<span class="${cls}">${text}</span>` : text;
          })
          .join('');
      })
      .join(''),
  );

  return `<pre class="code-block"><code>${lines.join('\n')}</code></pre>`;
}
