# Design QA

- Source visual truth: `audits/visual-verification-2026-09-02/01-desktop-home.png` through `06-mobile-chapter.png`
- Implementation: revised local build at `http://127.0.0.1:4360/mybook-web/`
- Viewports: desktop 1440 × 1000 CSS px; mobile 390 × 844 CSS px
- Pixel density: source and implementation captures use 1× CSS viewport screenshots; no density normalization required
- State: homepage, contents default state, Chapter 7 bilingual default state

## Full-view comparison evidence

- P1: Chapter title combines English and Chinese in one heading, producing awkward line breaks and delaying the article body below the fold.
- P2: Mobile chapter breadcrumb repeats the complete bilingual title.
- P2: Mobile homepage hero phrase breaks at weak semantic points and the book card destination is unclear beside the reading links.
- P2: Mobile contents rows crowd multi-line titles against the reading-time column.

## Focused region comparison evidence

The affected regions are legible in the full viewport captures, so separate crops are not required for the first pass.

## Required fidelity surfaces

- Typography: editorial serif/sans pairing is retained; display-title sizing and wrapping require correction.
- Spacing: overall shell and reading measure are retained; above-the-fold vertical density requires correction.
- Colors: existing paper, ink, sea, muted, and line tokens are retained.
- Images: the audited screens contain no editorial image assets.
- Copy: manuscript text is retained; only interface presentation and destination labeling may change.

## Comparison history

### Iteration 1

- Earlier findings: four P1/P2 issues listed above.
- Fixes made: separated English and Chinese chapter titles, reduced the chapter header footprint, replaced the mobile breadcrumb title with `Chapter 7`, clarified the book-card destination, corrected mobile homepage line wrapping, and stacked mobile contents metadata.
- Post-fix evidence: `audits/visual-verification-2026-09-02/revised/01-desktop-home.png` through `06-mobile-chapter.png`.

### Iteration 2

- Earlier findings: the first mobile homepage revision left the final character isolated; the compact breadcrumb showed the Chinese label rather than the chapter number.
- Fixes made: reduced the mobile hero title to 2.2rem and allowed the second phrase to occupy the full content width; derived the compact breadcrumb from the English `Chapter N` prefix; reduced mobile reader-header vertical padding.
- Post-fix evidence: `audits/visual-verification-2026-09-02/revised/04-mobile-home-v2.png` and `06-mobile-chapter-v2.png`.

## Final verification

- Full-view comparison: passed at desktop 1440 × 1000 and mobile 390 × 844.
- Focused regions: mobile homepage hero and Chapter 7 header were re-captured after the second iteration; no additional focused crop was needed because both regions are fully legible at 1×.
- Primary interactions: contents search returns one result for `雲端`, Chapter 7 navigation succeeds, EN mode becomes pressed, and the mobile page has no horizontal overflow.
- Console: no actionable console errors; a generic resource-load message was observed without a failed page response and did not affect the flow.
- Remaining P3: the homepage retains deliberate editorial whitespace; the Chapter 7 English title still spans three lines on mobile but now breaks at phrase boundaries and preserves the Chinese title as a separate line.

final result: passed
