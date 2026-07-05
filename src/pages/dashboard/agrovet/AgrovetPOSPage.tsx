import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Clock,
  Loader2,
  Minus,
  Plus,
  Printer,
  ScanLine,
  ShoppingCart,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { useState } from "react";

interface LookupProduct {
  id: string;
  name: string;
  barcode: string | null;
  uom: string;
  department: "AGRO" | "VET" | "GENERAL";
  category?: string;
  selling_price: number;
  tax_rate?: number;
  stock: number;
}

interface CartItem {
  productId: string;
  name: string;
  uom: string;
  price: number;
  quantity: number;
  maxQuantity: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", maximumFractionDigits: 0 }).format(value || 0);

export default function AgrovetPOSPage() {
  const { organizationId, userRole } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  // Cashier-Vet sees VET products by default; Cashier-Agro (and Owner/Accountant
  // browsing POS) see AGRO. Either can clear the filter to search all departments.
  const defaultDepartment = userRole === "cashier_vet" ? "VET" : userRole === "cashier_agro" ? "AGRO" : "";
  const [department, setDepartment] = useState<string>(defaultDepartment);
  const [query, setQuery] = useState("");
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "MOMO" | "BANK_TRANSFER" | "CREDIT" | "CARD">("CASH");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("walk-in");
  const [amountPaid, setAmountPaid] = useState("");
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);

