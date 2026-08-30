-- =============================================================================
-- BUILDSTART.IO — EEXPERTZ CUSTOMIZATION ISOLATED SCHEMA MIGRATION
-- Schema Name: eexpertz_customization
-- Description: Completely isolated database schema for eexpertz Alibaba Selling
--              Master Course WhatsApp Chatbot & Student Verification Automation.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS eexpertz_customization;

-- -----------------------------------------------------------------------------
-- 1. CUSTOM TYPES & ENUMS
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE eexpertz_customization.app_role AS ENUM ('super_admin', 'business_user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE eexpertz_customization.plan_tier AS ENUM ('free', 'pro', 'enterprise');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- -----------------------------------------------------------------------------
-- 2. CORE DATABASE TABLES
-- -----------------------------------------------------------------------------

-- Profiles
CREATE TABLE IF NOT EXISTS eexpertz_customization.profiles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE,
    full_name text,
    email text,
    business_name text,
    plan_tier eexpertz_customization.plan_tier DEFAULT 'free'::eexpertz_customization.plan_tier NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_paused boolean DEFAULT false NOT NULL,
    max_products integer DEFAULT 5,
    max_faqs integer DEFAULT 10,
    addon_products integer DEFAULT 0 NOT NULL,
    addon_faqs integer DEFAULT 0 NOT NULL,
    addon_orders integer DEFAULT 0 NOT NULL,
    addon_ai_messages integer DEFAULT 0 NOT NULL,
    addon_images integer DEFAULT 0 NOT NULL,
    addon_staff integer DEFAULT 0 NOT NULL,
    addon_contacts integer DEFAULT 0 NOT NULL,
    billing_cycle_start timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- User Roles
CREATE TABLE IF NOT EXISTS eexpertz_customization.user_roles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    role eexpertz_customization.app_role DEFAULT 'business_user'::eexpertz_customization.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role)
);

-- Settings
CREATE TABLE IF NOT EXISTS eexpertz_customization.settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT settings_user_id_key_key UNIQUE (user_id, key)
);

-- Customer Stages (Customized for eexpertz)
CREATE TABLE IF NOT EXISTS eexpertz_customization.customer_stages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    phone_number text NOT NULL,
    current_stage text DEFAULT 'set1'::text NOT NULL,
    received_sets jsonb DEFAULT '[]'::jsonb NOT NULL,
    customer_name text,
    customer_email text,
    customer_phone text,
    receipt_url text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT customer_stages_user_phone_key UNIQUE (user_id, phone_number)
);

-- Conversations
CREATE TABLE IF NOT EXISTS eexpertz_customization.conversations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    phone_number text NOT NULL,
    message text NOT NULL,
    direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message_type text DEFAULT 'text'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Chat Takeovers
CREATE TABLE IF NOT EXISTS eexpertz_customization.chat_takeovers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    phone_number text NOT NULL,
    is_taken_over boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chat_takeovers_user_id_phone_number_key UNIQUE (user_id, phone_number)
);

