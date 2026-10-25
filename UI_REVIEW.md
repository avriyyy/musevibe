# UI Review — MuseVibe landing (browser check 2026-10-25, old UI)
References: Linear, Vercel. Verdict: foundation tidy, but too dense, duplicated actions, competing hierarchy.

## Worst problems (fix first)
1. Workspace preview panel: >25 controls in one viewport (project header, Run, Fullscreen, prompt input, 5 stages, 5 files, graph + minimap + zoom, code panel with wrapped lines). Landing must show ONE static preview or one clear action; hide zoom/minimap/code tabs/file list from first view.
2. 5 stages shown 3x in one area: floating 3D labels + 5 cards + detail card. Show stages ONCE per screen, max 3 cards per row.
3. Same action under 5 names: Workspace Shell / Live Shell / Open Workspace / Launch Workspace Shell / Open Fullscreen Workspace. Use ONE label everywhere.
4. /api/health appears 4x (navbar, hero, CTA, footer). Move it to footer only.
5. Hero: huge 3-line headline + 2-phrase badge + 4-line subhead + 3 trust items + tall 3D card = pipeline invisible without scrolling. Max 2 actions in hero.
6. Dense "Architecture" section: 5 tabs + long capabilities + 3 metrics + raw prompt card + entities + limits, no clear reading order. One idea per section.
7. Small low-contrast secondary text everywhere (pills, footnotes, mono grey). Secondary text >=14px, no lightest grey; only 2 font families (sans UI, mono code only); max 4 type sizes.
8. Inconsistent section spacing and 3 different card systems. One vertical rhythm (96-128px desktop), one container width, one card pattern (radius/border/padding/icon size).
9. Footer: mixed links vs plain text, unclear affordance.
10. Mobile gate: at 390px no horizontal overflow, no clipped text, no stacked buttons, 5 tabs tappable, navbar collapses, 3-col workspace stacks vertically. (Note: browser tool could not set 390px viewport, so mobile must be re-tested for real before passing.)

## Linear/Vercel pattern to match
One dominant headline per screen, max 2 hero actions, lots of whitespace, limited elements per screen, one clear product visual, one idea per following section.
