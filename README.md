# MuseVibe

**Type an idea, get a workspace.** MuseVibe turns an app idea into an indie-builder workspace. Start with a short description, answer a setup wizard, then shape the project through editable planning documents, a task board, and a design canvas with generated HTML page previews.

## Demo

Live: [https://musevibe.vercel.app](https://musevibe.vercel.app)

Sign in with an email and password to use the app. Every account gets 10 free credits a day, reset daily — one full project per day. Workspaces sync to your own Neon database with owner-scoped reads and writes.

## Run locally

Requirements: Node.js 20.9 or newer and npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). AI settings are optional; leave them blank for the local demo fallbacks.

## Try the main flow

Requires sign-in. Guests can browse the landing page only; creating a project needs an account.

1. Sign in with an email and password, then describe an idea in the home composer. You can also attach a `.txt` or Markdown file. Generation uses Muse Spark 1.3 Contributor.
2. Continue through **Stack**, **Questions**, **Design**, and **Review**. The wizard saves a draft that can be resumed.
3. Open the workspace. It prepares a product brief, six planning documents, a task board, and a suggested page plan.
4. Edit the Markdown documents, move or update tasks, and use the Design canvas to preview the chosen design system and generate planned pages as standalone HTML.

The workspace has **Documents**, **Design**, and **Tasks** views. The six generated document types are PRD, TRD, AFD, DBD, BSD, and IPD. Design can start from a bundled template, an uploaded `DESIGN.md`, or a reference link; link conversion requires a configured AI provider. Page prototypes are generated on demand rather than all at once.

## Sign-in, profile, and settings

Email-and-password registration and sign-in use Supabase Auth, with password reset via a link sent to your email. The home, projects, and workspace headers link directly to **Sign in** and **Create account**; dedicated routes are `/sign-in` and `/register`, with `/account` for account status. After signing in, **Settings** opens as a modal with four sections: **Profile** (display name stored in Supabase user metadata), **Credits** (10 free credits a day, one full project), **Sync** (Neon cloud backup status), and **Model** (default AI model saved in this browser; only `muse-spark-1.3-contributor` is enabled, the rest are locked). Display metadata is never used to authorize workspace access. Signing out ends only the current device session.

If email confirmation is enabled in Supabase, registration sends a confirmation email. Supabase Auth must allow the callback URLs listed under deployment setup below. Password recovery uses `/reset-password` after a secure email link.

## AI provider

Set these in `.env.local` to use an OpenAI-compatible Muse endpoint:

- `AI_API_URL`: provider base URL, including `/v1` when required; the app appends endpoint paths such as `/chat/completions`.
- `AI_API_KEY`: provider key; server-side only.
- `AI_MODEL`: optional default text model; defaults to `muse-spark-1.3`.
- `AI_IMAGE_MODEL`: optional image model for raster logo generation; defaults to `muse-image-1.0`.
- `AI_VOICE_MODEL`: optional transcription model; defaults to `muse-voice-transcribe-1.0`.

Without AI credentials, naming, stack suggestions, setup questions, planning documents, tasks, and page drafts use local fallbacks. Logo generation falls back to project initials; AI-generated logos and voice transcription need a working provider.

## Data and persistence

Drafts, documents, tasks, design data, and code files stay in this browser's `localStorage` under `musevibe-store`. The selected model is stored separately under `musevibe:model`.

Projects are created through an authenticated server route and stored in Neon. The server verifies the Supabase access token and derives the owner ID itself. Workspace reads and writes are owner-scoped. The browser keeps an owner-tagged recovery copy of account workspaces; those copies are hidden while signed out and from other accounts, and reconcile against Neon when the matching user signs in again. Optimistic revisions preserve local pending edits and flag conflicts rather than silently overwriting remote changes.

The existing Supabase workspace schema and RLS migration are legacy artifacts and are not used by the app's workspace API. They are left untouched; existing Supabase workspace rows are not automatically copied to Neon or deleted.

The earlier `/api/sync` implementation used a separate `public.projects` schema and could associate locally stored projects with a signed-in account. That schema is retained as [`neon/legacy-schema.sql`](neon/legacy-schema.sql) for reference, but is not used by the current app. The current app does not read, import, or delete those rows because their ownership provenance cannot be confirmed; review them before attempting any migration.

The current API writes only to `public.musevibe_projects`. It creates that table and its owner index additively with `IF NOT EXISTS` on the first authenticated workspace request; you can also run [`neon/migrations/0001_musevibe_projects.sql`](neon/migrations/0001_musevibe_projects.sql) manually. Use a pooled Neon connection string and keep it server-only. The API checks `DATABASE_URL`, then `POSTGRES_URL`, then `STORAGE_DATABASE_URL` (the latter two may be injected by Vercel's Neon integration); never use a `NEXT_PUBLIC_` prefix or put the connection string in browser code. A Supabase service-role key is not used by this app.

## Deploy to Vercel

Vercel can build this as a standard Next.js App Router project; no Cloudflare adapter or custom `vercel.json` is required. Connect the repository to the Vercel project and use `main` as the production branch. Before expecting account workspace sync, make sure the production environment has the Neon integration connected (or manually set one pooled connection string under a supported server-only name):

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the browser Auth client (public values only).
- `DATABASE_URL`, `POSTGRES_URL`, or `STORAGE_DATABASE_URL` for the pooled Neon connection string (server-only; `DATABASE_URL` takes precedence).
- `AI_API_URL` and `AI_API_KEY`, plus optional AI model variables, only if production AI features are needed. Keep the key server-only.

In Supabase Auth, set the production Site URL to `https://musevibe.vercel.app` and allow the exact email redirect URLs `https://musevibe.vercel.app/account` and `https://musevibe.vercel.app/reset-password`. Also allow `http://localhost:3000/account` and `http://localhost:3000/reset-password` for local development; add preview URLs only if they are used. Never add `SUPABASE_SERVICE_ROLE_KEY` to the browser environment.

A push to the connected production branch should trigger Vercel's standard Next.js deployment. Verify the deployed `/sign-in`, `/register`, and `/settings` routes (`/profile` redirects to `/settings`); test the password login and the Gmail reset-link flow; then sign in and create, reload, and edit an account-owned workspace to verify Neon persistence. Signed-out visitors should only reach the landing and auth pages.

## Checks

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

`npm run lint` may report existing warnings; use its output to distinguish warnings from errors.
