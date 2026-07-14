/**
 * Build-time syntax highlighting: Shiki tokenizes, output is class-based.
 * The CSP (style-src 'self') forbids the inline style attributes Shiki's HTML
 * renderer emits, so tokens are mapped to semantic classes colored by the
 * --code-* design tokens (dual-mode via prefers-color-scheme, zero runtime JS).
 */
import { createHighlighter, type BundledLanguage } from 'shiki';

// TextMate scope prefix → token class (first match on the most specific scope wins)
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

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

const highlighter = await createHighlighter({
  themes: ['github-light'], // tokenization only; colors come from CSS tokens
  langs: ['typescript', 'css'],
});

export function highlight(code: string, lang: BundledLanguage): string {
  const { tokens } = highlighter.codeToTokens(code.trim(), {
    lang,
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
