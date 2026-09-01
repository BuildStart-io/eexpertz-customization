import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { db: { schema: "eexpertz_customization" } });

  let triggerSource = "cron";
  let triggerCorrelationId = "";
  try {
    const body = await req.json();
    triggerSource = body?.trigger || "cron";
    triggerCorrelationId = body?.correlationId || "";
  } catch { /* empty body from cron is fine */ }

  console.log(`[process-message] Triggered by: ${triggerSource}${triggerCorrelationId ? ` (corr: ${triggerCorrelationId})` : ""}`);

  // Step 1: Recover stale messages stuck in 'processing' for >2 minutes (crashed workers)
  const { data: staleRecovered } = await supabase
    .from("message_queue")
    .update({ status: "pending", updated_at: new Date().toISOString() })
    .eq("status", "processing")
    .lt("updated_at", new Date(Date.now() - 2 * 60 * 1000).toISOString())
    .select("id");

  if (staleRecovered && staleRecovered.length > 0) {
    console.log(`[process-message] Recovered ${staleRecovered.length} stale messages`);
  }

  // Step 2: Process messages in a loop
  let processedCount = 0;
  const maxIterations = 10; // Safety cap per invocation

  for (let i = 0; i < maxIterations; i++) {
    // Claim one pending message, enforcing per-user ordering:
    // Only pick from users who don't have another message currently processing.
    // We use a two-step approach since Supabase JS doesn't support FOR UPDATE SKIP LOCKED.
    
    // Find users currently processing
    const { data: busyUsers } = await supabase
      .from("message_queue")
      .select("user_id")
      .eq("status", "processing");

    const busyUserIds = (busyUsers || []).map((u: any) => u.user_id);

    // Find next pending message from a non-busy user
    let query = supabase
      .from("message_queue")
      .select("*")
      .in("status", ["pending", "failed"])
      .lt("attempts", 3)
      .order("created_at", { ascending: true })
      .limit(1);

    if (busyUserIds.length > 0) {
      // Exclude users with messages currently processing
      for (const uid of busyUserIds) {
        query = query.neq("user_id", uid);
      }
    }

    const { data: candidates, error: fetchError } = await query;

    if (fetchError) {
      console.error("[process-message] Queue fetch error:", fetchError);
      break;
    }

    if (!candidates || candidates.length === 0) {
      break; // No more work
    }

    const msg = candidates[0];
    const corrId = msg.correlation_id || triggerCorrelationId || msg.id.substring(0, 8);
    const timings: Record<string, number> = {};
    const mark = (label: string) => { timings[label] = Date.now(); };

    // Claim this message atomically
    mark("claim_start");
    const { data: claimed, error: claimError } = await supabase
      .from("message_queue")
      .update({ status: "processing", attempts: msg.attempts + 1, updated_at: new Date().toISOString() })
      .eq("id", msg.id)
      .in("status", ["pending", "failed"])
      .select()
      .single();
    mark("claim_end");

    if (claimError || !claimed) {
      console.log(`[${corrId}] Message ${msg.id} already claimed, skipping`);
      continue;
    }

    try {
      await processMessage(supabase, supabaseUrl, supabaseServiceKey, msg, corrId, timings, mark);

      // Mark as done
      mark("done_start");
      await supabase
        .from("message_queue")
        .update({ status: "done", processed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", msg.id);
      mark("done_end");

      processedCount++;

      // Log timing breakdown
      const queueWaitMs = timings.claim_start - new Date(msg.created_at).getTime();
      console.log(`[${corrId}] ✅ Message ${msg.id} processed | queue_wait=${queueWaitMs}ms claim=${timings.claim_end - timings.claim_start}ms ai=${(timings.ai_end || 0) - (timings.ai_start || 0)}ms send=${(timings.send_end || 0) - (timings.send_start || 0)}ms total=${Date.now() - new Date(msg.created_at).getTime()}ms`);
    } catch (error) {
      const newStatus = msg.attempts + 1 >= msg.max_attempts ? "dead" : "failed";
      console.error(`[${corrId}] ❌ Message ${msg.id} failed (attempt ${msg.attempts + 1}/${msg.max_attempts} → ${newStatus}):`, error.message);
      await supabase
        .from("message_queue")
        .update({
          status: newStatus,
          error_message: error.message || String(error),
          updated_at: new Date().toISOString(),
        })
        .eq("id", msg.id);
    }
  }

  console.log(`[process-message] Done. Processed ${processedCount} messages.`);

  return new Response(JSON.stringify({ processed: processedCount }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

const DEFAULT_SETS_CONFIG = {
  enabled: true,
  set1: {
    enabled: true,
    audio_url: "",
    text1: "පාඨමාලා ගාස්තු ඇතුලු විස්තර දැනගන්න අවශ්යනම් Course Fee කියලා Message එකක්  එවන්න . ☺️🧡",
    text2: "⭕ අපේ Alibaba Selling පාඨමාලව හැදැරූ සිසුන්ගේ Earning Proof සහ Student Feedbacks ගැන දැනගැනීමට පහත ලින්ක් එක ක්ලික් කරන්න.  👇\n\nfeedbacks.eexpertzacademy.com",
    img1_url: "https://storage.buildstart.io/biz-7fd28dd0-11a4-43e7-988b-edbfdc994b25/sets/9d71b992-cf2b-4dc0-9691-16216ce5138a.png",
    img1_caption: "මාසෙන් රුපියල් ලක්ශ 43 ක් ! 🫵🧡\n\n🟠මේ තියෙන්නෙ අපි මාර්තු වල පටන් ගත්ත Alibaba Selling Business එකක ගිය මාසෙ (June) සේල් එක.  ඔයාට පේනවා ඇති අපි ගිය මාසෙ විතරක් රුපියල් ලක්ශ 43 කට ආසන්න සේල් එකක් කරලා තියෙනවා. ඒ වගේම Orders 2100 කට ආසන්න ප්රමාණයක් ඇවිල්ලා තියෙනවා. \n\n🟠මෙතන මේ ලක්ශ 43 ක සේල් එකෙන් අපිට රුපියල් ලක්ශ 20 කට වැඩි ලාභයක් තියෙනවා. දවස් 30 න්  රුපියල් ලක්ශ 20 ක් කියන්නෙ හිතාගන්නවත් බෑ නේද ?\n\n🟠 මෙච්චර අඩු කාලෙකින් මේ වගේ ආදයමක් ගන්න පුලුවන් එකම බිස්නස් එක තමයි Alibaba Selling කියලා කියන්නේ.\n\nමේවා තමා ඇත්තම ඔන්ලයින් බිස්නස් 💪🧡",
    img2_url: "https://storage.buildstart.io/biz-7fd28dd0-11a4-43e7-988b-edbfdc994b25/sets/a193b2b1-cdd9-4743-bf58-bef03c4cca5d.jpg"
  },
  set2: {
    enabled: true,
    img3_url: "https://storage.buildstart.io/biz-7fd28dd0-11a4-43e7-988b-edbfdc994b25/sets/a5251727-f2ea-4de1-8472-e3641ec05e3a.jpg",
    img3_caption: "✅සම්පූර්ණ කෝස් Fee එක රු.10 900 යි.නමුත් අද දින මෙම පාඨමාලාව මිලදී ගන්නා පලමු සිසුන් 25 දෙනාට මෙය රු.4900 කට මිලදී ගන්න පුලුවන්.\n\n✅පාඨමාලාව මිලදි ගන්න කැමතිද කියල අපිට හැකි ඉක්මනින් Message එකක් දාන්න.\n\nUpdate‼️\nදැනට අද දින 21 දෙනෙක් මෙය මිලදී අරගෙන ඇති නිසා මෙය ඉහත මිලට ලබා ගත හැක්කේ තවත් සිසුන් 4 දෙනෙකුට පමණි.",
    audio1_url: "",
    audio2_url: "",
    img4_url: "https://storage.buildstart.io/biz-7fd28dd0-11a4-43e7-988b-edbfdc994b25/sets/ceef0369-ab3f-4efd-b14e-4211cf30ceb0.jpg",
    img4_caption: "Update‼️\nදැනට අද දින 22 දෙනෙක් මෙය මිලදී අරගෙන ඇති නිසා මෙය ඉහත මිලට ලබා ගත හැක්කේ තවත් සිසුන් 3 දෙනෙකුට පමණි.",
    text_time_restricted: "මේක ඇත්තටම ඊයෙ අපි දීපු offer එකක් . ඒත් ඊයේ කෝස් එක ගත්තෙ 25 න් 21 ක් විතරයි . ඒක නිසා තව 4 දෙනෙක්ට අද අවස්තාව තියෙනව ඊයෙ offer price එකටම පාඨමාලව මිලදී ගන්න.",
    cutoff_hour_sl: 14,
    img5_url: "https://storage.buildstart.io/biz-7fd28dd0-11a4-43e7-988b-edbfdc994b25/sets/36878d8f-836b-48fa-b46a-7b8c4d5f8065.jpg",
    img5_caption: "මේක ඊයේ End උන  Offer එකක්. ඒත්  අද  උදෑසන 10 ට පෙර පාඨමාලව මිලදී ගන්න අයටත් අපි මේ Offer එක ලබා දෙනව. ඒ කියන්නෙ අද රු.4900 ක් දීලා අපේ Alibaba Selling Master Course එක මිලදී ගන්නකොට තවත් පාඨමාලා දෙකක් ම නොමිලේ ලැබෙනවා. ☺️🧡🧡"
  },
  set3: {
    enabled: true,
    bank_details_text: "අද දින *Alibaba Selling Master Course*  එක මිලදි ගන්න අය පහත Bank Details  වලට *රු.4900 ක මුදලක් බැර* කර රිසිට්පතේ Photo එක්ක් සමග ඔබේ නම සහ Email එක 0779638667 යන අංකයට WhatsApp කරන්න.   👇\n\nBank - NDB Bank\nHolder Name - eExpertz\nAccount Number - *111000271906*\nBranch - Maharagama\n\nBank - Sampath Bank\nHolder Name- eExpertz\nAccount Number - *109214030103*\nBank Branch- Maharagama\n\nBank - BOC Bank\nHolder Name- eExpertz\nAccount Number - *95577622*\nBank Branch- Maharagama\n\n⭕ *Payment එක කරලා රිසිට් එක එව්වට පස්සෙ විනාඩි 10 ඇතුලත සම්පූර්ණ පාඨමාලාවම ලැබෙනවා.*",
    urgency_text: "Update‼️\nදැනට අද දින 23 දෙනෙක් මෙය මිලදී අරගෙන ඇති නිසා මෙය ඉහත මිලට ලබා ගත හැක්කේ තවත් සිසුන් 2 දෙනෙකුට පමණි.",
    confirmation_text: "Payment එක දාන්න පැය කිහිපයක් යනවනම් සල්ලි දාන්න කලින් Message  එකක් දාල තාම 25 දෙනා Fill වෙලා නැද්ද කියලා Confirm  කරගෙන Payment  එක දාන්න."
  },
  receipt_workflow: {
    request_details_text: "ඔබගේ ගෙවීම් රිසිට්පත ලැබුණා. කරුණාකර ඔබගේ නම (Full Name), Email ලිපිනය සහ දුරකථන අංකය (Phone Number) මෙහි එවන්න. 📝",
    onboarding_confirm_text: "ඔබගේ විස්තර ලැබුණා. ඔබගේ Payment එක තහවුරු කර පැය 1ක් (1 hour) ඇතුලත ඔබව පාඨමාලාවට සම්බන්ධ කරනු ලැබේ. ස්තූතියි! ☺️🧡"
  },
  pay_later_response: "හොඳයි, ඔබට පහසු වේලාවක අප හා සම්බන්ධ වන්න. ස්තූතියි! ☺️"
};

function isBeforeHourSriLanka(targetHour: number = 14): boolean {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const slTime = new Date(utc + (3600000 * 5.5));
  return slTime.getHours() < targetHour;
}

function isPayLaterIntent(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  const patterns = [
    /පස්සෙ.*(ගෙව|දා|ගන්|කිය|කර)/i,
    /පස්සේ.*(ගෙව|දා|ගන්|කිය|කර)/i,
    /ලබන.*(මාස|සතිය)/i,
    /දවස්.*(දෙක|තුන|කීප)/i,
    /(salary|සැලරි|පඩි|සල්ලි).*(හම්බ|ලැබු)/i,
    /pay\s*later/i,
    /will\s*pay\s*later/i,
    /passe\s*(dannam|gewannam|gannam|kiyannam|karannam)/i,
    /after\s*(salary|next\s*week|next\s*month|2\s*days|few\s*days)/i,
    /not\s*now/i,
    /දැනට\s*බැහැ/i,
    /සල්ලි\s*නැහැ/i,
  ];
  return patterns.some(p => p.test(lower) || p.test(text));
}

function isCourseFeeOrPaymentIntent(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase().trim();
  const patterns = [
    // Course Fee & Price variations (English)
    /course\s*fee/i,
    /\bfee\b/i,
    /\bfees\b/i,
    /\bcost\b/i,
    /\bprice\b/i,
    /how\s*much/i,
    /\bcharge\b/i,
    /\brate\b/i,
    /\bamount\b/i,
    /discount/i,
    /offer/i,
    /4900/i,
    /10900/i,
    /10\s*900/i,
    /4\s*900/i,

    // Sinhala Unicode for Fee / Price
    /ගාස්තු/i,
    /මිල/i,
    /කීයද/i,
    /කීයක්/i,
    /කීයක්ද/i,
    /මුදල/i,
    /අය\s*කරන/i,
    /කොස්\s*ෆී/i,
    /ෆී/i,
    /ඩිස්කවුන්ට්/i,
    /ඕෆර්/i,

    // Singlish for Fee / Price
    /keeyada/i,
    /kiyada/i,
    /gana\s*keeyada/i,
    /mula\s*keeyada/i,
    /mila\s*keeyada/i,
    /gaana\s*keeyada/i,
    /fee\s*eka/i,
    /course\s*fee\s*eka/i,
    /cost\s*eka/i,
    /price\s*eka/i,
    
    // Payment & Bank Account variations (English)
    /\bpay\b/i,
    /\bpayment\b/i,
    /payment\s*method/i,
    /payment\s*methods/i,
    /\bbank\b/i,
    /\baccount\b/i,
    /acc\s*no/i,
    /account\s*no/i,
    /account\s*number/i,
    /bank\s*details/i,
    /deposit/i,
    /transfer/i,
    /\bslip\b/i,
    /\breceipt\b/i,
    /\bndb\b/i,
    /\bsampath\b/i,
    /\bboc\b/i,
    /\bcommercial\b/i,
    /\bhnb\b/i,
    /\bpeoples\b/i,
    /\bbuy\b/i,
    /\benroll\b/i,
    /\bregister\b/i,
    /\bjoin\b/i,
    /how\s*to\s*pay/i,
    /how\s*to\s*buy/i,
    /how\s*to\s*join/i,

    // Sinhala Unicode for Payment
    /ගෙවන්න/i,
    /ගෙවන්නම්/i,
    /ගෙවන්නේ\s*කොහොමද/i,
    /ගෙවීම්/i,
    /බැංකු/i,
    /ගිණුම්/i,
    /අංක/i,
    /බැංකුව/i,
    /මිලදී\s*ගන්න/i,
    /ගන්න\s*කැමති/i,
    /සම්බන්ධ\s*වෙන්න/i,
    /ලියාපදිංචි/i,

    // Singlish for Payment
    /gewanna/i,
    /gewanne\s*kohomada/i,
    /gewannam/i,
    /gewanna\s*ona/i,
    /ganna\s*ona/i,
    /ganna\s*kamathi/i,
    /join\s*wenna/i,
    /register\s*wenna/i,
    /salli\s*danna/i,
    /salli\s*gewanna/i,
    /bank\s*ekata/i,
    /account\s*ekata/i,
    /details\s*danna/i,
    /details\s*ewanna/i,
    /wisthara\s*ewanna/i,
    /wisthara\s*danna/i
  ];
  return patterns.some(p => p.test(lower) || p.test(text));
}

function containsCustomerDetails(text: string): boolean {
  if (!text) return false;
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
  const hasPhone = /(?:0|\+?94)[0-9]{8,10}/.test(text.replace(/[\s-]/g, ""));
  const hasNameKeyword = /(name|නම|email|phone|දුරකථන|ලිපිනය)/i.test(text);
  return (hasEmail && (hasPhone || hasNameKeyword)) || (hasPhone && hasNameKeyword) || (hasEmail && text.length > 15);
}

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function processMessage(
  supabase: any,
  supabaseUrl: string,
  supabaseServiceKey: string,
  msg: any,
  corrId: string,
  timings: Record<string, number>,
  mark: (label: string) => void
) {
  const { user_id: userId, phone_number: phoneNumber, sender_name: senderName, message_text: messageText, message_type: messageType, session_api_key: sessionApiKey, raw_payload: body } = msg;

  const mediaTypes = ["image", "video", "audio", "document", "sticker", "ptt", "vcard", "location"];
  const isMediaMessage = mediaTypes.includes(messageType) ||
    (!messageText && messageType !== "text") ||
    (body?.data?.messages?.messageBody === undefined && body?.data?.messages?.message?.conversation === undefined && !messageText);

  // 1. Store the incoming message in conversations
  mark("store_inbound_start");
  const { error: insertError } = await supabase.from("conversations").insert({
    phone_number: phoneNumber,
    message: messageText || `[${messageType || "media"}]`,
    direction: "inbound",
    message_type: messageType,
    metadata: { senderName, event: body?.event, raw: body, correlationId: corrId },
    user_id: userId,
  });
  mark("store_inbound_end");

  if (insertError) {
    console.error(`[${corrId}] Error storing message:`, insertError);
  }

  // 1b. Contact billing: register this contact for the current cycle.
  const contactCheck = await registerContact(supabase, userId, phoneNumber, corrId);
  if (contactCheck.blocked) {
    console.log(`[${corrId}] New-contact limit reached for user ${userId}, not serving ${phoneNumber}`);
    return;
  }
  // 1c. Growth plan: notify the owner when this contact becomes a qualified lead.
  await maybeNotifyQualifiedLead(
    supabase, supabaseUrl, supabaseServiceKey, userId, phoneNumber, senderName, sessionApiKey, corrId
  );

  // 2. Check if auto-responses are enabled
  mark("settings_start");
  const { data: settingsData } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "auto_responses")
    .eq("user_id", userId)
    .maybeSingle();
  mark("settings_end");

  const autoResponsesEnabled = settingsData?.value?.enabled ?? true;
  if (!autoResponsesEnabled) {
    console.log(`[${corrId}] Auto responses disabled, skipping processing`);
    return;
  }

  // 3. Check if chat is taken over
  const { data: takeoverData } = await supabase
    .from("chat_takeovers")
    .select("is_taken_over")
    .eq("user_id", userId)
    .eq("phone_number", phoneNumber)
    .eq("is_taken_over", true)
    .maybeSingle();

  if (takeoverData) {
    console.log(`[${corrId}] Chat with ${phoneNumber} is taken over, skipping automation`);
    return;
  }

  // 4. Fetch Message Sets configuration
  const { data: setsSetting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "message_sets_config")
    .eq("user_id", userId)
    .maybeSingle();

  const cfg = { ...DEFAULT_SETS_CONFIG, ...(setsSetting?.value || {}) };

  // 5. Fetch or initialize customer stage tracking
  const { data: existingStage } = await supabase
    .from("customer_stages")
    .select("*")
    .eq("user_id", userId)
    .eq("phone_number", phoneNumber)
    .maybeSingle();

  let currentStage = existingStage?.current_stage || "new";
  let receivedSets: string[] = Array.isArray(existingStage?.received_sets) ? existingStage.received_sets : [];

  // Helper to update customer stage
  const updateStage = async (stage: string, sets: string[], extraData: Record<string, any> = {}) => {
    currentStage = stage;
    receivedSets = sets;
    await supabase.from("customer_stages").upsert({
      user_id: userId,
      phone_number: phoneNumber,
      current_stage: stage,
      received_sets: sets,
      updated_at: new Date().toISOString(),
      ...extraData,
    }, { onConflict: "user_id,phone_number" });
  };

  // Helper to send text message
  const sendTextMsg = async (text: string, metadata: Record<string, any> = {}) => {
    if (!text?.trim()) return;
    mark("send_start");
    await sendWhatsApp(supabaseUrl, supabaseServiceKey, phoneNumber, text.trim(), null, sessionApiKey);
    mark("send_end");
    await supabase.from("conversations").insert({
      phone_number: phoneNumber,
      message: text.trim(),
      direction: "outbound",
      message_type: "text",
      metadata: { ...metadata, correlationId: corrId },
      user_id: userId,
    });
  };

  // Helper to send media message
  const sendMediaMsg = async (mediaUrl: string, caption?: string, mediaType?: string, metadata: Record<string, any> = {}) => {
    if (!mediaUrl?.trim()) return;
    mark("send_start");
    const res = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-eexpertz`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: phoneNumber,
        mediaUrl: mediaUrl.trim(),
        message: caption?.trim() || undefined,
        mediaType: mediaType || undefined,
        sessionApiKey,
      }),
    });
    mark("send_end");

    if (res.ok) {
      await supabase.from("conversations").insert({
        phone_number: phoneNumber,
        message: caption?.trim() || `[Media: ${mediaUrl}]`,
        direction: "outbound",
        message_type: mediaType || "image",
        metadata: { mediaUrl, ...metadata, correlationId: corrId },
        user_id: userId,
      });
    } else {
      console.error(`[${corrId}] Failed to send media:`, await res.text());
    }
  };

  // -------------------------------------------------------------
  // CUSTOMIZATION 3: PAYMENT RECEIPT HANDLING (IMAGE / PDF)
  // -------------------------------------------------------------
  if (messageType === "image" || messageType === "document" || isMediaMessage) {
    console.log(`[${corrId}] Inbound receipt/media from ${phoneNumber}. Triggering detail collection.`);
    const requestText = cfg.receipt_workflow?.request_details_text || DEFAULT_SETS_CONFIG.receipt_workflow.request_details_text;
    await sendTextMsg(requestText, { type: "receipt_request_details" });
    await updateStage("pending_verification", receivedSets, {
      receipt_url: body?.mediaUrl || body?.payload?.mediaUrl || null,
      metadata: { receipt_received_at: new Date().toISOString() },
    });
    return;
  }

  // -------------------------------------------------------------
  // DETAILS INTAKE AFTER RECEIPT
  // -------------------------------------------------------------
  if (currentStage === "pending_verification" || currentStage === "receipt_pending" || containsCustomerDetails(messageText)) {
    if (currentStage === "pending_verification" || currentStage === "receipt_pending") {
      console.log(`[${corrId}] Customer sent details after receipt: ${messageText}`);
      const confirmText = cfg.receipt_workflow?.onboarding_confirm_text || DEFAULT_SETS_CONFIG.receipt_workflow.onboarding_confirm_text;
      await sendTextMsg(confirmText, { type: "receipt_confirm_onboarding" });

      // Extract basic email / phone / name
      const emailMatch = messageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      const phoneMatch = messageText.match(/(?:0|\+?94)[0-9]{8,10}/);

      // Attempt to extract name from message if provided (e.g. Name: Dulnith)
      let extractedName = senderName || null;
      const nameMatch = messageText.match(/(?:name|නම|nama)\s*[:=-]?\s*([a-zA-Z\s]{3,30})/i);
      if (nameMatch && nameMatch[1]?.trim()) {
        extractedName = nameMatch[1].trim();
      }

      await updateStage("pending_verification", receivedSets, {
        customer_email: emailMatch ? emailMatch[0] : null,
        customer_phone: phoneMatch ? phoneMatch[0] : phoneNumber,
        customer_name: extractedName,
        metadata: { details_submitted_at: new Date().toISOString(), raw_details: messageText },
      });

      // Also record order in database for eexperts tracking
      await supabase.from("orders").insert({
        customer_name: extractedName || "Alibaba Student",
        customer_phone: phoneMatch ? phoneMatch[0] : phoneNumber,
        whatsapp_phone: phoneNumber,
        order_items: [{ name: "Alibaba Selling Master Course", price: 4900, quantity: 1, product_type: "digital" }],
        payment_method: "bank_transfer",
        total_amount: 4900,
        special_instructions: `Email: ${emailMatch ? emailMatch[0] : "Pending"}\nDetails: ${messageText}`,
        status: "pending",
        user_id: userId,
      });

      return;
    }
  }

  // -------------------------------------------------------------
  // CUSTOMIZATION 2: "PAY AT A LATER TIME" INTENT
  // -------------------------------------------------------------
  if (isPayLaterIntent(messageText)) {
    console.log(`[${corrId}] Pay later intent detected from ${phoneNumber}. Ending automated sequence.`);
    const payLaterReply = cfg.pay_later_response || DEFAULT_SETS_CONFIG.pay_later_response;
    await sendTextMsg(payLaterReply, { type: "pay_later_closure" });
    await updateStage("pay_later", receivedSets, {
      metadata: { pay_later_requested_at: new Date().toISOString() },
    });
    // Add takeover to prevent future auto sends
    await supabase.from("chat_takeovers").upsert({
      user_id: userId,
      phone_number: phoneNumber,
      is_taken_over: true,
    }, { onConflict: "user_id,phone_number" });
    return;
  }

  // -------------------------------------------------------------
  // AUTOMATED MESSAGE SETS (SET 1, SET 2, SET 3)
  // -------------------------------------------------------------
  const isFirstMessage = receivedSets.length === 0;

  // Helper to dispatch dynamic items in sequence
  const dispatchItemSequence = async (items: any[], setName: string) => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.time_restricted) {
        const cutoff = item.cutoff_hour_sl ?? 14;
        if (!isBeforeHourSriLanka(cutoff)) {
          console.log(`[${corrId}] Time restricted item ${item.name || item.id} skipped (SL time >= ${cutoff}:00)`);
          continue;
        }
      }

      if (item.type === "text" && item.text?.trim()) {
        await sendTextMsg(item.text.trim(), { set: setName, step: i + 1, item_name: item.name });
      } else if (item.type === "image" && item.media_url?.trim()) {
        await sendMediaMsg(item.media_url.trim(), item.caption?.trim() || undefined, "image", { set: setName, step: i + 1, item_name: item.name });
      } else if (item.type === "audio" && item.media_url?.trim()) {
        await sendMediaMsg(item.media_url.trim(), undefined, "audio", { set: setName, step: i + 1, item_name: item.name });
      } else if (item.type === "video" && item.media_url?.trim()) {
        await sendMediaMsg(item.media_url.trim(), item.caption?.trim() || undefined, "video", { set: setName, step: i + 1, item_name: item.name });
      } else if (item.type === "document" && item.media_url?.trim()) {
        await sendMediaMsg(item.media_url.trim(), item.caption?.trim() || undefined, "document", { set: setName, step: i + 1, item_name: item.name });
      }

      if (i < items.length - 1) {
        await delay(1200);
      }
    }
  };

  // SET 1: Sent automatically on first contact / initial inquiry
  if (!receivedSets.includes("set1") && !cfg.set1?.removed && (cfg.set1?.enabled ?? true)) {
    console.log(`[${corrId}] Dispatching Set 1 messages to ${phoneNumber}`);
    const s1 = cfg.set1 || DEFAULT_SETS_CONFIG.set1;

    if (s1.items && Array.isArray(s1.items) && s1.items.length > 0) {
      await dispatchItemSequence(s1.items, "set1");
    } else {
      // Legacy fallback
      if (s1.audio_url) {
        await sendMediaMsg(s1.audio_url, undefined, "audio", { set: "set1", step: 1 });
        await delay(1200);
      }
      if (s1.text1) {
        await sendTextMsg(s1.text1, { set: "set1", step: 2 });
        await delay(1200);
      }
      if (s1.text2) {
        await sendTextMsg(s1.text2, { set: "set1", step: 3 });
        await delay(1200);
      }
      if (s1.img1_url) {
        await sendMediaMsg(s1.img1_url, s1.img1_caption, "image", { set: "set1", step: 4 });
        await delay(1200);
      }
      if (s1.img2_url) {
        await sendMediaMsg(s1.img2_url, undefined, "image", { set: "set1", step: 5 });
      }
    }

    await updateStage("set1", ["set1"]);
    return;
  }

  // SET 2: Triggered on ANY message from the user after Set 1 has been sent
  if (receivedSets.includes("set1") && !receivedSets.includes("set2") && !cfg.set2?.removed && (cfg.set2?.enabled ?? true)) {
    console.log(`[${corrId}] Dispatching Set 2 (Discounts) messages to ${phoneNumber}`);
    const s2 = cfg.set2 || DEFAULT_SETS_CONFIG.set2;

    if (s2.items && Array.isArray(s2.items) && s2.items.length > 0) {
      await dispatchItemSequence(s2.items, "set2");
    } else {
      // Legacy fallback
      if (s2.img3_url) {
        await sendMediaMsg(s2.img3_url, s2.img3_caption, "image", { set: "set2", step: 1 });
        await delay(1200);
      }
      if (s2.audio1_url) {
        await sendMediaMsg(s2.audio1_url, undefined, "audio", { set: "set2", step: 2 });
        await delay(1200);
      }
      if (s2.audio2_url) {
        await sendMediaMsg(s2.audio2_url, undefined, "audio", { set: "set2", step: 3 });
        await delay(1200);
      }
      if (s2.img4_url) {
        await sendMediaMsg(s2.img4_url, s2.img4_caption, "image", { set: "set2", step: 4 });
        await delay(1200);
      }
      const cutoffHour = s2.cutoff_hour_sl ?? 14;
      if (s2.text_time_restricted && isBeforeHourSriLanka(cutoffHour)) {
        await sendTextMsg(s2.text_time_restricted, { set: "set2", step: 5, time_restricted: true });
        await delay(1200);
      }
      if (s2.img5_url) {
        await sendMediaMsg(s2.img5_url, s2.img5_caption, "image", { set: "set2", step: 6 });
      }
    }

    await updateStage("set2", ["set1", "set2"]);
    return;
  }

  // SET 3: Triggered on the 3rd message from the user after Set 2 has been sent
  if (receivedSets.includes("set2") && !receivedSets.includes("set3") && !cfg.set3?.removed && (cfg.set3?.enabled ?? true)) {
    console.log(`[${corrId}] Dispatching Set 3 (Payment Details) messages to ${phoneNumber}`);
    const s3 = cfg.set3 || DEFAULT_SETS_CONFIG.set3;

    if (s3.items && Array.isArray(s3.items) && s3.items.length > 0) {
      await dispatchItemSequence(s3.items, "set3");
    } else {
      // Legacy fallback
      if (s3.bank_details_text) {
        await sendTextMsg(s3.bank_details_text, { set: "set3", step: 1 });
        await delay(1200);
      }
      if (s3.urgency_text) {
        await sendTextMsg(s3.urgency_text, { set: "set3", step: 2 });
        await delay(1200);
      }
      if (s3.confirmation_text) {
        await sendTextMsg(s3.confirmation_text, { set: "set3", step: 3 });
      }
    }

    const nextSets = Array.from(new Set([...receivedSets, "set3"]));
    await updateStage("set3", nextSets);
    return;
  }

  // -------------------------------------------------------------
  // DYNAMIC CUSTOM MESSAGE SETS (Triggered by custom keywords)
  // -------------------------------------------------------------
  if (cfg.custom_sets && Array.isArray(cfg.custom_sets)) {
    for (const cSet of cfg.custom_sets) {
      if (!cSet.enabled) continue;
      const keywords = cSet.trigger_keywords || [];
      const matches = keywords.some((kw: string) => kw && messageText.toLowerCase().includes(kw.toLowerCase()));
      if (matches) {
        console.log(`[${corrId}] Dispatching Custom Set: ${cSet.name} (${cSet.id}) to ${phoneNumber}`);
        for (const item of (cSet.items || [])) {
          if (item.type === "text" && item.content) {
            await sendTextMsg(item.content, { custom_set: cSet.id, custom_set_name: cSet.name });
            await delay(1200);
          } else if ((item.type === "image" || item.type === "audio") && item.mediaUrl) {
            await sendMediaMsg(item.mediaUrl, item.content, item.type, { custom_set: cSet.id, custom_set_name: cSet.name });
            await delay(1200);
          }
        }
        const nextSets = Array.from(new Set([...receivedSets, cSet.id]));
        await updateStage(cSet.id, nextSets);
        return;
      }
    }
  }

  // -------------------------------------------------------------
  // BACKUP / FALLBACK: AI CHAT (AFTER ALL SETS ARE DISPATCHED)
  // -------------------------------------------------------------
  console.log(`[${corrId}] All sets completed or general query. Calling fallback AI chat.`);

  // Get conversation history
  mark("history_start");
  const { data: conversationHistory } = await supabase
    .from("conversations")
    .select("message, direction, created_at")
    .eq("phone_number", phoneNumber)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  mark("history_end");

  mark("ai_start");
  const controller = new AbortController();
  const aiTimeout = setTimeout(() => controller.abort(), 55_000);

  let aiResponse: Response;
  try {
    aiResponse = await fetch(`${supabaseUrl}/functions/v1/ai-chat-eexpertz`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: messageText,
        phoneNumber,
        senderName,
        conversationHistory: conversationHistory?.reverse() || [],
        userId,
        sessionApiKey,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(aiTimeout);
    mark("ai_end");
    if (err.name === "AbortError") {
      throw new Error("AI call timed out after 55s");
    }
    throw err;
  }
  clearTimeout(aiTimeout);
  mark("ai_end");

  const aiData = await aiResponse.json();

  if (!aiResponse.ok) {
    if ((aiResponse.status === 429 || aiResponse.status === 403) && aiData.response) {
      await sendTextMsg(aiData.response, { type: "ai_fallback_limit" });
      return;
    }
    console.error(`[${corrId}] AI chat error:`, JSON.stringify(aiData));
    throw new Error("AI processing failed");
  }

  const replyMessage = aiData.response;
  const replyImageUrl = aiData.imageUrl || null;
  const replyVideoUrl = aiData.videoUrl || null;
  const followupMessage = aiData.followupMessage || null;
  const faqMedia: string[] = Array.isArray(aiData.faqMedia) ? aiData.faqMedia : [];

  if (replyVideoUrl) {
    await sendWhatsAppMedia(supabaseUrl, supabaseServiceKey, phoneNumber, replyVideoUrl, sessionApiKey);
  }
  if (replyImageUrl) {
    await sendWhatsAppMedia(supabaseUrl, supabaseServiceKey, phoneNumber, replyImageUrl, sessionApiKey);
  }
  for (const url of faqMedia) {
    await sendWhatsAppMedia(supabaseUrl, supabaseServiceKey, phoneNumber, url, sessionApiKey);
  }
  if (replyMessage) {
    await sendTextMsg(replyMessage, { type: "ai_reply", ...(faqMedia.length > 0 ? { faqMedia } : {}) });
  }
  if (followupMessage) {
    await sendTextMsg(followupMessage, { type: "order_followup" });
  }
}

async function handleWelcomeMessage(
  supabase: any,
  supabaseUrl: string,
  supabaseServiceKey: string,
  userId: string,
  phoneNumber: string,
  messageText: string,
  sessionApiKey: string,
  corrId: string,
  timings: Record<string, number>,
  mark: (label: string) => void
): Promise<boolean> {
  const { data: welcomeSettings } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "welcome_message")
    .eq("user_id", userId)
    .single();

  // Check bypass triggers
  const bypassTriggers: string[] = welcomeSettings?.value?.bypass_triggers || [];
  const msgLower = messageText.toLowerCase();
  const shouldBypass = bypassTriggers.length > 0 && bypassTriggers.some((t: string) => msgLower.includes(t));

  if (shouldBypass) {
    console.log(`[${corrId}] Bypass trigger matched, skipping welcome`);
    return false;
  }

  const welcomeText: string = welcomeSettings?.value?.text || "";
  const welcomeMediaUrls: string[] = welcomeSettings?.value?.media_urls || [];
  const singleMedia = welcomeSettings?.value?.media_url;
  if (singleMedia && !welcomeMediaUrls.includes(singleMedia)) {
    welcomeMediaUrls.unshift(singleMedia);
  }

  const welcomeSequence: Array<{ type: string; url?: string }> = welcomeSettings?.value?.welcome_sequence || [];

  mark("send_start");
  if (welcomeSequence.length > 0) {
    for (const seqItem of welcomeSequence) {
      if (seqItem.type === "text" && welcomeText.trim()) {
        console.log(`[${corrId}] Sending welcome text (sequence)`);
        await sendWhatsApp(supabaseUrl, supabaseServiceKey, phoneNumber, welcomeText, null, sessionApiKey);
      } else if (seqItem.type === "media" && seqItem.url) {
        console.log(`[${corrId}] Sending welcome media (sequence): ${seqItem.url.substring(0, 80)}`);
        await sendWhatsAppMedia(supabaseUrl, supabaseServiceKey, phoneNumber, seqItem.url, sessionApiKey);
      }
    }
  } else {
    if (welcomeText.trim()) {
      await sendWhatsApp(supabaseUrl, supabaseServiceKey, phoneNumber, welcomeText, null, sessionApiKey);
    }
    for (const mediaUrl of welcomeMediaUrls) {
      await sendWhatsAppMedia(supabaseUrl, supabaseServiceKey, phoneNumber, mediaUrl, sessionApiKey);
    }
  }
  mark("send_end");

  if (welcomeText.trim()) {
    await supabase.from("conversations").insert({
      phone_number: phoneNumber,
      message: welcomeText,
      direction: "outbound",
      message_type: "text",
      metadata: { type: "welcome_message", correlationId: corrId },
      user_id: userId,
    });
    console.log(`[${corrId}] Stored welcome message in conversation history`);
  }

  console.log(`[${corrId}] Welcome message sent, skipping AI for first message`);
  return true;
}

async function sendWhatsApp(
  supabaseUrl: string,
  supabaseServiceKey: string,
  to: string,
  message: string,
  imageUrl: string | null,
  sessionApiKey: string
) {
  const body: any = { to, message, sessionApiKey };
  if (imageUrl) body.imageUrl = imageUrl;

  const res = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-eexpertz`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Send WhatsApp error:", errText);
    throw new Error(`Send WhatsApp failed: ${errText.substring(0, 200)}`);
  } else {
    console.log("Reply sent successfully");
  }
}

async function sendWhatsAppMedia(
  supabaseUrl: string,
  supabaseServiceKey: string,
  to: string,
  mediaUrl: string,
  sessionApiKey: string
) {
  const res = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-eexpertz`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to, mediaUrl, sessionApiKey }),
  });

  if (!res.ok) {
    console.error("Send media error:", await res.text());
  } else {
    console.log("Media sent:", mediaUrl.substring(0, 80));
  }
}

/** Normalize a WhatsApp identifier to a stable contact key (digits only). */
export function normalizeContactKey(raw: string): string {
  return String(raw || "").split("@")[0].replace(/\D/g, "");
}

/** Start of the current billing cycle for a profile. */
export function cycleStart(billingCycleStart: string | null | undefined): string {
  if (!billingCycleStart) {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  const now = new Date();
  const current = new Date(billingCycleStart);
  while (true) {
    const next = new Date(current);
    next.setMonth(next.getMonth() + 1);
    if (next > now) break;
    current.setTime(next.getTime());
  }
  return current.toISOString();
}

/**
 * Registers an inbound contact against the current billing cycle.
 * Returns blocked=true only when this is a NEW contact and the plan's
 * contact allowance is exhausted — already-counted contacts keep being served.
 */
async function registerContact(supabase: any, userId: string, phoneNumber: string, corrId: string) {
  try {
    const key = normalizeContactKey(phoneNumber);
    if (!key) return { blocked: false, isNew: false };

    const { data: profile } = await supabase
      .from("profiles")
      .select("billing_cycle_start, addon_contacts, plan_tier")
      .eq("user_id", userId)
      .single();

    const periodStart = cycleStart(profile?.billing_cycle_start);

    const { data: existing } = await supabase
      .from("contact_usage")
      .select("id")
      .eq("user_id", userId)
      .eq("phone_number", key)
      .eq("period_start", periodStart)
      .maybeSingle();

    if (existing) return { blocked: false, isNew: false };

    // New contact — enforce the allowance before counting them in.
    const { data: platformLimits } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "plan_limits")
      .single();

    const tier = profile?.plan_tier || "free";
    const tierLimits = platformLimits?.value?.[tier] || {};
    const limit = (tierLimits.contacts_per_month || 50) + (profile?.addon_contacts || 0);

    const { data: used } = await supabase.rpc("get_contact_usage", {
      _user_id: userId,
      _since: periodStart,
    });

    if ((used || 0) >= limit) {
      console.log(`[${corrId}] Contact limit ${used}/${limit} reached for user ${userId}`);
      return { blocked: true, isNew: true };
    }

    await supabase
      .from("contact_usage")
      .insert({ user_id: userId, phone_number: key, period_start: periodStart });

    console.log(`[${corrId}] New contact registered (${(used || 0) + 1}/${limit})`);
    return { blocked: false, isNew: true };
  } catch (e) {
    console.error(`[${corrId}] registerContact failed:`, e);
    return { blocked: false, isNew: false };
  }
}

/**
 * Growth-plan only: when a contact crosses the qualified-lead threshold
 * (6 inbound messages), send a plain (non-AI) WhatsApp alert to the owner
 * number configured in Settings → Chatbot → Order Notifications.
 * Fires exactly once, on the 6th inbound message.
 */
async function maybeNotifyQualifiedLead(
  supabase: any,
  supabaseUrl: string,
  supabaseServiceKey: string,
  userId: string,
  phoneNumber: string,
  senderName: string | null,
  sessionApiKey: string | null,
  corrId: string
) {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan_tier")
      .eq("user_id", userId)
      .maybeSingle();
    if (profile?.plan_tier !== "enterprise") return;

    const { count: inboundCount } = await supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("phone_number", phoneNumber)
      .eq("direction", "inbound");

    if ((inboundCount || 0) !== 6) return; // only the moment they qualify

    const { data: notifSettings } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "order_notifications")
      .eq("user_id", userId)
      .maybeSingle();

    const ownerPhone = notifSettings?.value?.phone;
    if (!ownerPhone) return;

    const { data: lastMsgs } = await supabase
      .from("conversations")
      .select("message, created_at")
      .eq("user_id", userId)
      .eq("phone_number", phoneNumber)
      .eq("direction", "inbound")
      .order("created_at", { ascending: false })
      .limit(3);

    const messages = (lastMsgs || [])
      .slice()
      .reverse()
      .map((m: any) => `• ${String(m.message || "").substring(0, 300)}`)
      .join("\n");

    const displayPhone = String(phoneNumber || "").split("@")[0];
    const message = `🌟 QUALIFIED LEAD\n👤 ${senderName || "Unknown"}\n📱 ${displayPhone}\n\n🗨️ Last 3 messages:\n${messages}`;

    let sendApiKey = sessionApiKey || null;
    if (!sendApiKey) {
      const { data: sessionData } = await supabase
        .from("user_wsender_sessions")
        .select("session_api_key")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      sendApiKey = sessionData?.session_api_key || null;
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-eexpertz`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: ownerPhone, message, sessionApiKey: sendApiKey }),
    });
    if (!res.ok) {
      console.error(`[${corrId}] Lead notification failed:`, (await res.text()).substring(0, 200));
    } else {
      console.log(`[${corrId}] Qualified lead notification sent to ${ownerPhone}`);
    }
  } catch (e) {
    console.error(`[${corrId}] maybeNotifyQualifiedLead failed:`, (e as Error).message);
  }
}
