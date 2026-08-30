import { useState, useMemo } from "react";
import { uploadMedia } from "@/lib/mediaStorage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Loader2, Upload, Trash2, Image as ImageIcon, Music, 
  Plus, MessageSquare, RotateCcw, Video, FileText, ArrowUp, ArrowDown,
  Layers
} from "lucide-react";

export interface SetMessageItem {
  id: string;
  name: string;
  type: "text" | "image" | "audio" | "video" | "document";
  text?: string;
  media_url?: string;
  caption?: string;
  time_restricted?: boolean;
  cutoff_hour_sl?: number;
}

export interface CustomSet {
  id: string;
  name: string;
  enabled: boolean;
  trigger_keywords: string[];
  items: SetMessageItem[];
}

export interface MessageSetsConfig {
  enabled: boolean;
  set1: {
    enabled: boolean;
    name?: string;
    removed?: boolean;
    items?: SetMessageItem[];
    audio_url?: string;
    text1?: string;
    text2?: string;
    img1_url?: string;
    img1_caption?: string;
    img2_url?: string;
  };
  set2: {
    enabled: boolean;
    name?: string;
    removed?: boolean;
    items?: SetMessageItem[];
    img3_url?: string;
    img3_caption?: string;
    audio1_url?: string;
    audio2_url?: string;
    img4_url?: string;
    img4_caption?: string;
    text_time_restricted?: string;
    cutoff_hour_sl?: number;
    img5_url?: string;
    img5_caption?: string;
  };
  set3: {
    enabled: boolean;
    name?: string;
    removed?: boolean;
    items?: SetMessageItem[];
    bank_details_text?: string;
    urgency_text?: string;
    confirmation_text?: string;
  };
  custom_sets?: CustomSet[];
  receipt_workflow: {
    enabled?: boolean;
    name?: string;
    removed?: boolean;
    request_details_text: string;
    onboarding_confirm_text: string;
  };
  pay_later_response: string;
}

interface MessageSetsManagerProps {
  config: MessageSetsConfig;
  onChange: (config: MessageSetsConfig) => void;
}

function getDefaultSet1Items(s1?: any): SetMessageItem[] {
  return [
    {
      id: "s1_audio",
      name: "1. Voice Note / Audio Introduction",
      type: "audio",
      media_url: s1?.audio_url || "",
    },
    {
      id: "s1_text1",
      name: "2. Course Fee Instruction Text",
      type: "text",
      text: s1?.text1 ?? "පාඨමාලා ගාස්තු ඇතුලු විස්තර දැනගන්න අවශ්යනම් Course Fee කියලා Message එකක්  එවන්න . ☺️🧡",
    },
    {
      id: "s1_text2",
      name: "3. Student Feedback Link Text",
      type: "text",
      text: s1?.text2 ?? "⭕ අපේ Alibaba Selling පාඨමාලව හැදැරූ සිසුන්ගේ Earning Proof සහ Student Feedbacks ගැන දැනගැනීමට පහත ලින්ක් එක ක්ලික් කරන්න.  👇\n\nfeedbacks.eexpertzacademy.com",
    },
    {
      id: "s1_img1",
      name: "4. Image 1 (Revenue Proof) & Caption",
      type: "image",
      media_url: s1?.img1_url || "https://storage.buildstart.io/biz-7fd28dd0-11a4-43e7-988b-edbfdc994b25/sets/9d71b992-cf2b-4dc0-9691-16216ce5138a.png",
      caption: s1?.img1_caption ?? "මාසෙන් රුපියල් ලක්ශ 43 ක් ! 🫵🧡\n\n🟠මේ තියෙන්නෙ අපි මාර්තු වල පටන් ගත්ත Alibaba Selling Business එකක ගිය මාසෙ (June) සේල් එක.  ඔයාට පේනවා ඇති අපි ගිය මාසෙ විතරක් රුපියල් ලක්ශ 43 කට ආසන්න සේල් එකක් කරලා තියෙනවා. ඒ වගේම Orders 2100 කට ආසන්න ප්රමාණයක් ඇවිල්ලා තියෙනවා. \n\n🟠මෙතන මේ ලක්ශ 43 ක සේල් එකෙන් අපිට රුපියල් ලක්ශ 20 කට වැඩි ලාභයක් තියෙනවා. දවස් 30 න්  රුපියල් ලක්ශ 20 ක් කියන්නෙ හිතාගන්නවත් බෑ නේද ?\n\n🟠 මෙච්චර අඩු කාලෙකින් මේ වගේ ආදයමක් ගන්න පුලුවන් එකම බිස්නස් එක තමයි Alibaba Selling කියලා කියන්නේ.\n\nමේවා තමා ඇත්තම ඔන්ලයින් බිස්නස් 💪🧡",
    },
    {
      id: "s1_img2",
      name: "5. Image 2 (Course Modules Overview)",
      type: "image",
      media_url: s1?.img2_url || "https://storage.buildstart.io/biz-7fd28dd0-11a4-43e7-988b-edbfdc994b25/sets/a193b2b1-cdd9-4743-bf58-bef03c4cca5d.jpg",
    },
  ];
}

