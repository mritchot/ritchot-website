---
title: "Sample: What a Page Owes Its Reader"
date: 2026-07-14
type: essay
summary: "A temporary sample piece exercising the reading apparatus end to end — measure, sidenotes, code, and the quiet ledger underneath. Deleted when real content lands in Phase 3."
---

Every page makes promises before a single sentence is read. The width of the text block promises a certain kind of attention; the margins promise room to think; the type promises, or fails to promise, that someone considered the reader before considering themselves. This sample piece exists to test whether this site keeps those promises mechanically — it is scaffolding, not writing, and it will be deleted the moment real essays arrive. In the meantime it carries every structural element the reading experience depends on: a long measure of justified prose, footnotes that become sidenotes on a wide desk,[^1] a block of code set in the machine's own voice, and enough headings for the table of contents to earn its place.

The premise of the design is restraint. A reader who arrives here gets ink on paper — warm paper in the day, near-black ground at night — and almost nothing else. No banners request consent because nothing collects anything. No scripts run because none are needed. The typography does the hospitality work that widgets usually pretend to do, and the entire apparatus you are now inside weighs less than a single social-media tracking pixel's supply chain.

## The measure

A comfortable line holds roughly sixty-five to seventy characters. Shorter, and the eye shuttles back and forth like a carriage return with anxiety; longer, and the return journey from line-end to line-start becomes a small act of navigation that interrupts comprehension. This site sets its prose at a forty-two rem measure on a nineteen-pixel base, which lands the count in that band across ordinary reading distances.

Justification is the second half of the promise. Ragged-right text is honest but restless; justified text is calm but risks rivers — those pale channels of coincidental space that run down a poorly hyphenated paragraph. The baseline here is the browser's own greedy line-breaker with hyphenation enabled, which handles characteristically uncooperative vocabulary — internationalization, phenomenological, incomprehensibilities, antidisestablishmentarianism — without drama. A measured upgrade to Knuth–Plass optimal breaking is planned, but only if it costs the reader nothing perceptible; the plain CSS setting is a permanent, acceptable state, not a placeholder.[^2]

The measure also disciplines everything that touches it. Headings inherit the same column so the eye never re-learns the page's edges; figures and code blocks may not exceed it; and on screens too narrow to hold forty-five characters comfortably, justification and hyphenation both stand down, because a justified line with three words in it is a typographic apology. Rules like these sound fussy written down, yet each one exists to remove a decision from every future piece rather than to add one.

### Numerals and the running hand

Numbers sit inside sentences constantly — 1848 revolutions, 230 words per minute, a 42-rem measure, the year 2026 — and a serif with real text figures lets them sit down politely instead of standing at attention. Italics carry *emphasis and titles*, and the em dash — that most abused of marks — is used here the way a rest is used in music: sparingly, and on purpose.

## The margin

Footnotes are a contract with the curious. The main text must survive without them; the notes must reward the detour. On a wide viewport this site moves each note into the right margin beside its reference, where a glance costs nothing, and on narrower screens the same notes gather as numbered endnotes after the final paragraph.[^3] Nothing about that behavior requires JavaScript. The note travels both roads at build time and CSS decides which road is visible — a small redundancy in the HTML purchased so that the reading experience owes nothing to script execution.

The margin is also where the design practices its negative space. Generous vertical rhythm between sections is not emptiness; it is the page breathing. The Japanese compositional idea of *ma* — the interval that gives form its meaning — governs the spacing scale more than any grid system does. When a divider appears, it is a single brush stroke, and it appears rarely.

## The machine

Underneath the ink there is a machine, and the machine is allowed to speak in exactly one register: monospace. Navigation, dates, badges, captions, and code all use the same engineering voice, which keeps the serif's literary register unpolluted. Code samples are highlighted at build time; the palette is drawn from the same token system as everything else, so a keyword in the light mode and the same keyword in the dark mode are siblings, not strangers.

