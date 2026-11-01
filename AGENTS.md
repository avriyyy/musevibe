<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## AI generation quality

Before changing MuseVibe generation prompts, validators, fallback behavior, or document rendering, follow `.agents/skills/musevibe-generation-quality/SKILL.md`. Runtime-wide prompt rules live in `src/lib/generation-quality.ts`; keep them aligned with specialized prompt builders and deterministic validators. Do not change the configured model unless explicitly requested.
