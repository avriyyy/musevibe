# MuseVibe

MuseVibe takes a product idea from one chat message to a first build plan. Type
the idea, answer a short setup wizard, and the app opens a workspace with a
generated product brief and a task board. The brief and tasks come from the
selected Muse model, and the whole workspace stays on the device.

## Run it

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The AI calls need these values in `.env.local`:

- `AI_API_URL`: OpenAI-compatible base URL, including `/v1`.
- `AI_API_KEY`: provider key.
- `AI_MODEL`: default chat model, used when the composer has no saved choice.
- `AI_IMAGE_MODEL`: optional logo model. Defaults to `muse-image-1.0`.
- `AI_VOICE_MODEL`: optional dictation model. Defaults to `muse-voice-transcribe-1.0`.

Leave the AI values empty to run the local fallbacks. Naming, questions, stack,
brief, and tasks all have local versions, so the demo still works offline. The
logo has no local drawing path and falls back to the project initials.

## Demo path

1. Type an idea in the composer and send it.
2. The app names the project and opens the setup wizard on Questions.
3. Answer the questions. Scope and logo are optional.
4. Finish setup to open the project workspace.
5. The workspace writes the brief from the idea and answers, then splits the
   brief into tasks. Tasks move between three columns and can be deleted.

Drafts and finished projects live in `localStorage` under `musevibe-store`.
Reloading keeps the wizard step and answers, the brief, and the board. Clear
site data to start from the seeded demo projects again.

## Checks

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Supabase

The UI is local-first and does not call Supabase yet. The schema in
`supabase/schema.sql` is ready for a later sync layer. Before a public deploy
with the Supabase anon key, run `supabase/lock-down.sql` in the SQL editor. It
enables RLS on all five tables and leaves them to the service role until owner
policies exist.
