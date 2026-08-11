# Prompt for Antigravity

Paste this as the first message in the new workspace.

---

You are picking up a **self-hosted WhatsApp AI sales bot** ("BuildStart.io"). The
code is complete and was extracted from a Lovable project; your job is to get it
running locally, then continue development.

## Architecture — do not change this split

Everything runs on my infrastructure except one stateless remote function:

- **Local (this repo):** self-hosted Supabase (Postgres + Auth + Kong + Storage +
  edge-runtime), all 12 edge functions, the Vite/React dashboard, WAHA for
  WhatsApp, MinIO for media, Firebase for push.
- **Remote (Lovable, already deployed, do not reimplement):** a single function
  `ai-generate` that proxies the Lovable AI Gateway.
  `POST https://<lovable-ref>.supabase.co/functions/v1/ai-generate` with header
  `x-bot-key: <BOT_API_KEY>` and body
  `{ systemPrompt?, messages:[{role,content}], model, maxTokens }` →
  `{ text, model, usage:{promptTokens,completionTokens,totalTokens} }`.
  It holds no data. Multiple independent bots share it, each with its own bot key.

`supabase/functions/ai-chat/index.ts` already routes through it: when
`AI_GENERATE_URL` and `BOT_API_KEY` are set it calls the remote transport,
otherwise it falls back to a direct gateway call. Keep both paths intact.

## Stack facts you must respect

- React 18 + Vite 5 + Tailwind 3 + TypeScript, shadcn/ui components.
- Deno edge functions, one folder per function under `supabase/functions/`.
- Multi-tenant: **every** table is scoped by `user_id` with RLS. Roles live in
  `public.user_roles` (enum `app_role`) and are checked via the security-definer
  function `has_role(uuid, app_role)` — never store a role on `profiles`.
- Edge functions validate JWTs in code with `authClient.auth.getClaims(token)`
  (NOT `getUser`) because the project uses ES256 signing keys.
- Currency is **LKR** everywhere. AI replies are plain text only: no markdown, no
  asterisks, 2–4 short lines, emojis as bullets.
- The AI must answer strictly from the tenant's products/FAQs. No hallucinations.
- Login only — public registration is disabled; accounts are created by an admin.
- Media lives in MinIO (`https://storage.buildstart.io`), one public bucket per
  business named `biz-<user_id>`, managed by the `media-storage` function.
- Message flow: WAHA webhook → `webhook-wsender` inserts into `message_queue` and
  fire-and-forget triggers `process-message`; `process-message` claims rows one per
  user (stale-recovery after 2 min, max 3 attempts) → `ai-chat` → `send-whatsapp`.
  A pg_cron job every minute is the safety net.
- AI reply post-processing uses tags that must be stripped before sending:
  `<ORDER_JSON>`, `<IMAGE_URL>`, `<VIDEO_URL>`, `<USED_FAQS>`.
- Media dispatch order for a product reply: video → image(s) → FAQ attachments → text.

## Tasks, in order

1. Bring up Supabase self-hosted with Docker (db, auth, rest, kong, storage,
   studio, edge-runtime). Run `db/01_schema.sql` then `db/02_seed.sql`. Set
   `GOTRUE_DISABLE_SIGNUP=true`.
2. Create the first auth user in Studio and run the commented admin block at the
   end of `db/02_seed.sql` with its UUID (`super_admin`, `enterprise` tier).
3. Mount `supabase/functions` into edge-runtime, run it with `--no-verify-jwt`, and
   populate its env from `.env.example` (including `AI_GENERATE_URL` +
   `BOT_API_KEY`).
4. Fill in and run `db/03_cron.sql` for the queue drainer and follow-ups.
5. Regenerate `frontend/src/integrations/supabase/types.ts` from the local DB.
6. `cd frontend && npm install && npm run dev`; log in, then verify each page loads:
   Dashboard, Products, FAQs, Orders, Conversations, Leads, Settings, and the admin
   pages.
7. End-to-end test: point a WAHA session's webhook at
   `/functions/v1/webhook-wsender`, send a WhatsApp message, and confirm the row in
   `message_queue` reaches `done`, the AI reply is stored in `conversations`, and the
   customer receives it. Check edge-runtime logs for the `[ai-generate]`-backed call.
8. Report anything that needed changing to run locally, then wait for feature work.

## Rules

- Do not move business logic, quotas, or tenant data to the remote function.
- Do not add a second AI provider or change the model without asking.
- Do not weaken RLS or add anonymous access to any table.
- Keep secrets in env files only; never in frontend source.