function getDefaultSet2Items(s2?: any): SetMessageItem[] {
  return [
    {
      id: "s2_img3",
      name: "1. Image 1 (Discount Guarantee) & Caption",
      type: "image",
      media_url: s2?.img3_url || "https://storage.buildstart.io/biz-7fd28dd0-11a4-43e7-988b-edbfdc994b25/sets/a5251727-f2ea-4de1-8472-e3641ec05e3a.jpg",
      caption: s2?.img3_caption ?? "✅සම්පූර්ණ කෝස් Fee එක රු.10 900 යි.නමුත් අද දින මෙම පාඨමාලාව මිලදී ගන්නා පලමු සිසුන් 25 දෙනාට මෙය රු.4900 කට මිලදී ගන්න පුලුවන්.\n\n✅පාඨමාලාව මිලදි ගන්න කැමතිද කියල අපිට හැකි ඉක්මනින් Message එකක් දාන්න.\n\nUpdate‼️\nදැනට අද දින 21 දෙනෙක් මෙය මිලදී අරගෙන ඇති නිසා මෙය ඉහත මිලට ලබා ගත හැක්කේ තවත් සිසුන් 4 දෙනෙකුට පමණි.",
    },
    {
      id: "s2_audio1",
      name: "2. Voice Note 1 (Discount Explanation)",
      type: "audio",
      media_url: s2?.audio1_url || "",
    },
    {
      id: "s2_audio2",
      name: "3. Voice Note 2 (Urgency & Spots Remaining)",
      type: "audio",
      media_url: s2?.audio2_url || "",
    },
    {
      id: "s2_img4",
      name: "4. Image 2 (Discount Details) & Caption",
      type: "image",
      media_url: s2?.img4_url || "https://storage.buildstart.io/biz-7fd28dd0-11a4-43e7-988b-edbfdc994b25/sets/ceef0369-ab3f-4efd-b14e-4211cf30ceb0.jpg",
      caption: s2?.img4_caption ?? "Update‼️\nදැනට අද දින 22 දෙනෙක් මෙය මිලදී අරගෙන ඇති නිසා මෙය ඉහත මිලට ලබා ගත හැක්කේ තවත් සිසුන් 3 දෙනෙකුට පමණි.",
    },
    {
      id: "s2_timetext",
      name: "5. Time-Restricted Offer Text",
      type: "text",
      text: s2?.text_time_restricted ?? "මේක ඇත්තටම ඊයෙ අපි දීපු offer එකක් . ඒත් ඊයේ කෝස් එක ගත්තෙ 25 න් 21 ක් විතරයි . ඒක නිසා තව 4 දෙනෙක්ට අද අවස්තාව තියෙනව ඊයෙ offer price එකටම පාඨමාලව මිලදී ගන්න.",
      time_restricted: true,
      cutoff_hour_sl: s2?.cutoff_hour_sl ?? 14,
    },
    {
      id: "s2_img5",
      name: "6. Image 3 (Bonus Modules) & Caption",
      type: "image",
      media_url: s2?.img5_url || "https://storage.buildstart.io/biz-7fd28dd0-11a4-43e7-988b-edbfdc994b25/sets/36878d8f-836b-48fa-b46a-7b8c4d5f8065.jpg",
      caption: s2?.img5_caption ?? "මේක ඊයේ End උන  Offer එකක්. ඒත්  අද  උදෑසන 10 ට පෙර පාඨමාලව මිලදී ගන්න අයටත් අපි මේ Offer එක ලබා දෙනව. ඒ කියන්නෙ අද රු.4900 ක් දීලා අපේ Alibaba Selling Master Course එක මිලදී ගන්නකොට තවත් පාඨමාලා දෙකක් ම නොමිලේ ලැබෙනවා. ☺️🧡🧡",
    },
  ];
}

