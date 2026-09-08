# Design QA — Reader Header

- Verification date: 2026-09-07
- Accepted implementation baseline: `e894385` (`Refine Wisdom Sea reader interface`)
- Reference: user-supplied annotated screenshots captured on 2026-09-06
- Route: `/mybook-web/books/wisdom-sea/read/chapter-1/?lang=bilingual`
- Viewport: 1502 × 1455 CSS px
- State: Chapter 1, light theme, English + Traditional Chinese
- Additional interaction states checked: language menu and light/dark theme toggle

## Accepted full-view result

The reader layout, body typography, and content remain unchanged. The header occupies 140 CSS px vertically and reserves one explicit 44 CSS px content axis with 10 CSS px clearance above the existing rule. Brand, current-book title, language icon, and theme icon are visually centered on that axis with explicit line heights. The left brand is 24 CSS px, while the direct current-book link remains 18 CSS px. Language and theme controls are borderless Lucide icons; the language control opens a custom publication-style menu with a clear selected state. Header titles, menu text, breadcrumbs, and the reading register use Courier New for English and numerals with the established system fallback for Traditional Chinese. Breadcrumbs and metadata now share 14 CSS px, weight 400, muted color, and the same letter spacing; breadcrumb underlines are removed. Bilingual separators are explicit HTML rather than generated text.

## Accepted header result

The current-book link remains without an underline. Its active-state color remains unchanged, so location awareness is preserved without the visual line. The header is 140 CSS px and its two requested textual anchors are 18 CSS px; language and theme controls retain their prior size.

## Findings

- No actionable P0, P1, or P2 differences remain for the two requested annotations.
- Typography: left brand is 24 CSS px, current-book link is 18 CSS px, and the complete reading register is 14 CSS px; controls and body typography are unchanged.
- Spacing and layout rhythm: header height is 140 CSS px; contents align near the bottom rule with 10 CSS px clearance; the reading-page footer gap remains reduced by 50 CSS px.
- Colors and visual tokens: metadata and breadcrumbs use the muted gray token; icon hover and focus retain the sea accent.
- Image quality and asset fidelity: header controls use established Lucide globe, moon, and sun icons without custom-drawn assets.
- Copy and content: unchanged.

## Comparison history

1. Before: active book link was underlined and header height was 76 CSS px.
2. First fix: removed the active-link underline and increased the desktop header minimum height to 100 CSS px.
3. User revision: requested a 150 CSS px header and a 50 CSS px reduction in the blank space before the footer.
4. Latest revision: reduce the header to 140 CSS px and set the left brand and direct current-book link to 18 CSS px.
5. After: underline remains `none`; header height is 140 CSS px; both requested text elements are 18 CSS px.
6. Alignment revision: move the complete header content row toward the bottom rule while retaining the 140 CSS px header.
7. Information-hierarchy revision: enlarge the brand, normalize the metadata size and color, unify breadcrumb color, and align header text with the 44 CSS px controls.
8. Control revision: remove square borders, retain only the globe icon for language, and switch between moon and sun icons for theme state.
9. Metadata trial: muted gray and weight 400 across the complete register.
10. Menu revision: replace the unfinished native select popup with a custom keyboard-accessible menu and reduce header-rule clearance to 10 CSS px.
11. Reverted: the Sarasa Mono TC trial was removed after full-page comparison showed it did not match the accepted footer and chapter-navigation typography.
12. Retained: explicit bilingual separators and Courier New plus system Traditional-Chinese fallback.
13. Alignment revision: replace outer-edge alignment with an explicit 44 CSS px header content axis.
14. Typography revision: match breadcrumb and metadata size, weight, spacing, and color; enlarge chapter-navigation prompts to 16.8 CSS px.

## Implementation checklist

- [x] Remove current-book underline.
- [x] Increase header height.
- [x] Reduce the reading-page footer gap by 50 CSS px.
- [x] Set the desktop header height to 140 CSS px.
- [x] Set the left brand and direct current-book link to 18 CSS px.
- [x] Bottom-align all desktop header content with consistent clearance above the divider.
- [x] Set the brand to 24 CSS px and align the header row to one 44 CSS px control box.
- [x] Set all reading metadata to 14 CSS px and normalize publication colors.
- [x] Unify breadcrumb color across links and the current item.
- [x] Replace framed language and theme controls with borderless library icons.
- [x] Match breadcrumb and metadata at 14 CSS px, weight 400, muted color, and one letter spacing.
- [x] Set PREVIOUS and NEXT prompts to 16.8 CSS px.
- [x] Replace the native language popup with a finished custom menu.
- [x] Reduce the header content clearance above its bottom rule to 10 CSS px.
- [x] Use Courier New for English and numerals with the established system fallback for Traditional Chinese.
- [x] Make bilingual separators explicit in header, breadcrumb, and metadata markup.
- [x] Preserve current alignment, controls, colors, and divider.
- [x] Verify in the in-app browser.

## Verification result

Passed against baseline `e894385`. The accepted reader-header layout, bilingual typography hierarchy, metadata treatment, navigation sizing, language selection, and theme controls are the visual invariants for subsequent framework upgrades.

## Contents hierarchy verification — 2026-09-07

- Reference: user-supplied 1502 × 1455 annotated contents screenshot.
- Route: `/mybook-web/books/wisdom-sea/contents/`.
- Scope: contents-page information hierarchy plus the reading-page previous/next navigation typography; manuscript, global header behavior, language switching, and theme logic are unchanged.
- Desktop result: redundant book-title breadcrumb removed; the title-to-index transition is tighter; front matter is unnumbered; chapter numbers use stable two-digit values with a narrower number column; Part identifiers and titles share one typographic level; saved reading position is explicitly labeled `CURRENT / 目前閱讀`.
- Bilingual result: Part headings follow the primary-source order (`Part I / Foundations / 基礎篇`) with explicit separator elements; the contents-page return link is a compact, unframed footer-adjacent action; previous/next navigation retains its position and structure while matching that action's 12.8 CSS px Courier typography and 700 weight.
- Responsive result: the Part heading wraps without a stranded separator; front matter does not reserve a number column; current-position label and chapter arrow remain in distinct grid positions.
- Modes checked: English, Traditional Chinese, bilingual, and bilingual dark mode.
- Interaction regression checked: the saved current-reading row retains its dark hover background and switches its number, title, status label, and arrow to the light foreground color.
- Build result: Astro check passed with 0 errors, 0 warnings, and 0 hints; publication validation passed for 35 pages and 35 bilingual pages.

final result: passed
