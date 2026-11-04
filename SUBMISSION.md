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

## Try it (no signup)

1. Open the live app and type an idea in the composer.
2. Walk the Stack → Questions → Design → Review wizard as a guest.
3. Open the workspace: local task list, design previews, and page plan work immediately.
4. Optional: create a free account to sync and unlock AI-generated documents.

## Highlights

- Guest-first demo: the full flow runs with zero signup; every AI step degrades to honest local fallbacks, so the demo never stalls.
- Real workspace, not slides: editable Markdown docs, Kanban board, design systems with live HTML prototypes.
- Local-first with account sync: guest work stays in the browser; signed-in workspaces persist to Neon with owner-scoped reads/writes and conflict-safe revisions.
- Bring-your-own-key AI: works fully offline on local drafts; plug an OpenAI-compatible endpoint for live generation.

## Tech

Next.js 16 (App Router, Cache Components), Supabase Auth, Neon Postgres, Tailwind CSS, Framer-style motion in-house. AI over an OpenAI-compatible chat API with validation and local fallbacks at every step.
