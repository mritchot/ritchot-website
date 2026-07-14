/**
 * WCAG 2.x relative luminance and contrast ratio.
 * Build-time only — consumed by the specimen page to print verified ratios.
 */
export function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string): number => {
    const n = parseInt(hex.slice(1), 16);
    const channel = (v: number): number => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return (
      0.2126 * channel((n >> 16) & 255) +
      0.7152 * channel((n >> 8) & 255) +
      0.0722 * channel(n & 255)
    );
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}
