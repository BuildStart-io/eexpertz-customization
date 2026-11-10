import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Eye, ShoppingCart, Loader2, Phone, MapPin, CreditCard, Package, MessageSquare, Trash2, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import LimitWarningBanner from "@/components/LimitWarningBanner";

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  whatsapp_phone: string | null;
  district: string | null;
  customer_address: string | null;
  order_items: unknown;
  special_instructions: string | null;
  payment_method: string;
  status: string;
  total_amount: number;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  const pageSize = 20;
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("orders")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, count, error } = await query;

      if (error) throw error;
      setOrders(data || []);
      setTotalCount(count ?? 0);
    } catch (error: any) {
      toast({
        title: "Error fetching orders",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, page]);

  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;
      toast({ title: "Order status updated" });
      fetchOrders();
      
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (error: any) {
      toast({
        title: "Error updating order",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      const { error } = await supabase.from("orders").delete().eq("id", orderId);
      if (error) throw error;
      toast({ title: "Order deleted" });
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
      fetchOrders();
    } catch (error: any) {
      toast({ title: "Error deleting order", description: error.message, variant: "destructive" });
    }
  };

  const exportOrders = async (type: "csv" | "excel") => {
    setExporting(true);
    try {
      let query = supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const exportList = data || [];
      if (exportList.length === 0) {
        toast({ title: "No orders to export", variant: "destructive" });
        return;
      }

      const headers = [
        "Order ID",
        "Customer Name",
        "Phone",
        "District",
        "Address",
        "Items",
        "Payment Method",
        "Status",
        "Total (LKR)",
        "Special Instructions",
        "Date",
      ];
      const rows = exportList.map((o) => {
        const items = Array.isArray(o.order_items)
          ? (o.order_items as any[])
              .map((i: any) => `${i.name} x${i.quantity}`)
              .join("; ")
          : "";
        return [
          o.id.slice(0, 8),
          o.customer_name,
          o.customer_phone,
          o.district || "",
          o.customer_address || "",
          items,
          o.payment_method === "cod" ? "Cash on Delivery" : "Bank Transfer",
          o.status,
          Number(o.total_amount || 0).toFixed(2),
          o.special_instructions || "",
          format(new Date(o.created_at), "yyyy-MM-dd HH:mm"),
        ];
      });

      const csvContent = [headers, ...rows]
        .map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], {
        type:
          type === "excel"
            ? "application/vnd.ms-excel;charset=utf-8"
            : "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filterLabel = statusFilter === "all" ? "all" : statusFilter;
      a.download = `orders-${filterLabel}-${format(new Date(), "yyyy-MM-dd")}.${
        type === "excel" ? "xls" : "csv"
      }`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: `Orders exported as ${type === "excel" ? "Excel" : "CSV"}` });
    } catch (err: any) {
      toast({
        title: "Export failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <LimitWarningBanner type="orders" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Orders</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Manage customer orders from WhatsApp
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground hidden sm:inline">Filter:</span>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-[140px] sm:w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportOrders("csv")}
              disabled={exporting || totalCount === 0}
            >
              {exporting ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-4 w-4" />
              )}
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportOrders("excel")}
              disabled={exporting || totalCount === 0}
            >
              {exporting ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-4 w-4" />
              )}
              Excel
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Order List</CardTitle>
            <CardDescription>
              {totalCount} total order{totalCount !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No orders found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>District</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            {order.customer_name}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs">{order.customer_phone}</span>
                            {order.whatsapp_phone && order.whatsapp_phone !== order.customer_phone && (
                              <span className="block font-mono text-[10px] text-muted-foreground">
                                WA: {order.whatsapp_phone}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{order.district || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-xs">
                              {order.payment_method === "cod" ? "Cash on Delivery" : "Bank Transfer"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold">
                            LKR {order.total_amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={order.status}
                              onValueChange={(val) => updateOrderStatus(order.id, val)}
                            >
                              <SelectTrigger className="w-[120px] h-8">
                                <Badge className={statusColors[order.status] || ""}>
                                  {order.status}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map((status) => (
                                  <SelectItem key={status.value} value={status.value}>
                                    {status.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {format(new Date(order.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Order</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete this order. This action cannot be undone.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteOrder(order.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalCount > pageSize && (
                  <div className="flex items-center justify-between p-4 border-t text-sm text-muted-foreground">
                    <div>
                      Showing {(page - 1) * pageSize + 1} to{" "}
                      {Math.min(page * pageSize, totalCount)} of {totalCount} orders
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
                        Page {page} of {Math.ceil(totalCount / pageSize)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= Math.ceil(totalCount / pageSize) || loading}
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

        {/* Order Details Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
              <DialogDescription>
                Order #{selectedOrder?.id.slice(0, 8)}
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-6">
                {/* Customer Info */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Customer Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm bg-muted/50 p-3 rounded-lg">
                    <div>
                      <span className="text-muted-foreground">Name:</span>{" "}
                      <span className="font-medium">{selectedOrder.customer_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-mono">{selectedOrder.customer_phone}</span>
                    </div>
                    {selectedOrder.whatsapp_phone && (
                      <div className="flex items-center gap-1 col-span-2">
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground text-xs">WhatsApp:</span>{" "}
                        <span className="font-mono text-xs">{selectedOrder.whatsapp_phone}</span>
                      </div>
                    )}
                    {selectedOrder.district && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{selectedOrder.district}</span>
                      </div>
                    )}
                    {selectedOrder.customer_address && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Address:</span>{" "}
                        <span>{selectedOrder.customer_address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <Package className="h-4 w-4" /> Ordered Items
                  </h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.isArray(selectedOrder.order_items) &&
                          (selectedOrder.order_items as any[]).map((item: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell className="text-center">{item.quantity}</TableCell>
                              <TableCell className="text-right">
                                LKR {Number(item.price || 0).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                LKR {(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Payment & Status */}
                <div className="grid grid-cols-2 gap-3 text-sm bg-muted/50 p-3 rounded-lg">
                  <div>
                    <span className="text-muted-foreground">Payment Method:</span>{" "}
                    <span className="font-medium capitalize">
                      {selectedOrder.payment_method === "cod" ? "Cash on Delivery" : "Bank Transfer"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{" "}
                    <Badge className={statusColors[selectedOrder.status] || ""}>
                      {selectedOrder.status}
                    </Badge>
                  </div>
                  <div className="col-span-2 text-base font-bold flex justify-between pt-2 border-t">
                    <span>Total Amount:</span>
                    <span>LKR {selectedOrder.total_amount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Special Instructions */}
                {selectedOrder.special_instructions && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Special Instructions</h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      {selectedOrder.special_instructions}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between items-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const phone = selectedOrder.whatsapp_phone || selectedOrder.customer_phone;
                      navigate(`/dashboard/conversations?phone=${phone}`);
                    }}
                  >
                    <MessageSquare className="mr-1.5 h-4 w-4" /> Open Chat
                  </Button>

                  <div className="flex gap-2">
                    {statusOptions.map((st) => (
                      <Button
                        key={st.value}
                        variant={selectedOrder.status === st.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateOrderStatus(selectedOrder.id, st.value)}
                      >
                        {st.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
