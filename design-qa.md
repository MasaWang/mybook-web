# Design QA — Raw Typescript publishing edition

## Evidence

- Source visual truth: `/Users/kriswong/Desktop/截圖 2026-09-04 22.40.26.png` through `/Users/kriswong/Desktop/截圖 2026-09-04 22.45.39.png` (OceanAI baseline plus Raw Typescript reference sequence).
- Rendered implementation: `qa-captures/home-desktop.png`, `qa-captures/contents-desktop.png`, `qa-captures/reader-desktop-final.png`, `qa-captures/home-mobile-final.png`, `qa-captures/contents-mobile-final.png`, and `qa-captures/reader-mobile-final2.png`.
- Desktop viewport: 1775 × 1492 CSS px, device scale factor 1; source screenshots were inspected at their native pixels and compared by visible content region rather than browser chrome.
- Mobile viewport: 390 × 844 CSS px, device scale factor 1.
- State: `/books/wisdom-sea/`, `/contents/`, and Chapter 8; dark and light themes; English and English + Traditional Chinese reading modes.

## Full-view comparison

The final desktop captures reproduce the reference's wide editorial shell, large mono display hierarchy, dashed rules, restrained palette, and deliberate vertical spacing without adding a cover or modern card styling. The book page now uses a true asymmetric title/question composition; Contents uses dense ruled rows and integrated Part headers; the chapter page uses a large but bounded title followed by a narrow reading measure.

## Focused-region comparison

Focused checks covered the book title and metadata register, Contents title/Part I rows, Chapter 8 title and opening paragraphs, header controls, and mobile title wrapping. Image fidelity was not applicable: neither target nor implementation uses visible illustrative assets in these regions. Copy remained sourced from the book manifest and manuscript.

## Required fidelity surfaces

- Fonts and typography: English display and publishing controls use the Courier-derived mono stack; Traditional Chinese display/body text uses the Songti/Noto Serif/PMingLiU stack; reader sizes, leading, weight, wrapping, and hierarchy were checked at desktop and mobile widths.
- Spacing and layout rhythm: hero columns, metadata-to-title space, Contents first screen, Part group spacing, reader header, 48rem prose measure, and responsive stacking match the intended expansive print rhythm.
- Colors and tokens: warm paper/light ink and near-black/warm-white dark palettes use common tokens; dashed rules and muted teal remain legible in both themes.
- Image quality and asset fidelity: no source imagery, logos, or decorative graphics are required or approximated.
- Copy and content: book title, core question, subtitle, chapter text, bilingual labels, and navigation are preserved from the manifest/manuscript.

## Comparison history

1. P1 — Chapter route returned 404 in independent browser capture after `astro.config.mjs` disappeared during QA. Fix: restored the static base-path configuration and restarted the preview. Post-fix evidence: `reader-desktop-final.png` and `reader-mobile-final2.png` render Chapter 8 successfully.
2. P1 — Reader title overflowed the 390px viewport. Fix: bounded the mobile title to the content width, reduced the responsive display scale, and enabled safe wrapping. Post-fix evidence: `reader-mobile-final2.png` contains the full title without horizontal clipping.
3. P1 — Book and Contents display titles plus metadata overflowed on mobile. Fix: reduced the mobile title scales and allowed metadata values and long display words to wrap. Post-fix evidence: `home-mobile-final.png` and `contents-mobile-final.png` preserve the intended hierarchy inside the viewport.
4. P2 — Earlier reader spacing separated language blocks too broadly and made paragraph cadence sparse. Fix: removed generic adjacent-language spacing, limited the major divider to English/Chinese manuscript sections, and tightened paragraph margins. Post-fix evidence: `reader-desktop-final.png`.
5. P2 — Contents current-row fill and split Part labels read as modern UI rather than a typescript index. Fix: removed the fill, combined `Part / 篇名` in the group header, and retained the fine left indicator. Post-fix evidence: `contents-desktop.png`.

## Interaction and browser checks

- Language picker switched from English to English + Traditional Chinese and exposed both manuscript sections.
- Theme toggle changed state successfully and updated its accessible label from “Switch to dark mode” to “Switch to light mode”.
- Thought-code anchors expose deterministic fragment URLs and accessible names.
- Previous/next chapter navigation remains present.
- No page-script console errors were observed during headless Chromium captures; only host-level Chrome display-link shutdown warnings were emitted.

## Findings

No actionable P0, P1, or P2 differences remain. The implementation intentionally adapts the reference language rather than cloning its content, and preserves OceanAI's bilingual publishing and continuous-publication controls.

## Follow-up polish

- P3: Consider self-hosting a licensed Chinese serif font later to eliminate platform-dependent Songti fallback differences.

final result: passed
