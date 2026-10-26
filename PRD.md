# MuseVibe PRD

## 1. Summary

MuseVibe is one workspace where a solo indie dev moves from idea to working code
without switching tools. The user types an idea in a chat composer. MuseVibe turns
it into a PRD draft, breaks it into Kanban tasks, links wireframe screens to those
tasks, and gives the code editor the same PRD-plus-task context for AI generation.

## 2. Problem

A solo dev building a side project uses four disconnected tools: a doc for the plan,
a board for tasks, a design file for screens, and an editor for code. When the idea
changes, the other three go stale. Paying for and learning four tools costs more
time than the project itself, so most ideas die in a notes file.

## 3. Users

- Primary: solo indie hackers and students joining a 10-day hackathon. They can
  ship a small web app alone and read English UI copy.
- Secondary: mentors and judges who open the submitted link and need to understand
  the product in under three minutes.

## 4. Goals

- G1: A visitor can go from the landing composer to a generated PRD plus task list
  with zero signup friction in the demo path.
- G2: Every task, screen, and file in a project reads from one shared context,
  so the AI draft for code never contradicts the PRD.
- G3: The project builds, runs, and deploys on Vercel with Supabase persistence
  for UUID projects by day 10.

## 5. Non-goals (this release)

- Realtime collaboration, comments, or presence.
- One-click deploy, custom domains, or production hosting inside MuseVibe.
- Full Figma-grade design editing or a full IDE (terminal, debugger, extensions).
- Mobile apps. The web app must only stay usable on small screens.

## 6. Features (P0 for the hackathon demo)

### F1. Chat landing (`/`)
- Centered composer with idea textarea, Enter to submit, Shift+Enter for newline.
- Focus chips (Plan, Design, Code) that decide which tab the new project opens on.
- Suggestion chips that fill the composer with a real example idea.
- Submit creates a project and routes to `/projects/[id]/[focus]`.
- Dark entry surface, light tool screens. Both verified, no dead controls.

### F2. Projects (`/projects`)
- List of projects as rows with name plus one-line idea.
- Honest empty state with the next action written out.
- Manual project creation form (name plus one-sentence idea).

### F3. Plan tab (`/projects/[id]/plan`)
- PRD editor (markdown) with idea input and one-click "Create PRD + Tasks".
- AI endpoint `/api/ai/generate` with a `muse-spark-1.3` provider behind an
  abstraction; empty API keys fall back to a labeled local draft so the demo
  never breaks offline.
- Kanban with Todo, Doing, and Done columns, real counts, add, move, and delete.
- Save to and Load from Supabase tables `prds` and `tasks` for UUID project IDs.
  Local-only IDs stay in the Zustand store with a message saying so.

### F4. Design tab (`/projects/[id]/design`)
- Screen list linked to Plan tasks, with an honest empty state.
- Data model ready for a tldraw canvas (`screens.canvas_json`); canvas ships H5.

### F5. Code tab (`/projects/[id]/code`)
- Per-file editor with file tabs, textarea editing today and Monaco at H7.
- Preview pane showing current file contents; sandbox plus zip export at H7.
- AI actions reuse the active PRD plus active task as prompt context.

### F6. Killer demo: Vibe Generate
- One action from a single prompt produces a PRD draft, 6 to 8 tasks, 3 wireframe
  stubs, and a starter file. This is what the demo video shows end to end.

## 7. User flows

### Flow A (judge path, under 3 minutes)
1. Open `/`, read the headline, click a suggestion chip.
2. Press Enter. A project is created and the Plan tab opens with the idea prefilled.
3. Click "Create PRD + Tasks". PRD fills in, tasks appear in Todo.
4. Drag one card to Doing (arrow buttons today), open Design, open Code.

### Flow B (owner path)
1. Open `/projects`, create a project manually.
2. Same as Flow A from step 3, then Save to Supabase and confirm rows exist
   in the Supabase table editor.

## 8. Data model (Supabase Postgres)

- `projects(id uuid, name text, idea text, created_at)`
- `prds(project_id pk/fk, markdown text, updated_at)`
- `tasks(id uuid, project_id fk, title text, status text, linked_screen_id text, notes text)`
- `screens(id uuid, project_id fk, name text, canvas_json text, components text[])`
- `files(id uuid, project_id fk, path text, content text, language text)`

Local-first today: the Zustand store is the source of truth in the browser;
Supabase sync is explicit Save/Load per project. RLS is currently OFF for speed
and MUST be enabled with policies before any public launch with real users.

## 9. AI integration

- Provider abstraction in `src/lib/ai.ts`; model `muse-spark-1.3` by default.
- Server route `/api/ai/generate` accepts `{ kind: "prd" | "tasks" | "brief" | "code", prompt }`.
- Prompts send a trimmed slice (PRD plus active task, max ~800 chars), never the
  whole repo, to keep cost and latency bounded.
- Key names: `AI_API_URL`, `AI_API_KEY`, `AI_MODEL`.

## 10. Milestones (10 days, solo)

- H1-H2: Next.js scaffold, landing, dashboard, project shell, Supabase schema.
- H3-H4: Planning module plus Supabase sync. Done.
- H5-H6: Design module with tldraw canvas plus AI brief.
- H7-H8: Code module with Monaco, AI actions, preview, Vibe Generate wiring.
- H9: Integration polish, empty/loading/error states, cost caps.
- H10: Vercel deploy, seed demo project, 2 to 3 minute demo video, submission.

## 11. Risks

- AI key limits or downtime during judging. Mitigation: local-draft fallback
  already in place; the whole demo runs without keys.
- Scope creep on canvas and editor depth. Mitigation: tldraw and Monaco are
  embedded SDKs, not custom builds; anything beyond embedding is cut.
- RLS left OFF. Mitigation: enable with owner-only policies before public launch;
  the schema advisory already flags this as critical.

## 12. Success metrics

- Demo completes Flow A live with no errors and no API key configured.
- Build passes (`npm run build`, 12/12 routes) on every milestone day.
- At least one real project (this PRD's own build log) is tracked end to end
  in a MuseVibe project before submission.
