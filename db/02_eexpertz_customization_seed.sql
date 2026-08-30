-- =============================================================================
-- BUILDSTART.IO — EEXPERTZ CUSTOMIZATION SEED DATA
-- Schema: eexpertz_customization
-- =============================================================================

INSERT INTO eexpertz_customization.platform_settings (key, value) VALUES
('plan_limits', '{
  "free": {
    "max_products": 5,
    "max_faqs": 10,
    "max_orders_per_month": 50,
    "max_ai_messages_per_month": 200,
    "max_images": 20,
    "max_staff": 0,
    "max_contacts": 500
  },
  "pro": {
    "max_products": 50,
    "max_faqs": 100,
    "max_orders_per_month": 500,
    "max_ai_messages_per_month": 2000,
    "max_images": 200,
    "max_staff": 3,
    "max_contacts": 5000
  },
  "enterprise": {
    "max_products": 9999,
    "max_faqs": 9999,
    "max_orders_per_month": 9999,
    "max_ai_messages_per_month": 99999,
    "max_images": 9999,
    "max_staff": 99,
    "max_contacts": 99999
  }
}'::jsonb),
('admin_credentials', '{"email": "admin@buildstart.local", "role": "super_admin"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

