# MuseVibe DESIGN.md (Meta components, Tailwind, English UI)

Identity: a calm, dense builder tool for indie devs. Follows Meta component styling (Facebook Design System): white bar, content on a wash background, pill blue primary buttons.

Dial: ENERGY 1 / RHYTHM 2 / MOTION 1.
- ENERGY 1 because this is a work tool. Reason: devs focus on tasks, not on visuals shouting at them.
- RHYTHM 2 because the landing may vary composition between sections while app screens stay dense and consistent. Reason: variation only serves the narrative.
- MOTION 1 because only hover states and loading states exist. Reason: the tool must feel instant.

Entry: a dark chat landing (near-black, centered composer, suggestion chips), in the style the owner explicitly asked for. Reason: one focused starting action, matching how AI tools begin. The tool screens stay light, which suits long daytime work; both modes are verified.

Tailwind tokens (`globals.css`, `@theme`):
- meta #0064E0 for primary CTAs, links, active tabs, focus rings. Hover #0143B5, pressed #004BB9. Reason: one key moment per screen, everything else stays matte.
- ink #1C2B33 primary text, muted #5D6C7B secondary text, line #DEE3E9 hairlines, wash #F0F2F5 content background.
- Pill buttons, 12px cards, 8px inputs. Reason: pills mark actions, small radii mark precision.
- Figtree for UI, JetBrains Mono for code and IDs. Reason: Figtree is the Meta neutral theme font, mono separates edited content from read content.

Components:
- TopNav: white sticky bar, pill nav items with active wash state, blue pill CTA on the right. Reason: bar and body share one token system, so the contrast reads as intentional FDS layering.
- Plan/Design/Code and file tabs: blue underline for the active one. Reason: navigation state stays readable without loud colors.
- Kanban: wash columns, white cards with a status-colored left edge (gray, amber, green). Reason: the edge marks real per-task state.
- Badges show counts only. Errors use a titled panel plus `role="alert"`. Empty states always name the cause and the next step.