```ts
const WPM = 230;

export function wordCount(markdown: string): number {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ') // fenced code is not prose
    .replace(/`[^`]*`/g, ' ')
    .replace(/[#>*_[\]()!|-]/g, ' ');
  return text.split(/\s+/).filter(Boolean).length;
}

// Reading time rounds up: a 231-word piece costs two minutes, honestly.
export const readingTime = (md: string): number =>
  Math.max(1, Math.ceil(wordCount(md) / WPM));
```

That function is not an illustration; it is the actual arithmetic this page used to print its own reading time in the header above. The estimate leans conservative — two hundred and thirty words per minute, rounded up — because an underestimate is a small courtesy and an overestimate is a small lie.

### What the chrome refuses to do

The header will not sprout a hamburger menu; four links fit on a phone if the type is willing to stack. The footer will not host a newsletter modal; it states, in one line, that there are no trackers, no ads, and no third-party scripts, and the network panel will confirm it to anyone who checks. The current page is marked with a single vermilion dot — the one warm accent this viewport is allowed — and everything else stays in ink.

## The ledger

Every promise above is enforced by numbers rather than sentiment. A writing page like this one budgets twenty-five kilobytes for its markup, fifteen for its styles, one hundred and twenty for its fonts on first view, and zero for JavaScript. The fonts are subset to the Latin range and served from this origin with metric-compatible fallbacks, so the moment of font arrival moves nothing — cumulative layout shift is not minimized but eliminated, measured at exactly zero.

Budgets are gate criteria here, not aspirations. A phase of work does not ship until the numbers hold on a preview deployment, uncached, over a throttled connection. This is an unfashionable way to build a personal site, and that is precisely the argument for it: the page you are reading is the portfolio piece, and the discipline is the content. A site that claims craftsmanship while shipping a megabyte of framework runtime is a résumé with a typo in the word *detail-oriented*.

The ledger extends to the feeds. The full text of every piece travels in both RSS and Atom, because a feed that carries only teasers is a newsletter signup form wearing a trench coat. Readers who prefer their own software are first-class citizens; the site's only job is to hand them clean, complete markup and get out of the way.

## Notes on process

A sample piece has one more job: to be deleted. When the real archive migrates in from the previous host, this file is removed in the same commit, and the reading apparatus it exercised — the table of contents that appeared because this piece crossed fifteen hundred words, the sidenotes now sitting in the margin or waiting at the foot, the code block above, the prev-and-next links below — will already have been proven against something shaped like real writing rather than against lorem ipsum, which lies about everything: word length, sentence rhythm, hyphenation behavior, and the reader's patience.

There is a quiet argument embedded in building this way. Most of what makes reading on the web unpleasant was added deliberately, one reasonable-sounding decision at a time: the analytics that needed a banner, the banner that needed a script, the script that needed a vendor, the vendor that needed a lawyer. Subtraction is also a series of deliberate decisions, and it compounds just as surely in the other direction. Remove the tracker and the banner becomes unnecessary; remove the banner and the script goes with it; remove the script and the page becomes, simply, a page again — something that loads in the time it takes to blink and then stands still, the way paper stands still.

None of this is visible when it works, which is the point. The reader who notices nothing — no jump when the fonts land, no jank when the notes place themselves, no pause before the text appears — has received everything this page knows how to give. The craft aims at its own invisibility, and this sample exists so that the invisibility can be verified, measured, and then quietly replaced by writing that deserves it.

[^1]: On viewports twelve hundred pixels and wider, this note should be sitting in the right margin beside its reference number. Below that width, it waits at the end of the piece as an ordinary endnote. Same note, two homes, zero JavaScript.

[^2]: The candidate implementation is a small first-party island that re-lays paragraphs with the Knuth–Plass algorithm, the line-breaking method TeX has used since 1982. It ships only if measurement shows no visible reflow and a bundle small enough to respect the page's budget; otherwise the CSS baseline remains permanently.

[^3]: Endnotes are the fallback, not the failure state. A phone reader who taps the reference number jumps to the note and back with plain anchor links — the oldest interaction on the web, and still the most reliable one.
