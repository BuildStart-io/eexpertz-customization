-- =============================================================================
-- BUILDSTART.IO — EEXPERTZ ACADEMY SEED DATA
-- Schema: eexpertz_customization
-- Products, Bank Payment Accounts, and Comprehensive Course FAQs
-- =============================================================================

DO $$
DECLARE
  v_user_id uuid;
  v_product_id uuid;
BEGIN
  -- Get the primary business user ID from profiles or auth.users
  SELECT user_id INTO v_user_id FROM eexpertz_customization.profiles LIMIT 1;
  
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  END IF;

  IF v_user_id IS NOT NULL THEN

    -- -------------------------------------------------------------------------
    -- 1. SEED PRODUCT: Alibaba Selling Master Course
    -- -------------------------------------------------------------------------
    INSERT INTO eexpertz_customization.products (
      id,
      user_id,
      name,
      description,
      price,
      product_type,
      is_active,
      images,
      variations
    ) VALUES (
      'e1111111-1111-1111-1111-111111111111'::uuid,
      v_user_id,
      'Alibaba Selling Master Course',
      'ශ්‍රී ලංකාවේ සිට Alibaba හරහා සාර්ථකව Online Business එකක් ආරම්භ කර පවත්වාගෙන යන ආකාරය මුල සිට සරලව කියාදෙන සම්පූර්ණ ප්‍රායෝගික වීඩියෝ පාඨමාලාව. ප්‍රධාන පාඨමාලාව සමඟ තවත් පාඨමාලා 2ක් නොමිලේ සහ Lifetime Student Community Support හිමිවේ.',
      4900.00,
      'digital',
      true,
      ARRAY[
        'https://storage.buildstart.io/biz-7fd28dd0-11a4-43e7-988b-edbfdc994b25/sets/9d71b992-cf2b-4dc0-9691-16216ce5138a.png',
        'https://storage.buildstart.io/biz-7fd28dd0-11a4-43e7-988b-edbfdc994b25/sets/a193b2b1-cdd9-4743-bf58-bef03c4cca5d.jpg'
      ],
      '[]'::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      price = EXCLUDED.price,
      is_active = true,
      images = EXCLUDED.images;

    v_product_id := 'e1111111-1111-1111-1111-111111111111'::uuid;

    -- -------------------------------------------------------------------------
    -- 2. SEED PAYMENT INFO: 3 Bank Accounts
    -- -------------------------------------------------------------------------
    INSERT INTO eexpertz_customization.settings (user_id, key, value)
    VALUES (
      v_user_id,
      'payment_info',
      '{
        "accounts": [
          {
            "account_type": "bank",
            "account_label": "NDB Bank",
            "account_number": "111000271906",
            "account_name": "eExpertz",
            "branch": "Maharagama"
          },
          {
            "account_type": "bank",
            "account_label": "Sampath Bank",
            "account_number": "109214030103",
            "account_name": "eExpertz",
            "branch": "Maharagama"
          },
          {
            "account_type": "bank",
            "account_label": "BOC Bank (Bank of Ceylon)",
            "account_number": "95577622",
            "account_name": "eExpertz",
            "branch": "Maharagama"
          }
        ]
      }'::jsonb
    )
    ON CONFLICT (user_id, key) DO UPDATE SET
      value = EXCLUDED.value;

    -- -------------------------------------------------------------------------
    -- 3. SEED COMPREHENSIVE COURSE FAQS
    -- -------------------------------------------------------------------------
    DELETE FROM eexpertz_customization.faqs WHERE user_id = v_user_id;

    INSERT INTO eexpertz_customization.faqs (user_id, question, answer, product_id, is_active, is_tracked, media_urls) VALUES
    (
      v_user_id,
      'පාඨමාලාවට ඇතුලත් වන්නේ මොනවාද? (What is included in the course?)',
      'Alibaba Selling Master Course එකෙහි ශ්‍රී ලංකාවේ සිට Alibaba හරහා භාණ්ඩ තෝරාගැනීම (Product Research), නිවැරදි සැපයුම්කරුවන් (Verified Suppliers) සොයාගැනීම, සාකච්ඡා කිරීම (Negotiation), ලංකාවට ආරක්ෂිතව ගෙන්වාගැනීම (Shipping & Customs Clearance), සහ ලංකාව තුළ ඉහළ ලාභයකට විකුණන ආකාරය පියවරෙන් පියවර සරලව කියාදෙනු ලැබේ. ඊට අමතරව තවත් Bonus Courses 2ක් නොමිලේ හිමිවේ.',
      v_product_id,
      true,
      true,
      ARRAY['https://storage.buildstart.io/biz-7fd28dd0-11a4-43e7-988b-edbfdc994b25/sets/a193b2b1-cdd9-4743-bf58-bef03c4cca5d.jpg']
    ),
    (
      v_user_id,
      'පාඨමාලා ගාස්තුව කීයද සහ Offer එක කුමක්ද? (Course Fee & Discount Offer)',
      'සම්පූර්ණ කෝස් Fee එක රු. 10,900 කි. නමුත් අද දින මෙම පාඨමාලාව මිලදී ගන්නා පළමු සිසුන් 25 දෙනා සඳහා විශේෂ 55% ක වට්ටමක් සහිතව රු. 4,900 කට මිලදී ගත හැක. (Bonus Courses 2ක් ද නොමිලේ ඇතුලත් වේ).',
      v_product_id,
      true,
      true,
      ARRAY['https://storage.buildstart.io/biz-7fd28dd0-11a4-43e7-988b-edbfdc994b25/sets/a5251727-f2ea-4de1-8472-e3641ec05e3a.jpg']
    ),
    (
      v_user_id,
      'ගෙවීම් සිදු කරන්නේ කෙසේද? (How to pay - Bank Details)',
      'පහත ඕනෑම බැංකු ගිණුමකට රු. 4,900 ක මුදල බැර කර රිසිට්පතේ Photo එකක් සමඟ ඔබේ නම (Full Name) සහ Email ලිපිනය WhatsApp (0779638667) කරන්න:

🏦 NDB Bank
• Account Number: 111000271906
• Account Name: eExpertz
• Branch: Maharagama

🏦 Sampath Bank
• Account Number: 109214030103
• Account Name: eExpertz
• Branch: Maharagama

🏦 BOC Bank
• Account Number: 95577622
• Account Name: eExpertz
• Branch: Maharagama',
      v_product_id,
      true,
      true,
      '{}'::text[]
    ),
    (
      v_user_id,
      'මුදල් ගෙවූ පසු පාඨමාලාව ලැබෙන්නේ කවදාද? (When will I get course access?)',
      'ඔබ Payment එක සිදු කර රිසිට්පත සමඟ ඔබේ නම සහ Email ලිපිනය අප වෙත එවූ පසු, අපගේ කණ්ඩායම විසින් එය පරීක්ෂා කර විනාඩි 10 ත් පැය 1 ත් අතර කාලය තුළ ඔබට පාඨමාලාවට Login වීමේ සියලු විස්තර සහ Link එක ලබා දෙනු ලැබේ.',
      v_product_id,
      true,
      false,
      '{}'::text[]
    ),
    (
      v_user_id,
      'කිසිදු පූර්ව දැනුමක් නැති කෙනෙකුට මෙය කළ හැකිද? (Can beginners follow this?)',
      'ඔව්, අනිවාර්යයෙන්ම! මෙම පාඨමාලාව සකස් කර ඇත්තේ කිසිදු පූර්ව ව්‍යාපාරික හෝ තාක්ෂණික දැනුමක් නොමැති ඕනෑම අයෙකුට මුල සිට ඉතා සරලව තේරුම් ගත හැකි ආකාරයටයි. පරිගණකයක් හෝ ස්මාර්ට් ජංගම දුරකථනයක් (Smartphone) පමණක් ප්‍රමාණවත් වේ.',
      v_product_id,
      true,
      false,
      '{}'::text[]
    ),
    (
      v_user_id,
      'Alibaba Selling පටන් ගන්න ලොකු මුදලක් (Investment) අවශ්‍යද? (Minimum Investment)',
      'නැත. ඔබට රුපියල් 10,000 - 15,000 වැනි ඉතා සුළු මුදලකින් පවා කුඩා ප්‍රමාණවලින් (Small MOQ) භාණ්ඩ ගෙන්වා අලෙවිය ආරම්භ කළ හැක. ලොකු ප්‍රාග්ධනයක් නොමැතිව කුඩාවට පටන් ගෙන ක්‍රමයෙන් ව්‍යාපාරය දියුණු කරන ආකාරය පාඨමාලාවේදී පැහැදිලි කර දේ.',
      v_product_id,
      true,
      false,
      '{}'::text[]
    ),
    (
      v_user_id,
      'පාඨමාලාවෙන් පසු Support එකක් ලැබෙනවාද? (Lifetime Access & Support)',
      'ඔව්! පාඨමාලාවේ සියලුම වීඩියෝ පාඩම් සඳහා ඔබට ජීවිත කාලය පුරාම (Lifetime Access) හිමිවන අතර, ඔබට ඇතිවන ඕනෑම ගැටලුවක් නිරාකරණය කරගැනීම සඳහා අපගේ Exclusive Student Community Support එක සහ මඟපෙන්වීම හිමිවේ.',
      v_product_id,
      true,
      false,
      '{}'::text[]
    ),
    (
      v_user_id,
      'සිසුන්ගේ Earning Proofs සහ Feedbacks බලාගත හැක්කේ කොහෙන්ද? (Student Proofs & Reviews)',
      'අපගේ Alibaba Selling පාඨමාලාව හැදෑරූ සිසුන් ලබා ඇති සාර්ථක ප්‍රතිඵල, Earning Proofs සහ Student Feedbacks සියල්ලම පහත නිල වෙබ් අඩවියෙන් සජීවීව බලාගත හැක: 👇

🌐 feedbacks.eexpertzacademy.com',
      v_product_id,
      true,
      true,
      ARRAY['https://storage.buildstart.io/biz-7fd28dd0-11a4-43e7-988b-edbfdc994b25/sets/9d71b992-cf2b-4dc0-9691-16216ce5138a.png']
    );

  END IF;
END $$;