-- Message Queue
CREATE TABLE IF NOT EXISTS eexpertz_customization.message_queue (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    wsender_message_id text NOT NULL,
    user_id uuid NOT NULL,
    phone_number text NOT NULL,
    sender_name text DEFAULT 'Unknown'::text,
    message_text text DEFAULT ''::text,
    message_type text DEFAULT 'text'::text,
    session_api_key text,
    raw_payload jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 3 NOT NULL,
    error_message text,
    correlation_id text,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Leads
CREATE TABLE IF NOT EXISTS eexpertz_customization.leads (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    phone_number text NOT NULL,
    customer_name text,
    assigned_to uuid,
    status text DEFAULT 'new'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT leads_user_id_phone_number_key UNIQUE (user_id, phone_number)
);

-- Orders
CREATE TABLE IF NOT EXISTS eexpertz_customization.orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    customer_name text NOT NULL,
    customer_phone text NOT NULL,
    customer_address text,
    order_items jsonb DEFAULT '[]'::jsonb NOT NULL,
    special_instructions text,
    payment_method text DEFAULT 'bank_transfer'::text NOT NULL CHECK (payment_method IN ('cod', 'bank_transfer')),
    status text DEFAULT 'pending'::text NOT NULL CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    total_amount numeric(10,2) DEFAULT 0 NOT NULL,
    whatsapp_phone text,
    district text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Products
CREATE TABLE IF NOT EXISTS eexpertz_customization.products (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    delivery_price numeric DEFAULT 0,
    product_type text DEFAULT 'digital'::text NOT NULL CHECK (product_type IN ('physical', 'digital')),
    variations jsonb DEFAULT '[]'::jsonb,
    images text[] DEFAULT '{}'::text[],
    video_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- FAQs
CREATE TABLE IF NOT EXISTS eexpertz_customization.faqs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    product_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    is_tracked boolean DEFAULT false NOT NULL,
    media_urls text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- FAQ Usage Logs
CREATE TABLE IF NOT EXISTS eexpertz_customization.faq_usage_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    faq_id uuid NOT NULL,
    user_id uuid NOT NULL,
    phone_number text NOT NULL,
    sender_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- AI Usage Logs
CREATE TABLE IF NOT EXISTS eexpertz_customization.ai_usage_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    phone_number text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Contact Usage
CREATE TABLE IF NOT EXISTS eexpertz_customization.contact_usage (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    phone_number text NOT NULL,
    period_start timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Staff Accounts
CREATE TABLE IF NOT EXISTS eexpertz_customization.staff_accounts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id uuid NOT NULL,
    staff_user_id uuid NOT NULL,
    staff_email text NOT NULL,
    staff_name text,
    permissions text[] DEFAULT '{}'::text[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    whatsapp_number text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- User Wsender Sessions
CREATE TABLE IF NOT EXISTS eexpertz_customization.user_wsender_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    session_id text NOT NULL,
    session_name text,
    session_api_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Platform Settings
CREATE TABLE IF NOT EXISTS eexpertz_customization.platform_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    key text NOT NULL UNIQUE,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Push Subscriptions
CREATE TABLE IF NOT EXISTS eexpertz_customization.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- FCM Tokens
CREATE TABLE IF NOT EXISTS eexpertz_customization.fcm_tokens (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    device_token text NOT NULL,
    device_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fcm_tokens_user_id_device_token_key UNIQUE (user_id, device_token)
);

-- -----------------------------------------------------------------------------
-- 3. HELPER FUNCTIONS & LOGIC
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION eexpertz_customization.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = eexpertz_customization, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION eexpertz_customization.has_role(_user_id uuid, _role eexpertz_customization.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = eexpertz_customization, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM eexpertz_customization.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION eexpertz_customization.is_staff_of(_staff_user_id uuid, _owner_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = eexpertz_customization, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM eexpertz_customization.staff_accounts
    WHERE staff_user_id = _staff_user_id
      AND owner_id = _owner_id
      AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION eexpertz_customization.can_read_usage(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = eexpertz_customization, public
AS $$
  SELECT auth.uid() IS NULL
      OR auth.uid() = _user_id
      OR eexpertz_customization.has_role(auth.uid(), 'super_admin'::eexpertz_customization.app_role)
      OR eexpertz_customization.is_staff_of(auth.uid(), _user_id)
$$;

CREATE OR REPLACE FUNCTION eexpertz_customization.get_contact_usage(_user_id uuid, _since timestamp with time zone)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = eexpertz_customization, public
AS $$
DECLARE c integer;
BEGIN
  IF NOT eexpertz_customization.can_read_usage(_user_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT COUNT(DISTINCT phone_number) INTO c
  FROM eexpertz_customization.contact_usage
  WHERE user_id = _user_id AND created_at >= _since;
  RETURN COALESCE(c, 0);
END;
$$;

CREATE OR REPLACE FUNCTION eexpertz_customization.get_ai_message_usage(_user_id uuid, _since timestamp with time zone)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = eexpertz_customization, public
AS $$
DECLARE c integer;
BEGIN
  IF NOT eexpertz_customization.can_read_usage(_user_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT COUNT(*) INTO c
  FROM eexpertz_customization.ai_usage_logs
  WHERE user_id = _user_id AND created_at >= _since;
  RETURN COALESCE(c, 0);
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. DEDICATED AUTH TRIGGERS FOR EEXPERTZ USER SIGNUP
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION eexpertz_customization.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = eexpertz_customization, public
AS $$
BEGIN
  INSERT INTO eexpertz_customization.profiles (user_id, email, full_name, business_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'eexperts')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION eexpertz_customization.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = eexpertz_customization, public
AS $$
BEGIN
  INSERT INTO eexpertz_customization.user_roles (user_id, role)
  VALUES (NEW.id, 'business_user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION eexpertz_customization.handle_new_user_settings()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = eexpertz_customization, public
AS $$
BEGIN
  INSERT INTO eexpertz_customization.settings (user_id, key, value) VALUES
    (NEW.id, 'welcome_message', '{"text": "පාඨමාලා ගාස්තු ඇතුලු විස්තර දැනගන්න අවශ්යනම් Course Fee කියලා Message එකක් එවන්න . ☺️🧡"}'::jsonb),
    (NEW.id, 'auto_responses', '{"enabled": true}'::jsonb),
    (NEW.id, 'message_sets_config', '{
      "enabled": true,
      "set1": {
        "enabled": true,
        "name": "Set 1 (Welcome)",
        "audio_url": "",
        "text1": "පාඨමාලා ගාස්තු ඇතුලු විස්තර දැනගන්න අවශ්යනම් Course Fee කියලා Message එකක් එවන්න . ☺️🧡",
        "text2": "⭕ අපේ Alibaba Selling පාඨමාලව හැදැරූ සිසුන්ගේ Earning Proof සහ Student Feedbacks ගැන දැනගැනීමට පහත ලින්ක් එක ක්ලික් කරන්න. 👇\n\nfeedbacks.eexpertzacademy.com",
        "img1_url": "https://storage.buildstart.io/biz-7fd28dd0-11a4-43e7-988b-edbfdc994b25/sets/9d71b992-cf2b-4dc0-9691-16216ce5138a.png",
        "img1_caption": "මාසෙන් රුපියල් ලක්ශ 43 ක් ! 🫵🧡\n\n🟠මේ තියෙන්නෙ අපි මාර්තු වල පටන් ගත්ත Alibaba Selling Business එකක ගිය මාසෙ (June) සේල් එක. ඔයාට පේනවා ඇති අපි ගිය මාසෙ විතරක් රුපියල් ලක්ශ 43 කට ආසන්න සේල් එකක් කරලා තියෙනවා. ඒ වගේම Orders 2100 කට ආසන්න ප්රමාණයක් ඇවිල්ලා තියෙනවා. \n\n🟠මෙතන මේ ලක්ශ 43 ක සේල් එකෙන් අපිට රුපියල් ලක්ශ 20 කට වැඩි ලාභයක් තියෙනවා. දවස් 30 න් රුපියල් ලක්ශ 20 ක් කියන්නෙ හිතාගන්නවත් බෑ නේද ?\n\n🟠 මෙච්චර අඩු කාලෙකින් මේ වගේ ආදයමක් ගන්න පුලුවන් එකම බිස්නස් එක තමයි Alibaba Selling කියලා කියන්නේ.\n\nමේවා තමා ඇත්තම ඔන්ලයින් බිස්නස් 💪🧡",
        "img2_url": "https://storage.buildstart.io/biz-7fd28dd0-11a4-43e7-988b-edbfdc994b25/sets/a193b2b1-cdd9-4743-bf58-bef03c4cca5d.jpg"
      },
      "set2": {
        "enabled": true,
        "name": "Set 2 (Discounts)",
        "img3_url": "https://storage.buildstart.io/biz-7fd28dd0-11a4-43e7-988b-edbfdc994b25/sets/a5251727-f2ea-4de1-8472-e3641ec05e3a.jpg",
        "img3_caption": "✅සම්පූර්ණ කෝස් Fee එක රු.10 900 යි.නමුත් අද දින මෙම පාඨමාලාව මිලදී ගන්නා පලමු සිසුන් 25 දෙනාට මෙය රු.4900 කට මිලදී ගන්න පුලුවන්.\n\n✅පාඨමාලාව මිලදි ගන්න කැමතිද කියල අපිට හැකි ඉක්මනින් Message එකක් දාන්න.\n\nUpdate‼️\nදැනට අද දින 21 දෙනෙක් මෙය මිලදී අරගෙන ඇති නිසා මෙය ඉහත මිලට ලබා ගත හැක්කේ තවත් සිසුන් 4 දෙනෙකුට පමණි.",
        "audio1_url": "",
        "audio2_url": "",
        "img4_url": "https://storage.buildstart.io/biz-7fd28dd0-11a4-43e7-988b-edbfdc994b25/sets/ceef0369-ab3f-4efd-b14e-4211cf30ceb0.jpg",
        "img4_caption": "Update‼️\nදැනට අද දින 22 දෙනෙක් මෙය මිලදී අරගෙන ඇති නිසා මෙය ඉහත මිලට ලබා ගත හැක්කේ තවත් සිසුන් 3 දෙනෙකුට පමණි.",
        "text_time_restricted": "මේක ඇත්තටම ඊයෙ අපි දීපු offer එකක් . ඒත් ඊයේ කෝස් එක ගත්තෙ 25 න් 21 ක් විතරයි . ඒක නිසා තව 4 දෙනෙක්ට අද අවස්තාව තියෙනව ඊයෙ offer price එකටම පාඨමාලව මිලදී ගන්න.",
        "cutoff_hour_sl": 14,
        "img5_url": "https://storage.buildstart.io/biz-7fd28dd0-11a4-43e7-988b-edbfdc994b25/sets/36878d8f-836b-48fa-b46a-7b8c4d5f8065.jpg",
        "img5_caption": "මේක ඊයේ End උන Offer එකක්. ඒත් අද උදෑසන 10 ට පෙර පාඨමාලව මිලදී ගන්න අයටත් අපි මේ Offer එක ලබා දෙනව. ඒ කියන්නෙ අද රු.4900 ක් දීලා අපේ Alibaba Selling Master Course එක මිලදී ගන්නකොට තවත් පාඨමාලා දෙකක් ම නොමිලේ ලැබෙනවා. ☺️🧡🧡"
      },
      "set3": {
        "enabled": true,
        "name": "Set 3 (Payment)",
        "bank_details_text": "අද දින *Alibaba Selling Master Course* එක මිලදි ගන්න අය පහත Bank Details වලට *රු.4900 ක මුදලක් බැර* කර රිසිට්පතේ Photo එක්ක් සමග ඔබේ නම සහ Email එක 0779638667 යන අංකයට WhatsApp කරන්න. 👇\n\nBank - NDB Bank\nHolder Name - eExpertz\nAccount Number - *111000271906*\nBranch - Maharagama\n\nBank - Sampath Bank\nHolder Name- eExpertz\nAccount Number - *109214030103*\nBank Branch- Maharagama\n\nBank - BOC Bank\nHolder Name- eExpertz\nAccount Number - *95577622*\nBank Branch- Maharagama\n\n⭕ *Payment එක කරලා රිසිට් එක එව්වට පස්සෙ විනාඩි 10 ඇතුලත සම්පූර්ණ පාඨමාලාවම ලැබෙනවා.*",
        "urgency_text": "Update‼️\nදැනට අද දින 23 දෙනෙක් මෙය මිලදී අරගෙන ඇති නිසා මෙය ඉහත මිලට ලබා ගත හැක්කේ තවත් සිසුන් 2 දෙනෙකුට පමණි.",
        "confirmation_text": "Payment එක දාන්න පැය කිහිපයක් යනවනම් සල්ලි දාන්න කලින් Message එකක් දාල තාම 25 දෙනා Fill වෙලා නැද්ද කියලා Confirm කරගෙන Payment එක දාන්න."
      },
      "receipt_workflow": {
        "request_details_text": "ඔබගේ ගෙවීම් රිසිට්පත ලැබුණා. කරුණාකර ඔබගේ නම (Full Name), Email ලිපිනය සහ දුරකථන අංකය (Phone Number) මෙහි එවන්න. 📝",
        "onboarding_confirm_text": "ඔබගේ විස්තර ලැබුණා. ඔබගේ Payment එක තහවුරු කර පැය 1ක් (1 hour) ඇතුලත ඔබව පාඨමාලාවට සම්බන්ධ කරනු ලැබේ. ස්තූතියි! ☺️🧡"
      },
      "pay_later_response": "හොඳයි, ඔබට පහසු වේලාවක අප හා සම්බන්ධ වන්න. ස්තූතියි! ☺️"
    }'::jsonb)
  ON CONFLICT (user_id, key) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Dedicated Triggers on auth.users for eexpertz_customization
DROP TRIGGER IF EXISTS on_auth_user_created_eexpertz ON auth.users;
CREATE TRIGGER on_auth_user_created_eexpertz
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION eexpertz_customization.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_role_eexpertz ON auth.users;
CREATE TRIGGER on_auth_user_role_eexpertz
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION eexpertz_customization.handle_new_user_role();

DROP TRIGGER IF EXISTS on_auth_user_settings_eexpertz ON auth.users;
CREATE TRIGGER on_auth_user_settings_eexpertz
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION eexpertz_customization.handle_new_user_settings();

-- -----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------

ALTER TABLE eexpertz_customization.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE eexpertz_customization.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE eexpertz_customization.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE eexpertz_customization.customer_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE eexpertz_customization.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE eexpertz_customization.chat_takeovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE eexpertz_customization.message_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE eexpertz_customization.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE eexpertz_customization.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE eexpertz_customization.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE eexpertz_customization.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE eexpertz_customization.faq_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE eexpertz_customization.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE eexpertz_customization.contact_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE eexpertz_customization.staff_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE eexpertz_customization.user_wsender_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE eexpertz_customization.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE eexpertz_customization.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE eexpertz_customization.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Service Role Full Access on all tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'eexpertz_customization'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Service role full access" ON eexpertz_customization.%I', tbl);
    EXECUTE format('CREATE POLICY "Service role full access" ON eexpertz_customization.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;

-- Authenticated Users Policies (Owner & Staff isolation)
CREATE POLICY "Users view/edit own profile" ON eexpertz_customization.profiles
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR eexpertz_customization.is_staff_of(auth.uid(), user_id));

CREATE POLICY "Users view own settings" ON eexpertz_customization.settings
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR eexpertz_customization.is_staff_of(auth.uid(), user_id));

CREATE POLICY "Users manage own customer stages" ON eexpertz_customization.customer_stages
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR eexpertz_customization.is_staff_of(auth.uid(), user_id));

CREATE POLICY "Users manage own conversations" ON eexpertz_customization.conversations
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR eexpertz_customization.is_staff_of(auth.uid(), user_id));

CREATE POLICY "Users manage own chat takeovers" ON eexpertz_customization.chat_takeovers
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR eexpertz_customization.is_staff_of(auth.uid(), user_id));

CREATE POLICY "Users manage own leads" ON eexpertz_customization.leads
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR eexpertz_customization.is_staff_of(auth.uid(), user_id));

CREATE POLICY "Users manage own orders" ON eexpertz_customization.orders
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR eexpertz_customization.is_staff_of(auth.uid(), user_id));

CREATE POLICY "Users manage own products" ON eexpertz_customization.products
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR eexpertz_customization.is_staff_of(auth.uid(), user_id));

CREATE POLICY "Users manage own faqs" ON eexpertz_customization.faqs
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR eexpertz_customization.is_staff_of(auth.uid(), user_id));

CREATE POLICY "Users manage own sessions" ON eexpertz_customization.user_wsender_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR eexpertz_customization.is_staff_of(auth.uid(), user_id));

-- -----------------------------------------------------------------------------
-- 6. PERMISSIONS & GRANTS
-- -----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA eexpertz_customization TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA eexpertz_customization TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA eexpertz_customization TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA eexpertz_customization TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA eexpertz_customization GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA eexpertz_customization GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA eexpertz_customization GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