  const { data: currentShift, isLoading: isShiftLoading } = useQuery({
    queryKey: ["agrovet-shift-current", organizationId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any }>("/api/agrovet/shifts/current");
      return res.data;
    },
    enabled: !!organizationId,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/customers");
      return res || [];
    },
    enabled: !!organizationId,
  });

  const { data: results = [], isFetching: isSearching } = useQuery({
    queryKey: ["agrovet-pos-lookup", query, department],
    queryFn: async () => {
      if (!query.trim()) return [];
      const params = new URLSearchParams({ q: query.trim() });
      if (department) params.set("department", department);
      const res = await api.get<{ success: boolean; data: LookupProduct[] }>(`/api/agrovet/pos/lookup?${params}`);
      return res.data || [];
    },
    enabled: !!organizationId && query.trim().length > 0,
  });

  const lookupBarcode = async (code: string) => {
    if (!code.trim()) return;
    try {
      const res = await api.get<{ success: boolean; data: LookupProduct[] }>(
        `/api/agrovet/pos/lookup?barcode=${encodeURIComponent(code.trim())}`
      );
      const product = (res.data || [])[0];
      if (product) {
        addToCart(product);
        success("Item Scanned", `${product.name} added to cart.`);
      } else {
        error("Not Found", "No product matches that barcode.");
      }
    } catch (err: any) {
      error("Lookup Failed", err.message || "Could not look up barcode.");
    }
    setBarcode("");
  };

  const addToCart = (product: LookupProduct) => {
    if (product.stock <= 0) {
      error("Out of Stock", `${product.name} has no available stock.`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          error("Stock Limit", "Cannot add more than available stock.");
          return prev;
        }
        return prev.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        { productId: product.id, name: product.name, uom: product.uom, price: product.selling_price, quantity: 1, maxQuantity: product.stock },
      ];
    });
  };

  const updateQuantity = (productId: string, change: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        const nextQty = item.quantity + change;
        if (nextQty > item.maxQuantity) {
          error("Stock Limit", "Maximum available stock reached.");
          return item;
        }
        return nextQty > 0 ? { ...item, quantity: nextQty } : item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const saleMutation = useMutation({
    mutationFn: async () => {
      const body: any = {
        payment_method: paymentMethod,
        items: cart.map((c) => ({ product_id: c.productId, quantity: c.quantity, unit_price: c.price })),
        client_ref: `pos-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      };
      if (currentShift?.id) body.cash_session_id = currentShift.id;
      if (selectedCustomer !== "walk-in") body.customer_id = selectedCustomer;
      if (paymentMethod !== "CREDIT" && amountPaid) body.amount_paid = Number(amountPaid);
      if (paymentMethod === "CREDIT") body.amount_paid = amountPaid ? Number(amountPaid) : 0;

      const res = await api.post<{ success: boolean; data: { sale: any; ebm: any } }>("/api/agrovet/pos/sale", body);
      return res.data;
    },
    onSuccess: (data) => {
      setReceipt(data.sale);
      setIsReceiptOpen(true);
      setCart([]);
      setAmountPaid("");
      setSelectedCustomer("walk-in");
      success("Sale Completed", `Invoice ${data.sale.invoice_number} recorded.`);
      queryClient.invalidateQueries({ queryKey: ["agrovet-shift-current"] });
      queryClient.invalidateQueries({ queryKey: ["agrovet-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err: any) => {
      error("Sale Failed", err.message || "Failed to process sale.");
    },
  });

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (paymentMethod === "CREDIT" && selectedCustomer === "walk-in") {
      error("Customer Required", "A registered customer is required for credit sales.");
      return;
    }
    saleMutation.mutate();
  };

  const hasOpenShift = !!currentShift;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-[#0aa9ad]" />
            Point of Sale
          </h1>
          <p className="text-sm text-slate-500">Search or scan products, build the sale, and check out.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <ScanLine className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Scan Barcode (Enter)"
              className="pl-9 w-56 rounded-xl border-slate-200"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") lookupBarcode(barcode);
              }}
            />
          </div>
        </div>
      </div>

      {!isShiftLoading && !hasOpenShift && (
        <Card className="border-amber-200 bg-amber-50 rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm font-semibold text-amber-800">
              No open cash shift. You can still process sales, but opening a shift first lets cash sales be tracked and reconciled. Go to Shifts to open one.
            </p>
          </CardContent>
        </Card>
      )}

      {hasOpenShift && (
        <Card className="border-emerald-200 bg-emerald-50 rounded-2xl shadow-sm">
          <CardContent className="p-3 flex items-center gap-3">
            <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
            <p className="text-xs font-bold text-emerald-800">
              Active shift since {new Date(currentShift.opened_at).toLocaleTimeString()} &middot; Shift total {formatCurrency(currentShift.totals?.grandTotal || 0)}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        <div className="space-y-4">
          <Card className="border-slate-200 shadow-sm rounded-2xl h-[calc(100vh-260px)] flex flex-col">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 rounded-t-2xl pb-4 flex-row items-center justify-between gap-3">
              <CardTitle className="text-base font-semibold">Product Search</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={department || "ALL"} onValueChange={(v) => setDepartment(v === "ALL" ? "" : v)}>
                  <SelectTrigger className="h-9 w-36 rounded-lg border-slate-200 bg-white text-sm">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Departments</SelectItem>
                    <SelectItem value="AGRO">Agro</SelectItem>
                    <SelectItem value="VET">Vet</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Search by name or barcode..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-9 w-64 rounded-lg border-slate-200 bg-white text-sm"
                />
              </div>
            </CardHeader>
            <CardContent className="p-4 overflow-y-auto flex-1 custom-scrollbar">
              {isSearching ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                </div>
              ) : query.trim().length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                  <ScanLine className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg font-semibold text-slate-600">Scan or search for a product</p>
                  <p className="text-sm">Results with live stock will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {results.map((item) => (
                    <div
                      key={item.id}
                      className={`border border-slate-200 rounded-xl p-4 hover:border-[#0aa9ad] hover:shadow-md cursor-pointer transition flex flex-col bg-white relative overflow-hidden ${item.stock <= 0 ? "opacity-50 pointer-events-none" : ""}`}
                      onClick={() => addToCart(item)}
                    >
                      <Badge variant="outline" className="w-fit mb-2 text-[10px] bg-slate-50 text-slate-500">
                        {item.department}
                      </Badge>
                      <h3 className="font-bold text-slate-900 leading-tight mb-1">{item.name}</h3>
                      <p className="text-xs text-slate-500 mb-3">{item.barcode || "No barcode"}</p>
                      <div className="mt-auto flex justify-between items-end">
                        <span className="text-lg font-black text-[#0aa9ad]">
                          {item.selling_price.toLocaleString()} <span className="text-xs text-slate-500 font-normal">RWF</span>
                        </span>
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${item.stock > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {item.stock} {item.uom}
                        </span>
                      </div>
                    </div>
                  ))}
                  {results.length === 0 && (
                    <div className="col-span-full h-full flex flex-col items-center justify-center text-slate-400 p-8">
                      <ShoppingCart className="w-12 h-12 mb-4 opacity-50" />
                      <p className="text-lg font-semibold text-slate-600">No matching products</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col h-[calc(100vh-260px)]">
          <Card className="border-slate-200 shadow-sm rounded-2xl flex-1 flex flex-col">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 rounded-t-2xl pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Current Sale</CardTitle>
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">{cart.length} items</Badge>
            </CardHeader>

            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-slate-500" />
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger className="h-9 w-full text-sm rounded-lg border-slate-200">
                    <SelectValue placeholder="Select Customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                    {customers.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <CardContent className="p-0 overflow-y-auto flex-1 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 text-center">
                  <ShoppingCart className="h-12 w-12 mb-4 text-slate-200" />
                  <p>Cart is empty</p>
                  <p className="text-xs mt-1">Scan items or click products to add</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 p-2">
                  {cart.map((item) => (
                    <div key={item.productId} className="p-3 hover:bg-slate-50 rounded-lg group">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-slate-900 text-sm line-clamp-1">{item.name}</p>
                        <p className="font-bold text-slate-900 text-sm whitespace-nowrap ml-2">
                          {(item.price * item.quantity).toLocaleString()} RWF
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                          {item.price.toLocaleString()} RWF / {item.uom}
                        </p>
                        <div className="flex items-center gap-1 border border-slate-200 rounded-md bg-white">
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-none" onClick={() => updateQuantity(item.productId, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-none" onClick={() => updateQuantity(item.productId, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeFromCart(item.productId)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>

            <div className="border-t border-slate-200 bg-slate-50/80 rounded-b-2xl p-4 space-y-4">
              <div className="flex justify-between items-center text-xl font-black text-slate-900">
                <span>Total</span>
                <span className="text-[#0aa9ad]">{formatCurrency(subtotal)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                  <SelectTrigger className="h-10 border-slate-200 font-semibold bg-white">
                    <SelectValue placeholder="Payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="MOMO">Mobile Money</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="CREDIT">Credit Sale</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder={paymentMethod === "CREDIT" ? "Amount paid now (optional)" : "Amount paid"}
                  className="h-10 border-slate-200 bg-white"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
              </div>

              <Button
                className="w-full h-12 bg-[#09111f] hover:bg-slate-800 text-white font-bold text-lg rounded-xl shadow-lg shadow-slate-900/10"
                onClick={handleCheckout}
                disabled={cart.length === 0 || saleMutation.isPending}
              >
                {saleMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Checkout & Fiscalize"}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader className="text-center pb-2 border-b border-dashed border-slate-300">
            <DialogTitle className="text-xl font-black">SALES RECEIPT</DialogTitle>
            <p className="text-xs text-slate-500">{receipt?.branch?.name || "FONI AGROVET SOLUTIONS LTD"}</p>
          </DialogHeader>
          {receipt && (
            <div className="py-4 space-y-4 font-mono text-xs text-slate-700">
              <div className="flex justify-between">
                <span>Invoice:</span>
                <span>{receipt.invoice_number}</span>
              </div>
              {receipt.ebm_invoice_number && (
                <div className="flex justify-between">
                  <span>EBM Invoice:</span>
                  <span>{receipt.ebm_invoice_number}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date(receipt.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{receipt.cashier ? `${receipt.cashier.first_name || ""} ${receipt.cashier.last_name || ""}`.trim() : "-"}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{receipt.customer?.name || "Walk-in"}</span>
              </div>
              <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-2">
                <div className="font-bold flex justify-between">
                  <span>Item</span>
                  <span>Amount</span>
                </div>
                {(receipt.items || []).map((i: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span>{i.quantity}x {(i.name || "").substring(0, 18)}</span>
                    <span>{Number(i.subtotal).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{Number(receipt.subtotal).toLocaleString()}</span>
                </div>
                {Number(receipt.discount_amount) > 0 && (
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-{Number(receipt.discount_amount).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>VAT:</span>
                  <span>{Number(receipt.vat_amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-sm">
                  <span>TOTAL (RWF):</span>
                  <span>{Number(receipt.total_amount).toLocaleString()}</span>
                </div>
                {Number(receipt.remaining_balance) > 0 && (
                  <div className="flex justify-between font-bold text-orange-600">
                    <span>Balance Due:</span>
                    <span>{Number(receipt.remaining_balance).toLocaleString()}</span>
                  </div>
                )}
              </div>
              <div className="pt-2 border-t border-dashed border-slate-300 text-center text-[10px] text-slate-500">
                <p>Payment: {receipt.payment_method}</p>
                {receipt.ebm_status && <p>EBM Status: {receipt.ebm_status}</p>}
                <p className="mt-2 font-bold">THANK YOU FOR YOUR BUSINESS</p>
              </div>
            </div>
          )}
          <DialogFooter className="sm:justify-center">
            <Button className="w-full bg-[#09111f]" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" /> Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