function getDefaultSet3Items(s3?: any): SetMessageItem[] {
  return [
    {
      id: "s3_bank",
      name: "1. Bank Account Details Text",
      type: "text",
      text: s3?.bank_details_text ?? "අද දින *Alibaba Selling Master Course*  එක මිලදි ගන්න අය පහත Bank Details  වලට *රු.4900 ක මුදලක් බැර* කර රිසිට්පතේ Photo එක්ක් සමග ඔබේ නම සහ Email එක 0779638667 යන අංකයට WhatsApp කරන්න.   👇\n\nBank - NDB Bank\nHolder Name - eExpertz\nAccount Number - *111000271906*\nBranch - Maharagama\n\nBank - Sampath Bank\nHolder Name- eExpertz\nAccount Number - *109214030103*\nBank Branch- Maharagama\n\nBank - BOC Bank\nHolder Name- eExpertz\nAccount Number - *95577622*\nBank Branch- Maharagama\n\n⭕ *Payment එක කරලා රිසිට් එක එව්වට පස්සෙ විනාඩි 10 ඇතුලත සම්පූර්ණ පාඨමාලාවම ලැබෙනවා.*",
    },
    {
      id: "s3_urgency",
      name: "2. Urgency Update Text",
      type: "text",
      text: s3?.urgency_text ?? "Update‼️\nදැනට අද දින 23 දෙනෙක් මෙය මිලදී අරගෙන ඇති නිසා මෙය ඉහත මිලට ලබා ගත හැක්කේ තවත් සිසුන් 2 දෙනෙකුට පමණි.",
    },
    {
      id: "s3_confirm",
      name: "3. Confirmation Notice Text",
      type: "text",
      text: s3?.confirmation_text ?? "Payment එක දාන්න පැය කිහිපයක් යනවනම් සල්ලි දාන්න කලින් Message  එකක් දාල තාම 25 දෙනා Fill වෙලා නැද්ද කියලා Confirm  කරගෙන Payment  එක දාන්න.",
    },
  ];
}

