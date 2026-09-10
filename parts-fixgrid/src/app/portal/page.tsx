"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Cpu,
  Boxes,
  Inbox,
  Plus,
  Settings,
  ShieldCheck,
  Building2,
  Users,
  Phone,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Sparkles,
  Search,
  Filter,
  LogOut,
  MapPin,
  Lock,
  Tag,
  Truck,
  Store,
  Receipt,
  Check,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase, type ShopInventoryItem } from "@/lib/supabase";

interface ReceivedOrder {
  id: string;
  orderReference: string;
  buyerName: string;
  buyerEmail?: string;
  buyerPhone: string;
  deliveryAddress: string;
  deliveryMode: "home_delivery" | "in_shop";
  homeDeliverySupported: boolean;
  items: Array<{
    id: string;
    name: string;
    sku?: string;
    brand?: string;
    unitPrice: number;
    quantity: number;
  }>;
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  paymentStatus: string;
  status: string;
  orderDate: string;
  created_at: string;
}

export default function PartsWorkshopPortalPage() {
  const router = useRouter();
  const { user, workshop, loading: authLoading, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<"inventory" | "orders" | "settings">("inventory");
  const [items, setItems] = useState<ShopInventoryItem[]>([]);
  const [orders, setOrders] = useState<ReceivedOrder[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Search & Filter
  const [orderSearch, setOrderSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");

  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  // Settings State
  const [homeDeliveryEnabled, setHomeDeliveryEnabled] = useState(true);
  const [courierFee, setCourierFee] = useState("150");

  useEffect(() => {
    async function loadPortalData() {
      if (!workshop?.id) {
        setLoadingData(false);
        return;
      }

      setLoadingData(true);
      try {
        // 1. Fetch Workshop Inventory Stock
        const { data: itemRows } = await supabase
          .from("shop_inventory")
          .select("*")
          .eq("fixer_id", workshop.id)
          .order("created_at", { ascending: false });

        if (itemRows) {
          setItems(itemRows as ShopInventoryItem[]);
        }

        // 2. Fetch Received Inquiries / Orders
        const res = await fetch(`/api/orders?fixerId=${workshop.id}`);
        const orderRes = await res.json();
        if (orderRes.orders) {
          setOrders(orderRes.orders);
        }
      } catch (err) {
        console.error("Error loading parts portal data:", err);
      } finally {
        setLoadingData(false);
      }
    }

    if (!authLoading) {
      loadPortalData();
    }
  }, [workshop?.id, authLoading]);

  const updateItemStock = async (itemId: string, newQty: number) => {
    setUpdatingItemId(itemId);
    try {
      const safeQty = Math.max(0, newQty);
      const { error } = await supabase
        .from("shop_inventory")
        .update({ quantity: safeQty })
        .eq("id", itemId);

      if (!error) {
        setItems(items.map((i) => (i.id === itemId ? { ...i, quantity: safeQty } : i)));
      }
    } catch (err) {
      console.error("Failed to update stock quantity:", err);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const toggleItemActive = async (itemId: string, currentActive: boolean) => {
    setUpdatingItemId(itemId);
    try {
      const { error } = await supabase
        .from("shop_inventory")
        .update({ is_active: !currentActive })
        .eq("id", itemId);

      if (!error) {
        setItems(items.map((i) => (i.id === itemId ? { ...i, is_active: !currentActive } : i)));
      }
    } catch (err) {
      console.error("Failed to toggle item active status:", err);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (orderFilter === "delivery" && ord.deliveryMode !== "home_delivery") return false;
      if (orderFilter === "pickup" && ord.deliveryMode !== "in_shop") return false;
      if (orderSearch.trim()) {
        const q = orderSearch.toLowerCase().trim();
        const matchesName = ord.buyerName?.toLowerCase().includes(q) || false;
        const matchesRef = ord.orderReference?.toLowerCase().includes(q) || false;
        const matchesPhone = ord.buyerPhone?.includes(q) || false;
        const matchesItem = ord.items?.some((i) => i.name.toLowerCase().includes(q)) || false;
        if (!matchesName && !matchesRef && !matchesPhone && !matchesItem) {
          return false;
        }
      }
      return true;
    });
  }, [orders, orderFilter, orderSearch]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-bench flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm font-mono text-steel">
          <Loader2 className="size-4 animate-spin text-signal" />
          <span>Authorizing Workshop Terminal...</span>
        </div>
      </div>
    );
  }

  if (!user || !workshop) {
    return (
      <div className="min-h-screen bg-bench flex items-center justify-center p-4">
        <div className="rounded-machined border border-hairline bg-chalk p-8 max-w-md w-full shadow-bench text-center">
          <Lock className="size-8 text-signal mx-auto mb-3" />
          <h2 className="font-display text-2xl font-bold uppercase text-enamel">
            Workshop Authentication Required
          </h2>
          <p className="mt-2 text-xs text-steel leading-relaxed">
            You must be signed in with an authorized workshop inventory profile to manage replacement components and received orders.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              href="/login?next=/portal"
              className="w-full rounded-machined bg-signal px-5 py-2.5 font-display text-xs font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-signal-lift transition-all"
            >
              Sign In to Inventory Portal &rarr;
            </Link>
            <Link
              href="/signup?next=/portal"
              className="w-full rounded-machined border border-hairline bg-bench px-5 py-2.5 font-display text-xs font-semibold uppercase tracking-wider text-enamel hover:bg-chalk transition-all"
            >
              Register Workshop Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bench text-enamel flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-hairline bg-chalk/95 backdrop-blur shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="flex size-9 items-center justify-center rounded-machined bg-enamel text-bench group-hover:bg-enamel-lift transition-colors">
                <Cpu className="size-4 text-signal" />
              </div>
              <div className="flex flex-col leading-none">
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-xl font-bold tracking-tight text-enamel uppercase">
                    FIX<span className="text-signal">GRID</span>
                  </span>
                  <span className="rounded bg-signal-wash border border-signal/20 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-signal uppercase">
                    INVENTORY PORTAL
                  </span>
                </div>
                <span className="font-mono text-[10px] text-steel-soft tracking-wider">
                  parts.vytron.me
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/list"
              className="inline-flex items-center gap-1.5 rounded-machined bg-signal px-3.5 py-2 font-display text-xs font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-signal-lift transition-all active:scale-95"
            >
              <Plus className="size-3.5 stroke-[3]" />
              <span className="hidden sm:inline">List Hardware Lot</span>
            </Link>

            <Link
              href="/"
              className="font-mono text-xs text-steel hover:text-enamel transition-colors uppercase tracking-wider hidden sm:block"
            >
              &larr; View Public Catalog
            </Link>
          </div>
        </div>
      </header>

      {/* Main Portal Dashboard with Sidebar */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Sidebar */}
          <aside className="lg:col-span-3 sticky top-24">
            <div className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench flex flex-col gap-4">
              {/* Workshop Identity Mini-Card */}
              <div className="border-b border-hairline pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-machined bg-enamel text-bench font-mono font-bold text-sm">
                    {workshop.shop_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-1">
                      <span className="font-display text-sm font-bold uppercase text-enamel truncate">
                        {workshop.shop_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-mono text-verdigris">
                      <ShieldCheck className="size-3" />
                      <span>BENCH SUPPLIER</span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-[11px] font-mono text-steel-soft truncate">
                  Supplier ID: #{workshop.id.slice(0, 8)}
                </div>
              </div>

              {/* Navigation Tabs */}
              <nav className="flex flex-col gap-1">
                <button
                  onClick={() => setActiveTab("inventory")}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-machined text-xs font-mono font-medium transition-all cursor-pointer ${
                    activeTab === "inventory"
                      ? "bg-enamel text-bench font-bold shadow-xs"
                      : "text-steel hover:bg-bench hover:text-enamel"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Boxes className="size-4" />
                    <span>Hardware Stock</span>
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      activeTab === "inventory" ? "bg-bench text-enamel" : "bg-bench text-steel"
                    }`}
                  >
                    {items.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("orders")}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-machined text-xs font-mono font-medium transition-all cursor-pointer ${
                    activeTab === "orders"
                      ? "bg-enamel text-bench font-bold shadow-xs"
                      : "text-steel hover:bg-bench hover:text-enamel"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Inbox className="size-4" />
                    <span>Orders &amp; Inquiries</span>
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      orders.length > 0
                        ? "bg-signal text-white"
                        : activeTab === "orders"
                        ? "bg-bench text-enamel"
                        : "bg-bench text-steel"
                    }`}
                  >
                    {orders.length}
                  </span>
                </button>

                <Link
                  href="/list"
                  className="flex items-center justify-between px-3 py-2.5 rounded-machined text-xs font-mono font-medium text-steel hover:bg-bench hover:text-enamel transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="size-4 text-signal" />
                    <span>List Surplus Stock</span>
                  </span>
                  <span className="text-steel-soft">&rarr;</span>
                </Link>

                <button
                  onClick={() => setActiveTab("settings")}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-machined text-xs font-mono font-medium transition-all cursor-pointer ${
                    activeTab === "settings"
                      ? "bg-enamel text-bench font-bold shadow-xs"
                      : "text-steel hover:bg-bench hover:text-enamel"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Truck className="size-4" />
                    <span>Delivery &amp; Logistics</span>
                  </span>
                </button>
              </nav>

              <div className="pt-3 border-t border-hairline">
                <button
                  onClick={async () => {
                    await signOut();
                    router.push("/");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                >
                  <LogOut className="size-3.5" />
                  <span>Workshop Sign Out</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Main Dashboard Workspace */}
          <main className="lg:col-span-9">
            {/* TAB 1: HARDWARE STOCK INVENTORY */}
            {activeTab === "inventory" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
                  <div>
                    <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-enamel">
                      Hardware Stock &amp; Inventory Manager
                    </h1>
                    <p className="text-xs text-steel mt-0.5">
                      Maintain replacement screens, battery modules, and micro-soldering IC chips listed across FixGrid.
                    </p>
                  </div>

                  <Link
                    href="/list"
                    className="inline-flex items-center gap-1.5 rounded-machined bg-signal px-4 py-2 font-display text-xs font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-signal-lift transition-all"
                  >
                    <Plus className="size-3.5 stroke-[3]" />
                    <span>List New Component</span>
                  </Link>
                </div>

                {/* Metrics Summary Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
                    <span className="font-mono text-[10px] uppercase text-steel-soft">Listed Component Lots</span>
                    <div className="font-display text-2xl font-bold text-enamel mt-1">
                      {items.length}
                    </div>
                  </div>
                  <div className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
                    <span className="font-mono text-[10px] uppercase text-steel-soft">Total Units in Inventory</span>
                    <div className="font-display text-2xl font-bold text-signal mt-1">
                      {items.reduce((sum, i) => sum + (i.quantity || 0), 0)}
                    </div>
                  </div>
                  <div className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
                    <span className="font-mono text-[10px] uppercase text-steel-soft">Orders / Inquiries Received</span>
                    <div className="font-display text-2xl font-bold text-verdigris mt-1">
                      {orders.length}
                    </div>
                  </div>
                </div>

                {/* Inventory Items List */}
                {items.length === 0 ? (
                  <div className="rounded-machined border border-hairline bg-chalk p-12 text-center shadow-bench flex flex-col items-center">
                    <Boxes className="size-8 text-steel-soft mb-3" />
                    <h3 className="font-display text-lg font-bold uppercase text-enamel">
                      No Hardware Stock Listed Yet
                    </h3>
                    <p className="text-xs text-steel mt-1 max-w-sm">
                      Your workshop has no surplus screens, IC reels, or replacement assemblies listed on parts.vytron.me.
                    </p>
                    <Link
                      href="/list"
                      className="mt-4 rounded-machined bg-signal px-5 py-2 font-display text-xs font-semibold uppercase text-white hover:bg-signal-lift transition-colors"
                    >
                      List First Hardware Component
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item) => {
                      const priceRupees = item.unit_price ? Math.round(item.unit_price / 100) : 0;
                      const isLowStock = (item.quantity || 0) <= (item.low_stock_threshold || 1);

                      return (
                        <div
                          key={item.id}
                          className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-signal-wash border border-signal/20 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-signal">
                                {item.condition}
                              </span>
                              {item.sku && (
                                <span className="font-mono text-xs text-steel-soft bg-bench border border-hairline px-1.5 py-0.5 rounded">
                                  {item.sku}
                                </span>
                              )}
                              {isLowStock && (
                                <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.2 font-mono text-[9px] text-amber-700 font-bold uppercase">
                                  Low Stock Alert
                                </span>
                              )}
                            </div>

                            <h3 className="font-display text-base font-bold uppercase text-enamel">
                              {item.name}
                            </h3>

                            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-steel">
                              <span>Brand: <strong className="text-enamel">{item.brand || "OEM Genuine"}</strong></span>
                              <span>&middot;</span>
                              <span>Price: <strong className="text-enamel">₹{priceRupees.toLocaleString("en-IN")}</strong></span>
                            </div>
                          </div>

                          {/* Stock Controls */}
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="flex items-center gap-2 font-mono text-xs">
                              <span className="text-steel-soft uppercase text-[10px]">Stock:</span>
                              <div className="flex items-center border border-hairline rounded-machined bg-bench">
                                <button
                                  type="button"
                                  disabled={updatingItemId === item.id}
                                  onClick={() => updateItemStock(item.id, (item.quantity || 0) - 1)}
                                  className="px-2 py-1 text-steel hover:text-enamel cursor-pointer font-bold"
                                >
                                  -
                                </button>
                                <span className="px-2 font-bold text-enamel">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  disabled={updatingItemId === item.id}
                                  onClick={() => updateItemStock(item.id, (item.quantity || 0) + 1)}
                                  className="px-2 py-1 text-steel hover:text-enamel cursor-pointer font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={updatingItemId === item.id}
                              onClick={() => toggleItemActive(item.id, item.is_active)}
                              className={`rounded-machined px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer ${
                                item.is_active
                                  ? "bg-bench border border-hairline text-enamel hover:bg-chalk"
                                  : "bg-signal-wash border border-signal text-signal font-bold"
                              }`}
                            >
                              {item.is_active ? "Unlist" : "Publish"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: INQUIRIES & ORDERS RECEIVED */}
            {activeTab === "orders" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-signal font-bold">
                        ORDER FULFILLMENT DESK
                      </span>
                      <span className="rounded-full bg-signal px-2 py-0.2 font-mono text-[9px] font-bold text-white">
                        {orders.length} Received
                      </span>
                    </div>
                    <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-enamel">
                      Orders &amp; Inquiries Received
                    </h1>
                    <p className="text-xs text-steel mt-0.5">
                      Fulfill courier dispatch lots and prepare bench counter reservations with advance payment verification.
                    </p>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-2.5 size-3.5 text-steel-soft" />
                    <input
                      type="text"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="Search orders by buyer, SKU, or reference..."
                      className="w-full pl-8 rounded-machined border border-hairline bg-chalk px-3 py-1.5 text-xs text-enamel placeholder:text-steel-soft focus:border-signal focus:outline-none font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {[
                      { id: "all", label: "All Orders" },
                      { id: "delivery", label: "🚚 Courier Delivery" },
                      { id: "pickup", label: "📍 Counter Pickup" },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setOrderFilter(mode.id)}
                        className={`rounded border px-2.5 py-1 text-xs font-mono transition-all cursor-pointer ${
                          orderFilter === mode.id
                            ? "bg-enamel text-bench border-enamel font-bold"
                            : "bg-chalk text-steel border-hairline hover:bg-bench"
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Orders List */}
                {filteredOrders.length === 0 ? (
                  <div className="rounded-machined border border-hairline bg-chalk p-12 text-center shadow-bench flex flex-col items-center">
                    <Inbox className="size-8 text-steel-soft mb-3" />
                    <h3 className="font-display text-lg font-bold uppercase text-enamel">
                      No Orders in this View
                    </h3>
                    <p className="text-xs text-steel mt-1 max-w-sm">
                      When repair technicians or buyers purchase parts from your catalog, their order tickets will appear here with delivery mode &amp; payment status.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredOrders.map((ord) => {
                      const cleanPhone = ord.buyerPhone?.replace(/[^0-9]/g, "") || "";
                      const isPickup = ord.deliveryMode === "in_shop";
                      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                        `Hello ${ord.buyerName}, this is ${workshop.shop_name}. Regarding your order ${ord.orderReference} for replacement hardware: your components are ${isPickup ? 'ready for counter pickup at our bench' : 'being packed for courier dispatch'}.`
                      )}`;

                      return (
                        <div
                          key={ord.id}
                          className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-hairline pb-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-enamel">
                                  {ord.orderReference || "ORD-REF"}
                                </span>
                                <span
                                  className={`rounded px-2 py-0.5 font-mono text-[9px] font-bold uppercase ${
                                    isPickup
                                      ? "bg-amber-50 border border-amber-200 text-amber-700"
                                      : "bg-verdigris-wash border border-verdigris/30 text-verdigris"
                                  }`}
                                >
                                  {isPickup ? "📍 Counter Pickup (Advance Paid)" : "🚚 Courier Dispatch (Full Escrow)"}
                                </span>
                              </div>

                              <div className="mt-1 font-display text-lg font-bold uppercase text-enamel">
                                {ord.buyerName}
                              </div>
                              <div className="font-mono text-xs text-steel">
                                Phone: {ord.buyerPhone} &middot; {new Date(ord.created_at || ord.orderDate).toLocaleDateString("en-IN")}
                              </div>
                            </div>

                            {/* Financial Summary */}
                            <div className="text-right font-mono text-xs">
                              <div className="text-steel-soft text-[10px] uppercase">Total Order Value</div>
                              <div className="text-base font-bold text-enamel">
                                ₹{ord.totalAmount?.toLocaleString("en-IN")}
                              </div>
                              {isPickup ? (
                                <div className="text-signal font-semibold text-[11px] mt-0.5">
                                  Advance Paid: ₹{ord.advancePaid?.toLocaleString("en-IN")} | Balance: ₹{ord.balanceDue?.toLocaleString("en-IN")}
                                </div>
                              ) : (
                                <div className="text-verdigris font-semibold text-[11px] mt-0.5">
                                  100% Escrow Secured
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Line Items Table */}
                          <div className="rounded-machined border border-hairline bg-bench p-3 space-y-1.5 font-mono text-xs">
                            <span className="text-[10px] uppercase text-steel-soft font-bold block mb-1">
                              Ordered Hardware Components:
                            </span>
                            {(ord.items || []).map((itm, idx) => (
                              <div key={idx} className="flex justify-between items-center text-enamel">
                                <span>
                                  {itm.quantity}x {itm.name} {itm.sku ? `(${itm.sku})` : ""}
                                </span>
                                <span className="font-bold">
                                  ₹{(itm.unitPrice * itm.quantity).toLocaleString("en-IN")}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Address details if home delivery */}
                          {!isPickup && ord.deliveryAddress && (
                            <div className="rounded-machined border border-hairline bg-bench/50 p-3 text-xs font-mono text-steel">
                              <span className="font-bold text-enamel">Courier Delivery Destination: </span>
                              {ord.deliveryAddress}
                            </div>
                          )}

                          {/* Action Footer */}
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-hairline">
                            <div className="font-mono text-xs text-steel">
                              Status: <strong className="text-enamel">{ord.status || "Pending Processing"}</strong>
                            </div>

                            <div className="flex items-center gap-2">
                              <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-machined bg-[#25D366] px-4 py-2 font-mono text-xs font-bold text-white shadow-sm hover:bg-[#1EBE5D] transition-colors"
                              >
                                <MessageSquare className="size-3.5 fill-current" />
                                <span>WhatsApp Buyer</span>
                              </a>

                              <a
                                href={`tel:${cleanPhone}`}
                                className="inline-flex items-center gap-1.5 rounded-machined border border-hairline bg-bench px-3 py-2 font-mono text-xs text-enamel hover:bg-chalk transition-colors"
                              >
                                <Phone className="size-3.5" />
                                <span>Call</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: DELIVERY & LOGISTICS SETTINGS */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                <div className="border-b border-hairline pb-4">
                  <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-enamel">
                    Delivery &amp; Logistics Configuration
                  </h1>
                  <p className="text-xs text-steel mt-0.5">
                    Configure whether your workshop bench supports doorstep courier delivery or counter pickup only.
                  </p>
                </div>

                <div className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench space-y-6 max-w-xl">
                  <div className="space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <div className="font-display text-sm font-bold uppercase text-enamel">
                          Offer Home Delivery via Courier
                        </div>
                        <p className="text-xs text-steel mt-0.5 max-w-sm">
                          When enabled, buyers can choose courier dispatch and pay the full lot price online. When disabled, buyers pay an Advance Reservation Fee to hold the stock and collect at your workshop counter.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={homeDeliveryEnabled}
                        onChange={(e) => setHomeDeliveryEnabled(e.target.checked)}
                        className="size-5 rounded text-signal focus:ring-signal"
                      />
                    </label>
                  </div>

                  {homeDeliveryEnabled && (
                    <div>
                      <label className="block font-mono text-xs font-semibold uppercase text-steel mb-1">
                        Standard Courier Dispatch Fee (INR ₹)
                      </label>
                      <input
                        type="number"
                        value={courierFee}
                        onChange={(e) => setCourierFee(e.target.value)}
                        className="w-full rounded-machined border border-hairline bg-bench/50 px-3 py-2 text-xs text-enamel font-mono font-bold"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-mono text-xs font-semibold uppercase text-steel mb-1">
                      Bench Counter Pickup Location
                    </label>
                    <input
                      type="text"
                      disabled
                      value={workshop.address || "Hardware Reclamation & Bench Depot"}
                      className="w-full rounded-machined border border-hairline bg-bench/60 px-3.5 py-2 text-sm text-enamel opacity-90 font-mono"
                    />
                  </div>

                  <div className="pt-3 border-t border-hairline flex items-center gap-2 text-xs font-mono text-verdigris">
                    <ShieldCheck className="size-4" />
                    <span>FixGrid Escrow Protection Configured &middot; Verified Bench #{workshop.id.slice(0, 8)}</span>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
