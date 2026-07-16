/** Build-time word count and reading time (~230 wpm, rounded up). */

const WPM = 230;

function wordCount(markdown: string): number {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
    .replace(/`[^`]*`/g, ' ') // inline code
    .replace(/\[\^[^\]]*\]:?/g, ' ') // footnote markers and definitions
    .replace(/[#>*_[\]()!|-]/g, ' ');
  return text.split(/\s+/).filter(Boolean).length;
}

export function readingTime(markdown: string): number {
  return Math.max(1, Math.ceil(wordCount(markdown) / WPM));
}
