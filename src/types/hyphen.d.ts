declare module 'hyphen/en-us' {
  export interface HyphenationOptions {
    hyphenChar?: string;
    minWordLength?: number;
  }
  const hyphen: {
    hyphenateSync(text: string, options?: HyphenationOptions): string;
    hyphenate(text: string, options?: HyphenationOptions): Promise<string>;
  };
  export default hyphen;
}
