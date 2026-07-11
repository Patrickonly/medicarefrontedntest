import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Minus, Percent, Plus, Printer, ScanLine, ShoppingCart, Trash2, User as UserIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { StatCard } from "@/components/shared/StatCard";

interface CartItem {
  id: string;
  productId: string;
  batchId: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  maxQuantity: number;
}

export default function POSPage() {
  const { organizationId, user } = useAuth();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [selectedCustomer, setSelectedCustomer] = useState("walk-in");
  const [discount, setDiscount] = useState(0);
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);

  const [isNewCustomerDialogOpen, setIsNewCustomerDialogOpen] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: "", phone: "", credit_limit: 0 });

  const [searchTerm, setSearchTerm] = useState("");

  const { data: posProducts = [], isLoading: isProductsLoading } = useQuery({
    queryKey: ["pos-lookup", organizationId, searchTerm],
    queryFn: async () => {
      const qs = searchTerm ? `?q=${encodeURIComponent(searchTerm)}` : "";
      const res = await api.get<any>(`/api/agrovet/pos/lookup${qs}`);
      return res?.data || [];
    },
    enabled: !!organizationId,
    // Stock shown at the till must be trustworthy, so this overrides the
    // app-wide 1-minute staleTime/no-refetch-on-focus defaults.
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
  });

  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
    queryKey: ["categories", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/products/categories");
      return Array.isArray(res) ? res : (res?.results || res?.data || []);
    },
    enabled: !!organizationId,
  });

  const { data: customers = [], isLoading: isCustomersLoading } = useQuery({
    queryKey: ["customers", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/customers");
      const list = Array.isArray(res) ? res : (res?.results || res?.data || []);
      return list.map((c: any) => ({ ...c, name: c.full_name || c.name }));
    },
    enabled: !!organizationId,
  });

  const checkoutMutation = useMutation({
    mutationFn: async (saleData: any) => {
      const res = await api.post<any>("/api/agrovet/pos/sale", saleData);
      return res?.data || res || {};
    },
    onSuccess: (data) => {
      const sale = data.sale || data;
      setLastSale({
        ...sale,
        invoice_number: sale.ebm_invoice_number || sale.invoice_number || `INV-${Date.now().toString().slice(-6)}`,
        timestamp: sale.timestamp || new Date().toISOString(),
        items: cart.map(c => ({
          productId: c.productId,
          quantity: c.quantity,
          price: c.price,
          subtotal: c.quantity * c.price
        })),
        subtotal: subtotal,
        discount_amount: discountAmt,
        total_amount: total,
        payment_method: paymentMethod
      });
      setCart([]);
      setDiscount(0);
      setIsReceiptDialogOpen(true);

      queryClient.invalidateQueries({ queryKey: ["product-batches"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
    onError: (err: any) => {
      error("Checkout Failed", err.message || "Failed to process sale.");
    }
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = { full_name: data.name, phone: data.phone, credit_limit: data.credit_limit, organizationId };
      const res = await api.post<any>("/api/customers", payload);
      return res?.data || res || {};
    },
    onSuccess: (data) => {
      success("Customer Created", "New customer added successfully.");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      const newId = data.id || data.id?.toString();
      if (newId) setSelectedCustomer(newId);
      setIsNewCustomerDialogOpen(false);
      setNewCustomerData({ name: "", phone: "", credit_limit: 0 });
    },
    onError: (err: any) => {
      error("Failed", err.message || "Could not create customer.");
    }
  });

  // Combine posProducts batches into grid items
  const availableItems = useMemo(() => {
    const items: any[] = [];
    posProducts.forEach((p: any) => {
      if (Array.isArray(p.batches)) {
        p.batches.forEach((b: any) => {
          if (b.quantity_remaining > 0) {
            items.push({
              id: b.id, // batchId
              batchId: b.id,
              batchNumber: b.batch_number,
              productId: p.id,
              productName: p.name,
              categoryName: p.category || p.department || "General",
              barcode: p.barcode,
              quantityRemaining: b.quantity_remaining,
              sellingPrice: Number(b.selling_price) || Number(p.selling_price) || 0,
            });
          }
        });
      }
    });
    return items;
  }, [posProducts]);

  const addToCart = (item: any) => {
    const existing = cart.find(i => i.batchId === item.id);
    if (existing) {
      if (existing.quantity < item.quantityRemaining) {
        setCart(cart.map(i => i.batchId === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      } else {
        error("Stock Limit", "Cannot add more than available stock.");
      }
    } else {
      setCart([...cart, {
        id: Math.random().toString(36).substring(7),
        productId: item.productId,
        batchId: item.id,
        name: item.productName,
        category: item.categoryName,
        price: item.sellingPrice,
        quantity: 1,
        maxQuantity: item.quantityRemaining
      }]);
    }
  };



  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, change: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + change;
        if (newQty > item.maxQuantity) {
          error("Stock Limit", "Maximum available stock reached.");
          return item;
        }
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const applyDiscount = () => {
    if (discountCode === "MGR123") {
      setDiscount(10); // 10% discount
      success("Discount Approved", "10% Manager discount applied.");
      setIsDiscountDialogOpen(false);
    } else {
      error("Approval Failed", "Invalid manager code.");
    }
    setDiscountCode("");
  };

  const checkout = () => {
    if (!organizationId) {
      error("Error", "No organization selected. Please reload and try again.");
      return;
    }
    if (cart.length === 0) {
      error("Error", "Add at least one item to the cart before checking out.");
      return;
    }

    if (paymentMethod === "Credit" && selectedCustomer === "walk-in") {
      error("Customer Required", "Please select a customer for credit sales.");
      return;
    }

    // Check credit limit if credit sale
    if (paymentMethod === "Credit") {
      const cust = customers.find((c: any) => c.id === selectedCustomer);
      const currentBalance = cust?.currentBalance ?? cust?.current_balance ?? 0;
      const creditLimit = cust?.creditLimit ?? cust?.credit_limit ?? 0;

      if (cust && (currentBalance + total > creditLimit)) {
        error("Credit Limit Exceeded", `Remaining credit: ${(creditLimit - currentBalance).toLocaleString()} RWF.`);
        return;
      }
    }

    checkoutMutation.mutate({
      paymentMethod: paymentMethod.toUpperCase(),
      branchId: user?.branchId || user?.branch_id || "1",
      customerId: selectedCustomer === "walk-in" ? undefined : selectedCustomer,
      amountPaid: paymentMethod === "Credit" ? 0 : total,
      items: cart.map(c => ({
        productId: c.productId,
        batchId: c.batchId,
        quantity: c.quantity,
        price: c.price
      }))
    });
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmt = (subtotal * discount) / 100;
  const total = subtotal - discountAmt;

  const isLoading = isProductsLoading || isCategoriesLoading || isCustomersLoading;

  return (
    <div className="min-h-screen bg-muted font-sans pb-10">
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <ShoppingCart className="h-8 w-8 text-[#0aa9ad]" />
              Enterprise POS
            </h1>
            <p className="text-muted-foreground mt-1">Fast sales processing, barcode scanning & receipt printing</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            icon={ShoppingCart}
            label="Total Products Available"
            value={availableItems.length}
            colorClass="bg-[#0aa9ad] text-white"
          />
          <StatCard
            icon={ScanLine}
            label="Active Cart Items"
            value={cart.length}
            colorClass="bg-[#8b5cf6] text-white"
          />
          <StatCard
            icon={Percent}
            label="Current Discount"
            value={`${discount}%`}
            colorClass="bg-[#f59e0b] text-white"
          />
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        {/* Left Side: Products Grid */}
        <div className="space-y-4">
          <Card className="border-border shadow-sm rounded-2xl h-[calc(100vh-200px)] flex flex-col">
            <CardHeader className="border-b border-border bg-background/50 rounded-t-2xl pb-4">
              <CardTitle className="text-base font-semibold">Available Product Batches</CardTitle>
            </CardHeader>
            <CardContent className="p-4 overflow-y-auto flex-1 custom-scrollbar">
              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="border border-border rounded-xl p-4 flex flex-col bg-card">
                      <Skeleton className="h-4 w-16 mb-2 rounded-full" />
                      <Skeleton className="h-4 w-full mb-1" />
                      <Skeleton className="h-3 w-2/3 mb-3" />
                      <div className="mt-auto flex justify-between items-end">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-12 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {availableItems.map((item: any) => {
                    // Live-decreasing stock: the server only touches real
                    // stock once the sale is submitted, so until then this
                    // is client-side math - batch stock minus whatever of
                    // this exact batch is already sitting in the cart.
                    const inCart = cart.find((c) => c.batchId === item.id)?.quantity || 0;
                    const remaining = item.quantityRemaining - inCart;
                    return (
                    <div
                      key={item.id}
                      className={`border border-border rounded-xl p-4 hover:border-[#0aa9ad] hover:shadow-md cursor-pointer transition flex flex-col bg-card relative overflow-hidden ${remaining <= 0 ? "opacity-50 pointer-events-none" : ""}`}
                      onClick={() => addToCart(item)}
                    >
                      <Badge variant="outline" className="w-fit mb-2 text-[10px] bg-muted text-muted-foreground">{item.categoryName}</Badge>
                      <h3 className="font-bold text-foreground leading-tight mb-1">{item.productName}</h3>
                      <p className="text-xs text-muted-foreground mb-3">Batch: {item.batchNumber || item.batch_number}</p>
                      <div className="mt-auto flex justify-between items-end">
                        <span className="text-lg font-black text-[#0aa9ad]">{item.sellingPrice.toLocaleString()} <span className="text-xs text-muted-foreground font-normal">RWF</span></span>
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${remaining > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {remaining} left
                        </span>
                      </div>
                    </div>
                    );
                  })}
                  {!isLoading && availableItems.length === 0 && (
                    <div className="col-span-full h-full flex flex-col items-center justify-center text-muted-foreground p-8">
                      <ShoppingCart className="w-12 h-12 mb-4 opacity-50" />
                      <p className="text-lg font-semibold text-muted-foreground">No Inventory Available</p>
                      <p className="text-sm">Please add product batches in the Inventory section first.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Cart & Checkout */}
        <div className="flex flex-col h-[calc(100vh-200px)]">
          <Card className="border-border shadow-sm rounded-2xl flex-1 flex flex-col">
            <CardHeader className="border-b border-border bg-background/50 rounded-t-2xl pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Current Sale</CardTitle>
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">{cart.length} items</Badge>
            </CardHeader>

            {/* Customer Selection */}
            <div className="p-4 border-b border-border space-y-3">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger className="h-9 w-full text-sm rounded-lg border-border">
                    <SelectValue placeholder="Select Customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                    {customers.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-9 w-9 shrink-0 border-border text-muted-foreground hover:text-foreground" 
                  onClick={() => setIsNewCustomerDialogOpen(true)}
                  title="Add New Customer"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {selectedCustomer !== "walk-in" && (() => {
                const cust = customers.find((c: any) => c.id === selectedCustomer);
                if (!cust) return null;
                const limit = Number(cust.credit_limit || 0);
                const balance = Number(cust.stats?.outstanding_balance || cust.current_balance || 0);
                const available = Math.max(limit - balance, 0);
                
                return (
                  <div className="mt-2 text-xs flex justify-between items-center px-1 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-border">
                    <span className="text-muted-foreground font-medium">Credit Limit: {limit.toLocaleString()} RWF</span>
                    <span className={balance > 0 ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>
                      Remaining: {available.toLocaleString()} RWF
                    </span>
                  </div>
                );
              })()}
            </div>

            <CardContent className="p-0 overflow-y-auto flex-1 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
                  <ShoppingCart className="h-12 w-12 mb-4 text-slate-200" />
                  <p>Cart is empty</p>
                  <p className="text-xs mt-1">Scan items or click products to add</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 p-2">
                  {cart.map(item => (
                    <div key={item.id} className="p-3 hover:bg-muted rounded-lg group">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-foreground text-sm line-clamp-1">{item.name}</p>
                        <p className="font-bold text-foreground text-sm whitespace-nowrap ml-2">{(item.price * item.quantity).toLocaleString()} RWF</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{item.price.toLocaleString()} RWF each</p>
                        <div className="flex items-center gap-1 border border-border rounded-md bg-card">
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-none" onClick={() => updateQuantity(item.id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-none" onClick={() => updateQuantity(item.id, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeFromCart(item.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>

            {/* Checkout Footer */}
            <div className="border-t border-border bg-background/80 rounded-b-2xl p-4 space-y-4">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{subtotal.toLocaleString()} RWF</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount ({discount}%)</span>
                    <span>-{discountAmt.toLocaleString()} RWF</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-xl font-black text-foreground pt-2 border-t border-border">
                <span>Total</span>
                <span className="text-[#0aa9ad]">{total.toLocaleString()} RWF</span>
              </div>

              <div className="flex gap-2">
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="w-[140px] h-10 border-border font-semibold bg-card">
                    <SelectValue placeholder="Payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="MoMo">Mobile Money</SelectItem>
                    <SelectItem value="Bank">Bank Transfer</SelectItem>
                    <SelectItem value="Credit">Credit Sale</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  className="flex-1 h-10 border-border text-muted-foreground font-semibold bg-card hover:bg-muted"
                  onClick={() => setIsDiscountDialogOpen(true)}
                  disabled={cart.length === 0}
                >
                  <Percent className="w-4 h-4 mr-1" /> Disc.
                </Button>
              </div>

              {paymentMethod === 'Credit' && selectedCustomer !== 'walk-in' && (() => {
                const cust = customers.find((c: any) => c.id === selectedCustomer);
                if (!cust) return null;
                const balance = Number(cust.stats?.outstanding_balance || cust.current_balance || 0);
                const newBalance = balance + total;
                const limit = Number(cust.credit_limit || 0);
                const limitExceeded = limit > 0 && newBalance > limit;
                
                return (
                  <div className={`p-2 rounded-lg text-xs font-semibold flex flex-col gap-1 ${limitExceeded ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
                    <span>New Balance will be: {newBalance.toLocaleString()} RWF</span>
                    {limitExceeded && (
                      <span className="text-rose-600 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Warning: This exceeds the {limit.toLocaleString()} RWF credit limit!
                      </span>
                    )}
                  </div>
                );
              })()}

              <Button
                className="w-full h-12 bg-[#09111f] hover:bg-slate-800 text-white font-bold text-lg rounded-xl shadow-lg shadow-slate-900/10"
                onClick={checkout}
                disabled={cart.length === 0 || checkoutMutation.isPending}
              >
                {checkoutMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Sale & Print"}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Discount Approval Modal */}
      <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manager Discount Approval</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">Enter manager approval code to apply a 10% discount to this sale.</p>
            <Input
              type="password"
              placeholder="Approval Code (use: MGR123)"
              value={discountCode}
              onChange={e => setDiscountCode(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDiscountDialogOpen(false)}>Cancel</Button>
            <Button className="bg-[#0aa9ad]" onClick={applyDiscount}>Approve Discount</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Customer Modal */}
      <Dialog open={isNewCustomerDialogOpen} onOpenChange={setIsNewCustomerDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Input
              placeholder="Customer Name *"
              value={newCustomerData.name}
              onChange={e => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
            />
            <Input
              placeholder="Phone Number *"
              value={newCustomerData.phone}
              onChange={e => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
            />
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Credit Limit (RWF)</label>
              <Input
                type="number"
                placeholder="0"
                value={newCustomerData.credit_limit || ""}
                onChange={e => setNewCustomerData({ ...newCustomerData, credit_limit: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsNewCustomerDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-[#0aa9ad] hover:bg-[#0aa9ad]/90 text-white font-bold" 
              onClick={() => {
                if (!newCustomerData.name || !newCustomerData.phone) {
                  error("Required Fields", "Please enter name and phone.");
                  return;
                }
                createCustomerMutation.mutate(newCustomerData);
              }}
              disabled={createCustomerMutation.isPending}
            >
              {createCustomerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Modal (EBM Style) */}
      <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
        <DialogContent className="sm:max-w-[400px] p-6 font-mono text-xs">
          <div className="flex flex-col items-center justify-center border-b-2 border-dashed border-gray-400 pb-4 mb-4">
            <h2 className="text-xl font-bold tracking-widest text-center">MEDICARE ONE</h2>
            <p className="text-center mt-1">TIN: 101234567</p>
            <p className="text-center">Kigali, Rwanda</p>
            <p className="text-center">Tel: 0780000000</p>
            <h3 className="font-bold text-lg mt-3 uppercase">EBM RECEIPT</h3>
          </div>
          
          {lastSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <span className="text-gray-500">SDC Receipt:</span>
                <span className="text-right">SDC-{lastSale.invoice_number}</span>
                <span className="text-gray-500">Invoice Num:</span>
                <span className="text-right">{lastSale.invoice_number}</span>
                <span className="text-gray-500">Date/Time:</span>
                <span className="text-right">{new Date(lastSale.timestamp).toLocaleString('en-GB')}</span>
                <span className="text-gray-500">Customer TIN:</span>
                <span className="text-right">{selectedCustomer === "walk-in" ? "Walk-in" : customers.find((c: any) => c.id === selectedCustomer)?.tax_id || "N/A"}</span>
              </div>

              <div className="border-t-2 border-b-2 border-dashed border-gray-400 py-3">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="font-semibold py-1">Item</th>
                      <th className="font-semibold py-1 text-right">Qty</th>
                      <th className="font-semibold py-1 text-right">Price</th>
                      <th className="font-semibold py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastSale.items.map((i: any, idx: number) => {
                      const cartRef = cart.find(c => c.productId === i.productId || c.productId === i.product_id);
                      const name = cartRef ? cartRef.name : `Item ${i.productId?.toString().slice(0, 4)}`;
                      const price = i.price || (i.subtotal / i.quantity);
                      return (
                        <tr key={idx} className="border-b border-gray-100 last:border-0">
                          <td className="py-1 break-words pr-2 max-w-[140px] truncate">{name}</td>
                          <td className="py-1 text-right">{i.quantity}</td>
                          <td className="py-1 text-right">{price.toLocaleString()}</td>
                          <td className="py-1 text-right">{i.subtotal.toLocaleString()} A</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex justify-between">
                  <span>TOTAL A-EX:</span>
                  <span>{lastSale.subtotal.toLocaleString()}</span>
                </div>
                {lastSale.discount_amount > 0 && (
                  <div className="flex justify-between">
                    <span>DISCOUNT:</span>
                    <span>-{lastSale.discount_amount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>TOTAL TAX (A-EX):</span>
                  <span>0.00</span>
                </div>
                <div className="flex justify-between font-bold text-[14px] mt-2 border-t border-gray-300 pt-2">
                  <span>TOTAL TO PAY (RWF):</span>
                  <span>{lastSale.total_amount.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-dashed border-gray-400 text-center text-[10px] space-y-1">
                <p>Payment: {lastSale.payment_method}</p>
                <p>INTERNAL DATA: {Math.random().toString(36).substring(2, 10).toUpperCase()}-{Math.random().toString(36).substring(2, 6).toUpperCase()}</p>
                <p>RECEIPT SIGNATURE: {Math.random().toString(36).substring(2, 8).toUpperCase()}</p>
                <p className="mt-3 font-bold text-xs uppercase tracking-widest">Thank you for your business</p>
              </div>
            </div>
          )}
          
          <DialogFooter className="sm:justify-center mt-6">
            <Button className="w-full bg-[#09111f] hover:bg-gray-800 text-white font-sans" onClick={() => {
              window.print();
            }}>
              <Printer className="w-4 h-4 mr-2" /> Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

