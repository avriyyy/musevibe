# MuseVibe

MuseVibe turns an app idea into an indie-builder workspace. Start with a short description, answer a setup wizard, then shape the project through editable planning documents, a task board, and a design canvas with generated HTML page previews.

## Run locally

Requirements: Node.js 20.9 or newer and npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). AI settings are optional; leave them blank for the local demo fallbacks.

## Try the main flow

1. Describe an idea in the home composer. You can also attach a `.txt` or Markdown file and choose a Muse model.
2. Continue through **Stack**, **Questions**, **Design**, and **Review**. The wizard saves a draft that can be resumed.
3. Open the workspace. It prepares a product brief, six planning documents, a task board, and a suggested page plan.
4. Edit the Markdown documents, move or update tasks, and use the Design canvas to preview the chosen design system and generate planned pages as standalone HTML.

The workspace has **Documents**, **Design**, and **Tasks** views. The six generated document types are PRD, TRD, AFD, DBD, BSD, and IPD. Design can start from a bundled template, an uploaded `DESIGN.md`, or a reference link; link conversion requires a configured AI provider. Page prototypes are generated on demand rather than all at once.

## AI provider

Set these in `.env.local` to use an OpenAI-compatible Muse endpoint:

- `AI_API_URL`: provider base URL, including `/v1` when required; the app appends endpoint paths such as `/chat/completions`.
- `AI_API_KEY`: provider key.
- `AI_MODEL`: optional default text model; defaults to `muse-spark-1.3`.
- `AI_IMAGE_MODEL`: optional image model for raster logo generation; defaults to `muse-image-1.0`.
- `AI_VOICE_MODEL`: optional transcription model; defaults to `muse-voice-transcribe-1.0`.

Without AI credentials, naming, stack suggestions, setup questions, planning documents, tasks, and page drafts use local fallbacks. Logo generation falls back to project initials; AI-generated logos and voice transcription need a working provider.

## Data and persistence

Projects, drafts, documents, tasks, design data, and code files are stored in this browser's `localStorage` under `musevibe-store`. The selected model is stored separately under `musevibe:model`. Local projects persist across reloads on this browser unless its site storage is cleared.

Email/password sign-in is optional. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`, then allow `http://localhost:3000/account` (and your deployed `/account` URL) in Supabase Auth's redirect URL settings. Do not expose `SUPABASE_SERVICE_ROLE_KEY` to browser code. Signing in does not upload or sync projects: RLS is enabled with no owner policies, and the Supabase sync helper remains disabled until per-user ownership and migration behavior are implemented.

## Checks

```bash
npx tsc --noEmit
npm run lint
npm run build
```

`npm run lint` may report existing warnings; use its output to distinguish warnings from errors.
