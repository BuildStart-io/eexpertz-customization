import { getFunctionUrl } from "@/lib/functions";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useEffectivePlan } from "@/hooks/useEffectivePlan";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Sparkles, Lock, Users, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const LEAD_STATUSES = [
  { value: "new", label: "New" },
  { value: "reached", label: "Reached" },
  { value: "follow_up", label: "Follow Up" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

const UNASSIGNED = "__unassigned__";
const ALL = "__all__";

interface StaffOption {
  staff_user_id: string;
  staff_name: string | null;
  staff_email: string;
  whatsapp_number?: string | null;
}

interface LeadRow {
  id: string | null;
  phone_number: string;
  customer_name: string;
  assigned_to: string | null;
  status: string;
  inbound_count: number;
  has_order: boolean;
  last_time: string | null;
}

export default function Leads() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { effectiveUserId, isStaff, isGrowth, loading: planLoading } = useEffectivePlan();

  const [rows, setRows] = useState<LeadRow[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoAssign, setAutoAssign] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStaff, setFilterStaff] = useState<string>(ALL);
  const [filterStatus, setFilterStatus] = useState<string>(ALL);
  const [qualifiedOnly, setQualifiedOnly] = useState(false);

  // Server-side pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 25;

  const isOwner = !isStaff;

  const load = useCallback(async () => {
    if (!effectiveUserId || !isGrowth) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch staff & settings
      const [staffRes, settingRes] = await Promise.all([
        supabase
          .from("staff_accounts")
          .select("staff_user_id, staff_name, staff_email, whatsapp_number")
          .eq("owner_id", effectiveUserId)
          .eq("is_active", true),
        supabase
          .from("settings")
          .select("value")
          .eq("user_id", effectiveUserId)
          .eq("key", "leads_auto_assign")
          .maybeSingle(),
      ]);

      const staffList = (staffRes.data || []) as StaffOption[];
      setStaff(staffList);
      setAutoAssign(Boolean((settingRes.data?.value as any)?.enabled));

      // 2. Query paginated leads directly from database
      let query = supabase
        .from("leads" as any)
        .select("id, phone_number, customer_name, assigned_to, status, inbound_count, updated_at", {
          count: "exact",
        })
        .eq("user_id", effectiveUserId);

      if (isStaff && user) {
        query = query.eq("assigned_to", user.id);
      } else if (isOwner) {
        if (filterStaff !== ALL) {
          if (filterStaff === UNASSIGNED) {
            query = query.is("assigned_to", null);
          } else {
            query = query.eq("assigned_to", filterStaff);
          }
        }
        if (filterStatus !== ALL) {
          query = query.eq("status", filterStatus);
        }
        if (qualifiedOnly) {
          query = query.gte("inbound_count", 6);
        }
      }

      const cleanSearch = search.trim();
      if (cleanSearch) {
        query = query.or(
          `customer_name.ilike.%${cleanSearch}%,phone_number.ilike.%${cleanSearch}%`
        );
      }

      query = query
        .order("updated_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      const { data: leadData, count, error: leadError } = await query;
      if (leadError) throw leadError;

      const loadedLeads = (leadData as any[]) || [];
      setTotalCount(count ?? 0);

      // 3. For the 25 leads on the active page, check if they have orders
      const pagePhones = loadedLeads.map((l) => l.phone_number);
      const orderPhones = new Set<string>();

      if (pagePhones.length > 0) {
        const { data: orderData } = await supabase
          .from("orders")
          .select("customer_phone, whatsapp_phone")
          .eq("user_id", effectiveUserId)
          .in("customer_phone", pagePhones);

        (orderData || []).forEach((o: any) => {
          if (o.customer_phone) orderPhones.add(String(o.customer_phone));
          if (o.whatsapp_phone) orderPhones.add(String(o.whatsapp_phone));
        });
      }

      const built: LeadRow[] = loadedLeads.map((l) => ({
        id: l.id,
        phone_number: l.phone_number,
        customer_name: l.customer_name || "Unknown",
        assigned_to: l.assigned_to ?? null,
        status: l.status || "new",
        inbound_count: l.inbound_count || 0,
        has_order: orderPhones.has(l.phone_number),
        last_time: l.updated_at || null,
      }));

      setRows(built);
    } catch (err: any) {
      toast({ title: "Error loading leads", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [
    effectiveUserId,
    isGrowth,
    isStaff,
    isOwner,
    user,
    filterStaff,
    filterStatus,
    qualifiedOnly,
    search,
    page,
    toast,
  ]);

  // Debounced load when filters/search/page changes
  useEffect(() => {
    if (!planLoading) {
      const timer = setTimeout(() => {
        load();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [planLoading, load]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleStaffFilterChange = (val: string) => {
    setFilterStaff(val);
    setPage(1);
  };

  const handleStatusFilterChange = (val: string) => {
    setFilterStatus(val);
    setPage(1);
  };

  const handleQualifiedToggle = () => {
    setQualifiedOnly((prev) => !prev);
    setPage(1);
  };

  // Auto-assign unassigned leads on the active page
  useEffect(() => {
    if (!isOwner || !autoAssign || loading || staff.length === 0) return;
    const unassigned = rows.filter((r) => !r.assigned_to && r.id);
    if (unassigned.length === 0) return;

    const counts = new Map<string, number>();
    staff.forEach((s) => counts.set(s.staff_user_id, 0));
    rows.forEach((r) => {
      if (r.assigned_to && counts.has(r.assigned_to)) {
        counts.set(r.assigned_to, (counts.get(r.assigned_to) || 0) + 1);
      }
    });

    (async () => {
      const updates: { id: string; staffId: string }[] = [];
      for (const lead of unassigned) {
        let target = staff[0].staff_user_id;
        let min = Infinity;
        for (const s of staff) {
          const c = counts.get(s.staff_user_id) || 0;
          if (c < min) {
            min = c;
            target = s.staff_user_id;
          }
        }
        counts.set(target, (counts.get(target) || 0) + 1);
        updates.push({ id: lead.id as string, staffId: target });
      }
      await Promise.all(
        updates.map((u) =>
          (supabase.from("leads" as any) as any)
            .update({ assigned_to: u.staffId })
            .eq("id", u.id)
        )
      );
      updates.forEach((u) => {
        const lead = rows.find((r) => r.id === u.id);
        if (lead) notifyStaffAssignment(u.staffId, lead);
      });
      setRows((prev) =>
        prev.map((r) => {
          const u = updates.find((x) => x.id === r.id);
          return u ? { ...r, assigned_to: u.staffId } : r;
        })
      );
    })();
  }, [autoAssign, rows, staff, isOwner, loading]);

  const toggleAutoAssign = async (checked: boolean) => {
    if (!effectiveUserId) return;
    setAutoAssign(checked);
    const { error } = await supabase
      .from("settings")
      .upsert(
        { user_id: effectiveUserId, key: "leads_auto_assign", value: { enabled: checked } },
        { onConflict: "user_id,key" }
      );
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: checked ? "Auto-assign enabled" : "Auto-assign disabled" });
  };

  // Notify the staff member on WhatsApp that a customer was assigned to them
  const notifyStaffAssignment = async (staffUserId: string, row: LeadRow) => {
    try {
      const member = staff.find((s) => s.staff_user_id === staffUserId);
      const number = member?.whatsapp_number?.trim();
      if (!number || !effectiveUserId) return;

      const { data: sessionData } = await supabase
        .from("user_wsender_sessions" as any)
        .select("session_api_key, session_id")
        .eq("user_id", effectiveUserId)
        .limit(1)
        .maybeSingle();

      const displayPhone = String(row.phone_number || "").split("@")[0];
      const message = `👤 NEW CUSTOMER ASSIGNED\n\nName: ${row.customer_name || "Unknown"}\nContact: ${displayPhone}\n\nPlease follow up with this customer.`;

      await fetch(getFunctionUrl("send-whatsapp"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: number,
          message,
          sessionApiKey:
            (sessionData as any)?.session_api_key || (sessionData as any)?.session_id,
        }),
      });
    } catch (e) {
      console.error("Staff assignment notification failed", e);
    }
  };

  const updateLead = async (row: LeadRow, patch: Record<string, any>) => {
    if (!row.id) return;
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...patch } : r)));
    const { error } = await (supabase.from("leads" as any) as any)
      .update(patch)
      .eq("id", row.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      load();
      return;
    }
    if (
      Object.prototype.hasOwnProperty.call(patch, "assigned_to") &&
      patch.assigned_to &&
      patch.assigned_to !== row.assigned_to
    ) {
      notifyStaffAssignment(patch.assigned_to, { ...row, ...patch });
    }
  };

  const isQualified = (r: LeadRow) => r.inbound_count >= 6 || r.has_order;
  const totalPages = Math.ceil(totalCount / pageSize);

  if (planLoading) {
    return (
      <DashboardLayout>
        <p className="text-muted-foreground">Loading...</p>
      </DashboardLayout>
    );
  }

  if (!isGrowth) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto mt-10">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-2">
                <Lock className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>Leads is a Growth plan feature</CardTitle>
              <CardDescription>
                Upgrade to the Growth plan to track customers, assign leads to your staff and
                follow up on qualified buyers.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => navigate("/dashboard/settings")}>View plan details</Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Leads</h1>
            <p className="text-muted-foreground text-sm">
              {isStaff
                ? "Leads assigned to you"
                : "Customers who have chatted with your WhatsApp bot"}
            </p>
          </div>
          {isOwner && (
            <div className="flex items-center gap-2 rounded-lg border p-3">
              <Switch
                id="auto-assign"
                checked={autoAssign}
                onCheckedChange={toggleAutoAssign}
                disabled={staff.length === 0}
              />
              <Label htmlFor="auto-assign" className="text-sm cursor-pointer">
                Assign automatically
              </Label>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name or number"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          {isOwner && (
            <>
              <Select value={filterStaff} onValueChange={handleStaffFilterChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All staff</SelectItem>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.staff_user_id} value={s.staff_user_id}>
                      {s.staff_name || s.staff_email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All statuses</SelectItem>
                  {LEAD_STATUSES.map((st) => (
                    <SelectItem key={st.value} value={st.value}>
                      {st.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant={qualifiedOnly ? "default" : "outline"}
                size="sm"
                onClick={handleQualifiedToggle}
                className="gap-1.5"
              >
                <Sparkles className="h-4 w-4" /> Qualified only
              </Button>
            </>
          )}
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading leads...
              </div>
            ) : rows.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>No leads found matching your criteria</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="p-3 text-left font-medium">Customer</th>
                        <th className="p-3 text-left font-medium">Phone</th>
                        <th className="p-3 text-left font-medium">Messages</th>
                        <th className="p-3 text-left font-medium">Status</th>
                        {isOwner && <th className="p-3 text-left font-medium">Assigned to</th>}
                        <th className="p-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rows.map((r) => {
                        const qualified = isQualified(r);
                        return (
                          <tr key={r.phone_number} className="hover:bg-muted/20">
                            <td className="p-3 font-medium">
                              <div className="flex items-center gap-2">
                                <span>{r.customer_name}</span>
                                {qualified && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                  >
                                    <Sparkles className="h-3 w-3" /> Qualified
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground">{r.phone_number}</td>
                            <td className="p-3 text-muted-foreground">
                              {r.inbound_count} incoming
                              {r.has_order && (
                                <span className="ml-1 text-xs text-primary">• ordered</span>
                              )}
                            </td>
                            <td className="p-3">
                              <Select
                                value={r.status}
                                onValueChange={(val) => updateLead(r, { status: val })}
                                disabled={!r.id}
                              >
                                <SelectTrigger className="w-[130px] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {LEAD_STATUSES.map((st) => (
                                    <SelectItem key={st.value} value={st.value}>
                                      {st.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            {isOwner && (
                              <td className="p-3">
                                <Select
                                  value={r.assigned_to || UNASSIGNED}
                                  onValueChange={(val) =>
                                    updateLead(r, {
                                      assigned_to: val === UNASSIGNED ? null : val,
                                    })
                                  }
                                  disabled={!r.id || staff.length === 0}
                                >
                                  <SelectTrigger className="w-[160px] h-8 text-xs">
                                    <SelectValue placeholder="Assign" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                                    {staff.map((s) => (
                                      <SelectItem key={s.staff_user_id} value={s.staff_user_id}>
                                        {s.staff_name || s.staff_email}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                            )}
                            <td className="p-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5"
                                onClick={() =>
                                  navigate(`/dashboard/conversations?phone=${r.phone_number}`)
                                }
                              >
                                <MessageSquare className="h-3.5 w-3.5" /> Chat
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalCount > pageSize && (
                  <div className="flex items-center justify-between p-4 border-t text-sm text-muted-foreground">
                    <div>
                      Showing {(page - 1) * pageSize + 1} to{" "}
                      {Math.min(page * pageSize, totalCount)} of {totalCount} leads
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1 || loading}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <span className="text-xs">
                        Page {page} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages || loading}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
