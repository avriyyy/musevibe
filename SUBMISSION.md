# MuseVibe — Submission

**Type an idea, get a workspace.** One sentence becomes a builder workspace where planning documents, tasks, design, and code share the same context.

## Links

- Live app: https://musevibe.vercel.app
- Demo video: <TODO: link after Recordly edit>
- Source: https://github.com/avriyyy/musevibe

## Problem

Indie builders lose their idea across four disconnected tools: a PRD in one doc, tasks in another, designs somewhere else, and starter code that matches none of them. Re-explaining the idea to every tool kills momentum.

## Solution

MuseVibe keeps one context from sentence to workspace. Describe the idea, answer a short setup wizard, and work in a single place: six planning documents (PRD, TRD, AFD, DBD, BSD, IPD), a task board, a design canvas with generated HTML page previews, and starter files.

## Try it

1. Open the live app and sign in with an email and password (new accounts get 10 free credits, reset daily).
2. Type an idea in the composer: creating the project uses 10 credits, generation inside is included.
3. Walk the Stack → Questions → Design → Review wizard.
4. Open the workspace: brief, six planning documents, task board, page plan, and design canvas.

## Highlights

- One context end to end: a single idea flows into the PRD, tasks, design, and starter code; every AI step degrades to honest local fallbacks, so the demo never stalls.
- Real workspace, not slides: editable Markdown docs, Kanban board, design systems with live HTML prototypes.
- Daily credits, one model: 10 free credits a day build exactly one full project; generation runs on Muse Spark 1.3 Contributor.
- Account sync: signed-in workspaces persist to Neon with owner-scoped reads/writes and conflict-safe revisions.
- Bring-your-own-key AI: works fully offline on local drafts; plug an OpenAI-compatible endpoint for live generation.

## Tech

Next.js 16 (App Router, Cache Components), Supabase Auth, Neon Postgres, Tailwind CSS, Meta's Astryx design system with in-house reveal motion. AI over an OpenAI-compatible chat API with validation and local fallbacks at every step.
