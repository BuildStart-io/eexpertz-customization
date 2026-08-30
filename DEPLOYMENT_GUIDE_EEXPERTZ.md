# Deployment & Migration Guide: `eexpertz-customization`

This document details the complete deployment process and architectural changes for deploying **eexpertz-customization** to the remote hosted Supabase infrastructure with complete schema and function isolation.

---

## 1. Executive Summary & Architecture Isolation

To prevent any conflict with other clients or existing platform databases, this customization runs in a **dedicated, isolated PostgreSQL schema** and uses **custom-suffixed Edge Functions**:

- **Database Schema**: `eexpertz_customization`
- **Edge Functions Suffix**: `-eexpertz` (e.g. `process-message-eexpertz`, `webhook-wsender-eexpertz`)
- **Dedicated Auth Triggers**: `on_auth_user_created_eexpertz`, `on_auth_user_role_eexpertz`, `on_auth_user_settings_eexpertz` on `auth.users`

---

## 2. Remote Server Deployment Steps

### Step 1: Database Migration (SQL Execution)
Connect to the remote Supabase PostgreSQL database (e.g. via Supabase Studio SQL Editor or `psql`) and execute the following scripts in order:

1. **`db/01_eexpertz_customization_schema.sql`**
   - Creates the `eexpertz_customization` schema.
   - Creates all tables (`profiles`, `customer_stages`, `conversations`, `settings`, `leads`, `orders`, etc.).
   - Sets up RLS policies and grants permissions to `anon`, `authenticated`, and `service_role`.
   - Attaches dedicated auth triggers to `auth.users` so new signups automatically populate `eexpertz_customization.profiles` and `eexpertz_customization.settings`.

2. **`db/02_eexpertz_customization_seed.sql`**
   - Seeds platform limits and settings into `eexpertz_customization.platform_settings`.

---

### Step 2: Remote Server Configuration (Expose Schema via PostgREST)

1. SSH into the remote server:
   ```bash
   ssh root@<remote-server-ip>
   ```

2. Edit the environment file at `/root/supabase/supabase/docker/.env`:
   ```bash
   nano /root/supabase/supabase/docker/.env
   ```

3. Update `PGRST_DB_SCHEMAS` to append `eexpertz_customization`:
   ```env
   PGRST_DB_SCHEMAS=public,graphql_public,happypetal_customization,taktak_customization,eexpertz_customization
   ```

4. **CRITICAL**: Recreate the Docker containers to inject the new schema configuration:
   ```bash
   cd /root/supabase/supabase/docker
   docker compose up -d
   ```
   *(Do NOT just run `docker restart supabase-rest` — recreating the containers is required to load the updated `.env`).*

---

### Step 3: Deploy Edge Functions

Deploy the suffixed Edge Functions to the remote server under `/volumes/functions/`:
- `process-message-eexpertz`
- `ai-chat-eexpertz`
- `send-whatsapp-eexpertz`
- `webhook-wsender-eexpertz`
- `wsender-sessions-eexpertz`
- `media-storage-eexpertz`
- `admin-manage-users-eexpertz`
- `manage-staff-eexpertz`
- `register-device-eexpertz`
- `send-followups-eexpertz`
- `send-push-eexpertz`
- `assetlinks-eexpertz`

---

### Step 4: Webhook Configuration for WAHA
When creating or updating WhatsApp sessions for eexpertz, configure the webhook URL:
```text
https://supabase.buildstart.io/functions/v1/webhook-wsender-eexpertz
```

---

## 3. Frontend Environment Configuration

In `frontend/.env`:
```env
VITE_SUPABASE_URL=https://supabase.buildstart.io
VITE_SUPABASE_PUBLISHABLE_KEY=<your-remote-anon-key>
VITE_SUPABASE_PROJECT_ID=selfhosted
VITE_SUPABASE_SCHEMA=eexpertz_customization
VITE_CUSTOMIZATION_SUFFIX=-eexpertz
```

---

## 4. Comparison & Guidelines: Original vs `eexpertz-customization`

### A. Database Schemas

| Feature / Table | Original BuildStart Platform | `eexpertz-customization` |
| :--- | :--- | :--- |
| **Schema** | `public` | `eexpertz_customization` (Completely isolated) |
| **`customer_stages`** | Not present / basic stages | Dedicated stage tracker with `received_sets`, `receipt_url`, `customer_name`, `customer_email`, `customer_phone`, `metadata` |
| **`settings` (`message_sets_config`)** | Generic welcome message | Rich JSON structure configuring Set 1, Set 2, Set 3, custom message sets, receipt workflow, and pay later responses |
| **Auth Triggers** | `on_auth_user_created` in `public` | Dedicated `on_auth_user_created_eexpertz` inserting into `eexpertz_customization.profiles` and `settings` with eexpertz Alibaba Selling defaults |
| **RLS Policies** | Scoped to `public` | Scoped strictly to `eexpertz_customization` tables with staff & owner multi-tenancy |

### B. Edge Functions Logic

| Edge Function | Original Logic | `eexpertz-customization` Logic |
| :--- | :--- | :--- |
| **`process-message-eexpertz`** | Generic e-commerce FAQ and AI responses | • **Set 1**: Dispatched on 1st message (Audio + Text + Images).<br>• **Set 2**: Dispatched on any follow-up (Urgency proofs + limited-time offers with 14:00 Sri Lanka cutoff check).<br>• **Set 3**: Triggered strictly on Course Fee / payment keywords.<br>• **Receipt Detection**: Auto-intake of student name, email, phone $\rightarrow$ marks stage as `pending_verification` (`Slip Sent`).<br>• **Pay Later Intent**: Multilingual regex patterns (Sinhala Unicode, Singlish, English) $\rightarrow$ marks stage as `pay_later` $\rightarrow$ engages chat takeover to stop automated messages. |
| **`webhook-wsender-eexpertz`** | Ingests WhatsApp webhooks and queues messages | Resolves WhatsApp `@lid` privacy identifiers and triggers `process-message-eexpertz`. |
| **`ai-chat-eexpertz`** | Generic product sales prompt | Contextualized for eexperts Alibaba Selling Master Courses with Sinhala default language prompts. |
| **`send-whatsapp-eexpertz`** | Standard WhatsApp text/image dispatch | Full media engine supporting Text, Image, Audio (voice notes), Video, and Document files via WAHA. |

