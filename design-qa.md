# Design QA — Opening reading page

- Source visual truth: `/Users/kriswong/Desktop/截圖 2026-09-05 21.16.32.png`
- Implementation screenshot: `/tmp/mybook-opening-replica.png`
- Route: `/mybook-web/books/wisdom-sea/read/opening/?lang=en`
- State: desktop, American English, light theme
- Source pixels: 4096 × 2560 at 2× density; browser content compared at approximately 2048 CSS px wide
- Implementation pixels: 2048 × 1161 at 1× density; 2048 CSS px viewport width

## Full-view comparison

The source and implementation now share the same broad publishing frame, left reading axis, concentrated chapter metadata, dominant Chinese chapter title, dashed divider, and early正文 entry. The light paper color was sampled from the source as RGB 248/248/246 and implemented as `#f8f8f6`.

## Focused-region comparison

The chapter header and first正文 region were compared because typography and vertical rhythm were the material fidelity surfaces. No raster imagery or custom visual assets are present in either region.

## Findings and iteration history

- Earlier P1: the Chinese chapter title rendered as a secondary bilingual subtitle and was materially smaller than the source.
  - Fix: use the full title scale and heavy monospace publishing face in Traditional-Chinese-only mode.
  - Post-fix evidence: `/tmp/mybook-opening-light-after.png`; the title now occupies the intended dominant chapter-heading tier.
- Earlier P1: the metadata was split across distant left and right columns, producing a dashboard-like header.
  - Fix: consolidate the metadata into one wrapping horizontal register above the title.
  - Post-fix evidence: the front-matter label, unit/read time, status, and update date now read as one compact band.
- Earlier P2:正文 began substantially lower than in the source.
  - Fix: reduce register, header-bottom, and prose-top spacing while preserving the existing outer shell width.
  - Post-fix evidence: the first正文 heading now enters at approximately the source rhythm.
- Earlier P2: the implementation used `#f4f3ee`, visibly warmer and darker than the source.
  - Fix: sample and apply the source background `#f8f8f6`.
- Earlier P1: the enlarged chapter title used a heavy slab-like weight while the source used a light Courier typescript heading.
  - Fix: retain the enlarged title scale but reduce reading-page chapter titles to weight 400.
- Earlier P1: `Why an ocean?` and its Traditional Chinese equivalent were emitted as ordinary paragraphs, hiding the manuscript hierarchy.
  - Fix: the Opening parser now promotes the first standalone line after a thematic break to an `h2`; both language versions were verified in generated HTML.
- Earlier P2: the breadcrumb, chapter-header lower clearance, paragraph separation, and next-unit navigation were visually weaker than the marked reference.
  - Fix: lower and enlarge the breadcrumb slightly, restore chapter-header lower breathing room, increase paragraph spacing, and enlarge chapter navigation labels.

## Required fidelity surfaces

- Fonts and typography: passed; the English chapter title now uses the source-like light Courier treatment, while正文 retains the established language-specific reading faces.
- Spacing and layout rhythm: passed; outer width is unchanged and chapter-header/body timing is aligned with the source.
- Colors and visual tokens: passed; light paper color matches the sampled source and dark-theme tokens remain unchanged.
- Image quality and asset fidelity: passed; no visible image assets occur in the compared content region.
- Copy and content: passed; manuscript text was intentionally unchanged.
- Primary interactions: language selection, theme control, and chapter navigation remain present; publication build validates all bilingual pages.
- Console/runtime: no application build diagnostics; Astro reports 0 errors, 0 warnings, and 0 hints.

Final comparison evidence: `/tmp/mybook-opening-replica.png` shows the light Courier title, consolidated metadata, lowered breadcrumb, stronger正文 rhythm, and source-like chapter-header composition. Generated HTML contains `<h2>Why an ocean?</h2>` and `<h2>為什麼是海洋？</h2>`.

final result: passed
