import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'http://localhost:8000';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function main() {
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@buildstart.io',
    password: 'admin12345',
  });

  if (authErr || !auth?.session?.access_token) {
    console.error('Sign-in failed:', authErr);
    process.exit(1);
  }

  const token = auth.session.access_token;
  const userId = auth.user.id;
  console.log('Logged in as admin, token acquired. User:', userId);

  const files = [
    { key: 'set1_img1_revenue.png', relPath: 'frontend/public/assets/sets/set1_img1_revenue.png', type: 'image/png' },
    { key: 'set1_img2_content.jpg', relPath: 'frontend/public/assets/sets/set1_img2_content.jpg', type: 'image/jpeg' },
    { key: 'set2_img3_guarantee.jpg', relPath: 'frontend/public/assets/sets/set2_img3_guarantee.jpg', type: 'image/jpeg' },
    { key: 'set2_img4_discount.jpg', relPath: 'frontend/public/assets/sets/set2_img4_discount.jpg', type: 'image/jpeg' },
    { key: 'set2_img5_anniversary.jpg', relPath: 'frontend/public/assets/sets/set2_img5_anniversary.jpg', type: 'image/jpeg' },
  ];

  const uploadedUrls = {};

  for (const item of files) {
    const filePath = path.resolve(item.relPath);
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: item.type });

    const form = new FormData();
    form.append('file', blob, item.key);
    form.append('folder', 'sets');

    const res = await fetch(`${SUPABASE_URL}/functions/v1/media-storage?action=upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });

    const resText = await res.text();
    let data;
    try { data = JSON.parse(resText); } catch (e) { data = { error: resText }; }

    if (res.ok && data.url) {
      uploadedUrls[item.key] = data.url;
      console.log(`Uploaded ${item.key} -> ${data.url}`);
    } else {
      console.error(`Failed to upload ${item.key}:`, res.status, data);
    }
  }

  // Now update settings table with the uploaded URLs
  const { data: settingRow, error: fetchErr } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'message_sets_config')
    .eq('user_id', userId)
    .single();

  if (settingRow?.value) {
    const cfg = settingRow.value;
    if (uploadedUrls['set1_img1_revenue.png']) cfg.set1.img1_url = uploadedUrls['set1_img1_revenue.png'];
    if (uploadedUrls['set1_img2_content.jpg']) cfg.set1.img2_url = uploadedUrls['set1_img2_content.jpg'];
    if (uploadedUrls['set2_img3_guarantee.jpg']) cfg.set2.img3_url = uploadedUrls['set2_img3_guarantee.jpg'];
    if (uploadedUrls['set2_img4_discount.jpg']) cfg.set2.img4_url = uploadedUrls['set2_img4_discount.jpg'];
    if (uploadedUrls['set2_img5_anniversary.jpg']) cfg.set2.img5_url = uploadedUrls['set2_img5_anniversary.jpg'];

    const { error: updateErr } = await supabase
      .from('settings')
      .update({ value: cfg })
      .eq('key', 'message_sets_config')
      .eq('user_id', userId);

    if (updateErr) {
      console.error('Failed to update settings:', updateErr);
    } else {
      console.log('Successfully updated settings with live hosted image URLs!');
    }
  }
}

main().catch(console.error);