export default function MessageSetsManager({ config, onChange }: MessageSetsManagerProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("set1");
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [newKeywordInputs, setNewKeywordInputs] = useState<Record<string, string>>({});

  // Ensure normalized structure with fallback defaults
  const normalizedConfig = useMemo(() => {
    const s1 = config?.set1 || ({} as any);
    const s2 = config?.set2 || ({} as any);
    const s3 = config?.set3 || ({} as any);
    const s1Items = Array.isArray(s1.items) && s1.items.length > 0 ? s1.items : getDefaultSet1Items(s1);
    const s2Items = Array.isArray(s2.items) && s2.items.length > 0 ? s2.items : getDefaultSet2Items(s2);
    const s3Items = Array.isArray(s3.items) && s3.items.length > 0 ? s3.items : getDefaultSet3Items(s3);
    const rw = config?.receipt_workflow || {
      request_details_text: "ඔබගේ ගෙවීම් රිසිට්පත ලැබුණා. කරුණාකර ඔබගේ නම (Full Name), Email ලිපිනය සහ දුරකථන අංකය (Phone Number) මෙහි එවන්න. 📝",
      onboarding_confirm_text: "ඔබගේ විස්තර ලැබුණා. ඔබගේ Payment එක තහවුරු කර පැය 1ක් (1 hour) ඇතුලත ඔබව පාඨමාලාවට සම්බන්ධ කරනු ලැබේ. ස්තූතියි! ☺️🧡",
      enabled: true,
    };

    return {
      enabled: config?.enabled ?? true,
      set1: {
        ...s1,
        name: s1.name || "Set 1 (Welcome)",
        enabled: s1.enabled ?? true,
        items: s1Items,
      },
      set2: {
        ...s2,
        name: s2.name || "Set 2 (Discounts)",
        enabled: s2.enabled ?? true,
        items: s2Items,
      },
      set3: {
        ...s3,
        name: s3.name || "Set 3 (Payment)",
        enabled: s3.enabled ?? true,
        items: s3Items,
      },
      custom_sets: Array.isArray(config?.custom_sets) ? config.custom_sets : [],
      receipt_workflow: {
        request_details_text: rw.request_details_text || "",
        onboarding_confirm_text: rw.onboarding_confirm_text || "",
        enabled: rw.enabled ?? true,
      },
      pay_later_response: config?.pay_later_response || "හොඳයි, ඔබට පහසු වේලාවක අප හා සම්බන්ධ වන්න. ස්තූතියි! ☺️",
    };
  }, [config]);

  const updateSetItems = (setKey: "set1" | "set2" | "set3", newItems: SetMessageItem[]) => {
    onChange({
      ...normalizedConfig,
      [setKey]: {
        ...normalizedConfig[setKey],
        items: newItems,
      },
    });
  };

  const updateCustomSetItems = (customSetId: string, newItems: SetMessageItem[]) => {
    const updatedCustom = (normalizedConfig.custom_sets || []).map((cs) =>
      cs.id === customSetId ? { ...cs, items: newItems } : cs
    );
    onChange({
      ...normalizedConfig,
      custom_sets: updatedCustom,
    });
  };

  const handleItemFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setKey: string,
    itemId: string,
    folder: "sets" | "audio" = "sets"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 50MB.", variant: "destructive" });
      return;
    }

    setUploadingItemId(itemId);
    try {
      const url = await uploadMedia(file, folder);
      if (setKey === "set1" || setKey === "set2" || setKey === "set3") {
        const items = normalizedConfig[setKey].items || [];
        const updated = items.map((it) => (it.id === itemId ? { ...it, media_url: url } : it));
        updateSetItems(setKey, updated);
      } else {
        const customSet = (normalizedConfig.custom_sets || []).find((cs) => cs.id === setKey);
        if (customSet) {
          const updated = (customSet.items || []).map((it) => (it.id === itemId ? { ...it, media_url: url } : it));
          updateCustomSetItems(setKey, updated);
        }
      }
      toast({ title: "Media uploaded successfully", description: file.name });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingItemId(null);
    }
  };

  const handleAddItem = (
    setKey: "set1" | "set2" | "set3" | string,
    type: "text" | "image" | "audio" | "video" | "document"
  ) => {
    const newItemId = `item_${Date.now()}`;
    const typeNames: Record<string, string> = {
      text: "Text Message",
      image: "Image & Caption",
      audio: "Voice Note / Audio",
      video: "Video & Caption",
      document: "Document / File",
    };

    const newItem: SetMessageItem = {
      id: newItemId,
      name: `${typeNames[type]}`,
      type,
      text: type === "text" ? "" : undefined,
      media_url: type !== "text" ? "" : undefined,
      caption: type === "image" || type === "video" ? "" : undefined,
    };

    if (setKey === "set1" || setKey === "set2" || setKey === "set3") {
      const items = [...(normalizedConfig[setKey].items || []), newItem];
      updateSetItems(setKey, items);
    } else {
      const customSet = (normalizedConfig.custom_sets || []).find((cs) => cs.id === setKey);
      if (customSet) {
        const items = [...(customSet.items || []), newItem];
        updateCustomSetItems(setKey, items);
      }
    }
    toast({ title: `Added new ${type} item` });
  };

  const handleDeleteItem = (setKey: "set1" | "set2" | "set3" | string, itemId: string) => {
    if (setKey === "set1" || setKey === "set2" || setKey === "set3") {
      const items = (normalizedConfig[setKey].items || []).filter((it) => it.id !== itemId);
      updateSetItems(setKey, items);
    } else {
      const customSet = (normalizedConfig.custom_sets || []).find((cs) => cs.id === setKey);
      if (customSet) {
        const items = (customSet.items || []).filter((it) => it.id !== itemId);
        updateCustomSetItems(setKey, items);
      }
    }
    toast({ title: "Item deleted" });
  };

  const handleMoveItem = (setKey: "set1" | "set2" | "set3" | string, index: number, direction: "up" | "down") => {
    const isStandard = setKey === "set1" || setKey === "set2" || setKey === "set3";
    const items = isStandard
      ? [...(normalizedConfig[setKey as "set1" | "set2" | "set3"].items || [])]
      : [...((normalizedConfig.custom_sets || []).find((cs) => cs.id === setKey)?.items || [])];

    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === items.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const [moved] = items.splice(index, 1);
    items.splice(targetIndex, 0, moved);

    if (isStandard) {
      updateSetItems(setKey as "set1" | "set2" | "set3", items);
    } else {
      updateCustomSetItems(setKey, items);
    }
  };

  const handleItemFieldChange = (
    setKey: "set1" | "set2" | "set3" | string,
    itemId: string,
    field: keyof SetMessageItem,
    value: any
  ) => {
    const isStandard = setKey === "set1" || setKey === "set2" || setKey === "set3";
    if (isStandard) {
      const items = (normalizedConfig[setKey as "set1" | "set2" | "set3"].items || []).map((it) =>
        it.id === itemId ? { ...it, [field]: value } : it
      );
      updateSetItems(setKey as "set1" | "set2" | "set3", items);
    } else {
      const customSet = (normalizedConfig.custom_sets || []).find((cs) => cs.id === setKey);
      if (customSet) {
        const items = (customSet.items || []).map((it) => (it.id === itemId ? { ...it, [field]: value } : it));
        updateCustomSetItems(setKey, items);
      }
    }
  };

  const renderItemCard = (
    item: SetMessageItem,
    index: number,
    totalItems: number,
    setKey: "set1" | "set2" | "set3" | string
  ) => {
    if (!item) return null;
    const isUploading = uploadingItemId === item.id;

    return (
      <Card key={item.id} className="border border-border/80 bg-card/60 shadow-2xs transition-all hover:border-border">
        <CardHeader className="p-3.5 pb-2 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Left: Reorder & Name input */}
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  disabled={index === 0}
                  onClick={() => handleMoveItem(setKey, index, "up")}
                  title="Move Up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  disabled={index === (totalItems || 1) - 1}
                  onClick={() => handleMoveItem(setKey, index, "down")}
                  title="Move Down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Editable Name */}
              <div className="flex-1 min-w-0">
                <Input
                  value={item.name || ""}
                  onChange={(e) => handleItemFieldChange(setKey, item.id, "name", e.target.value)}
                  className="h-8 text-xs font-semibold bg-background border-border/60 focus-visible:ring-1"
                  placeholder="Message / Media Title (e.g. 1. Voice Note)"
                />
              </div>
            </div>

            {/* Right: Type selector & Delete */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Select
                value={item.type || "text"}
                onValueChange={(val) => handleItemFieldChange(setKey, item.id, "type", val)}
              >
                <SelectTrigger className="h-8 text-xs w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">📝 Text</SelectItem>
                  <SelectItem value="image">🖼️ Image</SelectItem>
                  <SelectItem value="audio">🎵 Audio</SelectItem>
                  <SelectItem value="video">🎥 Video</SelectItem>
                  <SelectItem value="document">📄 Document</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteItem(setKey, item.id)}
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Delete this message"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3.5 space-y-3">
          {/* TEXT TYPE */}
          {item.type === "text" && (
            <div className="space-y-2">
              <Textarea
                rows={3}
                value={item.text || ""}
                onChange={(e) => handleItemFieldChange(setKey, item.id, "text", e.target.value)}
                placeholder="Type the message content in Sinhala, English, or Singlish..."
                className="text-xs font-sans leading-relaxed resize-y"
              />
              {/* Optional Time Restricted Delivery */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t text-xs">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={item.time_restricted || false}
                    onCheckedChange={(checked) => handleItemFieldChange(setKey, item.id, "time_restricted", checked)}
                    id={`timerestrict_${item.id}`}
                  />
                  <Label htmlFor={`timerestrict_${item.id}`} className="text-xs font-medium cursor-pointer">
                    Time-restricted delivery (Only send before cutoff hour)
                  </Label>
                </div>
                {item.time_restricted && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">Cutoff Hour (Sri Lanka Time):</span>
                    <Input
                      type="number"
                      min={0}
                      max={23}
                      value={item.cutoff_hour_sl ?? 14}
                      onChange={(e) => handleItemFieldChange(setKey, item.id, "cutoff_hour_sl", parseInt(e.target.value) || 14)}
                      className="h-7 w-16 text-xs text-center"
                    />
                    <span className="text-muted-foreground text-xs">:00</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AUDIO TYPE */}
          {item.type === "audio" && (
            <div className="space-y-3">
              {item.media_url ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-lg border bg-muted/20">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Music className="h-4 w-4 text-purple-500 flex-shrink-0" />
                    <audio controls className="h-8 flex-1 max-w-md" src={item.media_url}>
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => handleItemFileUpload(e, setKey, item.id, "audio")}
                        disabled={isUploading}
                      />
                      <Button variant="outline" size="sm" asChild disabled={isUploading} className="h-7 text-xs gap-1">
                        <span>
                          {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                          Replace Audio
                        </span>
                      </Button>
                    </label>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleItemFieldChange(setKey, item.id, "media_url", "")}
                      title="Remove audio file"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/40 transition-colors border-border/80">
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => handleItemFileUpload(e, setKey, item.id, "audio")}
                    disabled={isUploading}
                  />
                  {isUploading ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Uploading audio file...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <Music className="h-4 w-4 text-purple-500" />
                      Click to upload audio / voice note (.mp3, .ogg, .wav, .m4a)
                    </div>
                  )}
                </label>
              )}
            </div>
          )}

          {/* IMAGE TYPE */}
          {item.type === "image" && (
            <div className="space-y-3">
              <div className="flex flex-col md:flex-row gap-4 items-start">
                <div className="space-y-2 flex-shrink-0 w-full md:w-56">
                  {item.media_url ? (
                    <div className="relative group rounded-lg overflow-hidden border bg-muted/20">
                      <img
                        src={item.media_url}
                        alt={item.name}
                        className="w-full h-32 object-contain bg-black/5 dark:bg-black/20"
                      />
                      <div className="flex items-center justify-center gap-1.5 p-1.5 bg-background/90 border-t">
                        <label className="cursor-pointer flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleItemFileUpload(e, setKey, item.id, "sets")}
                            disabled={isUploading}
                          />
                          <Button variant="outline" size="sm" asChild disabled={isUploading} className="w-full h-7 text-xs gap-1">
                            <span>
                              {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                              Change Image
                            </span>
                          </Button>
                        </label>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleItemFieldChange(setKey, item.id, "media_url", "")}
                          title="Remove image"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg h-32 cursor-pointer hover:bg-muted/40 transition-colors border-border/80">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleItemFileUpload(e, setKey, item.id, "sets")}
                        disabled={isUploading}
                      />
                      {isUploading ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          Uploading...
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-center p-2 text-xs text-muted-foreground">
                          <ImageIcon className="h-5 w-5 text-blue-500" />
                          <span className="font-medium">Upload Image</span>
                          <span className="text-[10px] text-muted-foreground/80">PNG, JPG, WebP</span>
                        </div>
                      )}
                    </label>
                  )}
                </div>

                <div className="flex-1 w-full space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Caption Text (Optional)</Label>
                  <Textarea
                    rows={4}
                    value={item.caption || ""}
                    onChange={(e) => handleItemFieldChange(setKey, item.id, "caption", e.target.value)}
                    placeholder="Caption sent with the image..."
                    className="text-xs leading-relaxed resize-y"
                  />
                </div>
              </div>
            </div>
          )}

          {/* VIDEO TYPE */}
          {item.type === "video" && (
            <div className="space-y-3">
              <div className="flex flex-col md:flex-row gap-4 items-start">
                <div className="space-y-2 flex-shrink-0 w-full md:w-56">
                  {item.media_url ? (
                    <div className="rounded-lg overflow-hidden border bg-muted/20 space-y-1.5 p-1.5">
                      <video controls className="w-full h-32 object-contain bg-black" src={item.media_url} />
                      <div className="flex items-center gap-1.5">
                        <label className="cursor-pointer flex-1">
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => handleItemFileUpload(e, setKey, item.id, "sets")}
                            disabled={isUploading}
                          />
                          <Button variant="outline" size="sm" asChild disabled={isUploading} className="w-full h-7 text-xs gap-1">
                            <span>
                              {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                              Replace Video
                            </span>
                          </Button>
                        </label>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleItemFieldChange(setKey, item.id, "media_url", "")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg h-32 cursor-pointer hover:bg-muted/40 transition-colors">
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => handleItemFileUpload(e, setKey, item.id, "sets")}
                        disabled={isUploading}
                      />
                      <Video className="h-5 w-5 text-emerald-500 mb-1" />
                      <span className="text-xs font-medium text-muted-foreground">Upload Video (.mp4)</span>
                    </label>
                  )}
                </div>
                <div className="flex-1 w-full space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Video Caption (Optional)</Label>
                  <Textarea
                    rows={4}
                    value={item.caption || ""}
                    onChange={(e) => handleItemFieldChange(setKey, item.id, "caption", e.target.value)}
                    placeholder="Caption sent with the video..."
                    className="text-xs leading-relaxed resize-y"
                  />
                </div>
              </div>
            </div>
          )}

          {/* DOCUMENT TYPE */}
          {item.type === "document" && (
            <div className="space-y-3">
              {item.media_url ? (
                <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                  <div className="flex items-center gap-2 text-xs truncate">
                    <FileText className="h-4 w-4 text-cyan-500 flex-shrink-0" />
                    <span className="font-mono truncate">{item.media_url}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => handleItemFileUpload(e, setKey, item.id, "sets")}
                        disabled={isUploading}
                      />
                      <Button variant="outline" size="sm" asChild disabled={isUploading} className="h-7 text-xs">
                        <span>Replace Doc</span>
                      </Button>
                    </label>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleItemFieldChange(setKey, item.id, "media_url", "")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="flex items-center justify-center border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/40 transition-colors">
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => handleItemFileUpload(e, setKey, item.id, "sets")}
                    disabled={isUploading}
                  />
                  <FileText className="h-4 w-4 text-cyan-500 mr-2" />
                  <span className="text-xs font-medium text-muted-foreground">Upload Document (PDF, Word, etc.)</span>
                </label>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderAddItemToolbar = (setKey: "set1" | "set2" | "set3" | string) => (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-dashed border-border/80 bg-muted/10">
      <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
        <Plus className="h-3.5 w-3.5" /> Add to sequence:
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleAddItem(setKey, "text")}
        className="h-7 text-xs gap-1"
      >
        <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
        Text Message
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleAddItem(setKey, "audio")}
        className="h-7 text-xs gap-1"
      >
        <Music className="h-3.5 w-3.5 text-purple-500" />
        Voice Note / Audio
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleAddItem(setKey, "image")}
        className="h-7 text-xs gap-1"
      >
        <ImageIcon className="h-3.5 w-3.5 text-amber-500" />
        Image
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleAddItem(setKey, "video")}
        className="h-7 text-xs gap-1"
      >
        <Video className="h-3.5 w-3.5 text-emerald-500" />
        Video
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleAddItem(setKey, "document")}
        className="h-7 text-xs gap-1"
      >
        <FileText className="h-3.5 w-3.5 text-cyan-500" />
        Document
      </Button>
    </div>
  );

  const handleAddCustomSet = () => {
    const newId = `custom_${Date.now()}`;
    const newSet: CustomSet = {
      id: newId,
      name: `Custom Message Set ${(normalizedConfig.custom_sets || []).length + 1}`,
      enabled: true,
      trigger_keywords: ["keyword"],
      items: [
        {
          id: `item_${Date.now()}_1`,
          name: "1. Text Message",
          type: "text",
          text: "Hello! This is a custom automated response.",
        },
      ],
    };

    onChange({
      ...normalizedConfig,
      custom_sets: [...(normalizedConfig.custom_sets || []), newSet],
    });
    setActiveTab(newId);
    toast({ title: "New custom message set created" });
  };

  const handleRemoveCustomSet = (customSetId: string) => {
    const updated = (normalizedConfig.custom_sets || []).filter((cs) => cs.id !== customSetId);
    onChange({
      ...normalizedConfig,
      custom_sets: updated,
    });
    setActiveTab("set1");
    toast({ title: "Custom message set removed" });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Automated Message Sets
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Configure, customize, and add or remove sequential message sets, media attachments, and limited-time offers
          </p>
        </div>
        <Button onClick={handleAddCustomSet} size="sm" variant="outline" className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Add Message Set
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto p-1 bg-muted/40 border">
          <TabsTrigger value="set1" className="text-xs">
            {normalizedConfig.set1?.name || "Set 1 (Welcome)"}
          </TabsTrigger>
          <TabsTrigger value="set2" className="text-xs">
            {normalizedConfig.set2?.name || "Set 2 (Discounts)"}
          </TabsTrigger>
          <TabsTrigger value="set3" className="text-xs">
            {normalizedConfig.set3?.name || "Set 3 (Payment)"}
          </TabsTrigger>
          {(normalizedConfig.custom_sets || []).map((cSet) => (
            <TabsTrigger key={cSet.id} value={cSet.id} className="text-xs">
              {cSet.name}
            </TabsTrigger>
          ))}
          <TabsTrigger value="receipts" className="text-xs">
            Receipts & Pay Later
          </TabsTrigger>
        </TabsList>

        {/* SET 1 TAB */}
        <TabsContent value="set1" className="space-y-4">
          <Card>
            <CardHeader className="p-4 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <Input
                    value={normalizedConfig.set1?.name || "Set 1 (Welcome)"}
                    onChange={(e) =>
                      onChange({
                        ...normalizedConfig,
                        set1: { ...normalizedConfig.set1, name: e.target.value },
                      })
                    }
                    className="h-8 text-sm font-semibold max-w-xs"
                    placeholder="Set Name"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="set1_enabled" className="text-xs font-medium cursor-pointer">
                      Enabled
                    </Label>
                    <Switch
                      id="set1_enabled"
                      checked={normalizedConfig.set1?.enabled ?? true}
                      onCheckedChange={(checked) =>
                        onChange({
                          ...normalizedConfig,
                          set1: { ...normalizedConfig.set1, enabled: checked },
                        })
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateSetItems("set1", getDefaultSet1Items())}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                    title="Reset to default messages"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-3">
                {(normalizedConfig.set1?.items || []).map((item, idx) =>
                  renderItemCard(item, idx, (normalizedConfig.set1?.items || []).length, "set1")
                )}
              </div>
              {renderAddItemToolbar("set1")}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SET 2 TAB */}
        <TabsContent value="set2" className="space-y-4">
          <Card>
            <CardHeader className="p-4 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <Input
                    value={normalizedConfig.set2?.name || "Set 2 (Discounts)"}
                    onChange={(e) =>
                      onChange({
                        ...normalizedConfig,
                        set2: { ...normalizedConfig.set2, name: e.target.value },
                      })
                    }
                    className="h-8 text-sm font-semibold max-w-xs"
                    placeholder="Set Name"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="set2_enabled" className="text-xs font-medium cursor-pointer">
                      Enabled
                    </Label>
                    <Switch
                      id="set2_enabled"
                      checked={normalizedConfig.set2?.enabled ?? true}
                      onCheckedChange={(checked) =>
                        onChange({
                          ...normalizedConfig,
                          set2: { ...normalizedConfig.set2, enabled: checked },
                        })
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateSetItems("set2", getDefaultSet2Items())}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                    title="Reset to default messages"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-3">
                {(normalizedConfig.set2?.items || []).map((item, idx) =>
                  renderItemCard(item, idx, (normalizedConfig.set2?.items || []).length, "set2")
                )}
              </div>
              {renderAddItemToolbar("set2")}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SET 3 TAB */}
        <TabsContent value="set3" className="space-y-4">
          <Card>
            <CardHeader className="p-4 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <Input
                    value={normalizedConfig.set3?.name || "Set 3 (Payment)"}
                    onChange={(e) =>
                      onChange({
                        ...normalizedConfig,
                        set3: { ...normalizedConfig.set3, name: e.target.value },
                      })
                    }
                    className="h-8 text-sm font-semibold max-w-xs"
                    placeholder="Set Name"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="set3_enabled" className="text-xs font-medium cursor-pointer">
                      Enabled
                    </Label>
                    <Switch
                      id="set3_enabled"
                      checked={normalizedConfig.set3?.enabled ?? true}
                      onCheckedChange={(checked) =>
                        onChange({
                          ...normalizedConfig,
                          set3: { ...normalizedConfig.set3, enabled: checked },
                        })
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateSetItems("set3", getDefaultSet3Items())}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                    title="Reset to default messages"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-3">
                {(normalizedConfig.set3?.items || []).map((item, idx) =>
                  renderItemCard(item, idx, (normalizedConfig.set3?.items || []).length, "set3")
                )}
              </div>
              {renderAddItemToolbar("set3")}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CUSTOM SETS TABS */}
        {(normalizedConfig.custom_sets || []).map((cSet) => (
          <TabsContent key={cSet.id} value={cSet.id} className="space-y-4">
            <Card>
              <CardHeader className="p-4 border-b">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <Input
                      value={cSet.name || ""}
                      onChange={(e) => {
                        const updated = (normalizedConfig.custom_sets || []).map((cs) =>
                          cs.id === cSet.id ? { ...cs, name: e.target.value } : cs
                        );
                        onChange({ ...normalizedConfig, custom_sets: updated });
                      }}
                      className="h-8 text-sm font-semibold max-w-xs"
                      placeholder="Set Name"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`custom_en_${cSet.id}`} className="text-xs font-medium cursor-pointer">
                        Enabled
                      </Label>
                      <Switch
                        id={`custom_en_${cSet.id}`}
                        checked={cSet.enabled ?? true}
                        onCheckedChange={(checked) => {
                          const updated = (normalizedConfig.custom_sets || []).map((cs) =>
                            cs.id === cSet.id ? { ...cs, enabled: checked } : cs
                          );
                          onChange({ ...normalizedConfig, custom_sets: updated });
                        }}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCustomSet(cSet.id)}
                      className="h-7 text-xs text-destructive hover:bg-destructive/10 gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove Set
                    </Button>
                  </div>
                </div>

                {/* Trigger Keywords */}
                <div className="pt-2">
                  <Label className="text-xs text-muted-foreground mb-1 block">Trigger Keywords</Label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(cSet.trigger_keywords || []).map((kw, kwIdx) => (
                      <span
                        key={kwIdx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-muted border font-mono"
                      >
                        {kw}
                        <button
                          type="button"
                          onClick={() => {
                            const newKws = (cSet.trigger_keywords || []).filter((_, i) => i !== kwIdx);
                            const updated = (normalizedConfig.custom_sets || []).map((cs) =>
                              cs.id === cSet.id ? { ...cs, trigger_keywords: newKws } : cs
                            );
                            onChange({ ...normalizedConfig, custom_sets: updated });
                          }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <div className="flex items-center gap-1">
                      <Input
                        value={newKeywordInputs[cSet.id] || ""}
                        onChange={(e) =>
                          setNewKeywordInputs((prev) => ({ ...prev, [cSet.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const val = (newKeywordInputs[cSet.id] || "").trim();
                            if (val && !(cSet.trigger_keywords || []).includes(val)) {
                              const updated = (normalizedConfig.custom_sets || []).map((cs) =>
                                cs.id === cSet.id ? { ...cs, trigger_keywords: [...(cs.trigger_keywords || []), val] } : cs
                              );
                              onChange({ ...normalizedConfig, custom_sets: updated });
                              setNewKeywordInputs((prev) => ({ ...prev, [cSet.id]: "" }));
                            }
                          }
                        }}
                        placeholder="Add keyword + Enter..."
                        className="h-7 text-xs w-36"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const val = (newKeywordInputs[cSet.id] || "").trim();
                          if (val && !(cSet.trigger_keywords || []).includes(val)) {
                            const updated = (normalizedConfig.custom_sets || []).map((cs) =>
                              cs.id === cSet.id ? { ...cs, trigger_keywords: [...(cs.trigger_keywords || []), val] } : cs
                            );
                            onChange({ ...normalizedConfig, custom_sets: updated });
                            setNewKeywordInputs((prev) => ({ ...prev, [cSet.id]: "" }));
                          }
                        }}
                        className="h-7 text-xs"
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-3">
                  {(cSet.items || []).map((item, idx) =>
                    renderItemCard(item, idx, (cSet.items || []).length, cSet.id)
                  )}
                </div>
                {renderAddItemToolbar(cSet.id)}
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        {/* RECEIPTS & PAY LATER TAB */}
        <TabsContent value="receipts" className="space-y-4">
          <Card>
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-semibold">Payment Slip & Details Intake Workflow</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">1. Request Details Message (Sent after user sends receipt slip)</Label>
                <Textarea
                  rows={2}
                  value={normalizedConfig.receipt_workflow?.request_details_text || ""}
                  onChange={(e) =>
                    onChange({
                      ...normalizedConfig,
                      receipt_workflow: {
                        ...normalizedConfig.receipt_workflow,
                        request_details_text: e.target.value,
                      },
                    })
                  }
                  className="text-xs leading-relaxed"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">2. Confirmation & Verification Message (Sent after details submitted)</Label>
                <Textarea
                  rows={2}
                  value={normalizedConfig.receipt_workflow?.onboarding_confirm_text || ""}
                  onChange={(e) =>
                    onChange({
                      ...normalizedConfig,
                      receipt_workflow: {
                        ...normalizedConfig.receipt_workflow,
                        onboarding_confirm_text: e.target.value,
                      },
                    })
                  }
                  className="text-xs leading-relaxed"
                />
              </div>

              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-semibold">3. Pay Later Intent Response Message</Label>
                <Textarea
                  rows={2}
                  value={normalizedConfig.pay_later_response || ""}
                  onChange={(e) =>
                    onChange({
                      ...normalizedConfig,
                      pay_later_response: e.target.value,
                    })
                  }
                  className="text-xs leading-relaxed"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
