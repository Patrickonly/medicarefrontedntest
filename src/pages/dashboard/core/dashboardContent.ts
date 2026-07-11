import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  BadgePercent,
  Banknote,
  BarChart3,
  BadgeDollarSign,
  Bell,
  BookOpen,
  Boxes,
  Building2,
  CalendarCheck2,
  ClipboardList,
  CreditCard,
  Crown,
  FileClock,
  FileText,
  Gauge,
  HeartPulse,
  LayoutDashboard,
  LineChart,
  ListChecks,
  Package,
  PiggyBank,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Stethoscope,
  Tags,
  Ticket,
  Truck,
  UserCog,
  UserPlus,
  Users,
  Wallet,
  Warehouse,
  type Icon as IconType,
} from "lucide-react";
import type { UserRole } from "@/types/models";

export type DashboardScope =
  | "super_admin"
  | "administrator"
  | "agrovet_owner"
  | "agrovet_accountant"
  | "agrovet_cashier"
  | "other";

export interface SidebarLink {
  icon: LucideIcon;
  label: string;
  path: string;
  subItems?: { label: string; path: string }[];
}

export interface SidebarGroup {
  label: string;
  items: SidebarLink[];
}

export interface SummaryCard {
  label: string;
  value: string;
  helpText: string;
  tone: "emerald" | "blue" | "amber" | "rose" | "violet" | "slate";
  icon: LucideIcon;
}

export interface ActionCard {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: "emerald" | "blue" | "amber" | "rose" | "violet" | "slate";
}

export interface MetricBlock {
  label: string;
  value: string;
  detail: string;
  progress?: number;
  tone: "emerald" | "blue" | "amber" | "rose" | "violet" | "slate";
}

export interface ListRow {
  title: string;
  detail: string;
  value?: string;
  status?: string;
  href?: string;
}

export interface DashboardViewModel {
  title: string;
  subtitle: string;
  scopeLabel: string;
  summaryCards: SummaryCard[];
  actionCards: ActionCard[];
  metrics: MetricBlock[];
  listGroups: Array<{
    title: string;
    subtitle: string;
    rows: ListRow[];
    href?: string;
  }>;
  spotlightNotes: string[];
}

const SUPER_ADMIN_LINKS: SidebarGroup[] = [
  {
    label: "Management",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: Building2, label: "Organization Management", path: "/dashboard/organizations" },
      { icon: Warehouse, label: "Branch Management", path: "/dashboard/branches" },
      { icon: Users, label: "User Management", path: "/dashboard/users" },
      { icon: UserCog, label: "Roles And Permissions", path: "/dashboard/roles-permissions" },
      { icon: Tags, label: "Organization Types", path: "/dashboard/organization-types" },
    ],
  },
  {
    label: "Financial & Billing",
    items: [
      { icon: CreditCard, label: "Subscriptions", path: "/dashboard/subscriptions" },
      { icon: Crown, label: "Organization Subscriptions", path: "/dashboard/organization-subscriptions" },
      { icon: Bell, label: "Payment Reminders", path: "/dashboard/subscriptions/reminders" },
      { icon: ShieldCheck, label: "Audit Logs", path: "/dashboard/audit-logs" },
      { icon: Ticket, label: "Support", path: "/dashboard/support" },
    ],
  },
];

const ADMIN_LINKS: SidebarGroup[] = [
  {
    label: "Sales & Transactions",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: ShoppingCart, label: "Point of Sale", path: "/dashboard/pos" },
      { icon: Receipt, label: "Sales History", path: "/dashboard/sales-history" },
    ],
  },
  {
    label: "Inventory",
    items: [
      { icon: Tags, label: "Categories", path: "/dashboard/categories" },
      { icon: Package, label: "Product Types", path: "/dashboard/product-types" },
      { icon: Boxes, label: "Inventory", path: "/dashboard/inventory" },
      { icon: Receipt, label: "Purchases", path: "/dashboard/purchase-orders" },
      { icon: Truck, label: "Suppliers", path: "/dashboard/suppliers" },
    ],
  },
  {
    label: "Financial",
    items: [
      { icon: Wallet, label: "Expenses", path: "/dashboard/expenses" },
      { icon: CreditCard, label: "Manage Credit", path: "/dashboard/credit-payments" },
      { 
        icon: BarChart3, 
        label: "Reports", 
        path: "/dashboard/reports",
        subItems: [
          { label: "Sales Report", path: "/dashboard/reports" },
          { label: "Monthly Report", path: "/dashboard/reports/monthly" },
        ]
      },
    ],
  },
  {
    label: "Management",
    items: [
      { icon: Users, label: "Users", path: "/dashboard/users" },
      { icon: Users, label: "Customers", path: "/dashboard/customers" },
      { icon: CalendarCheck2, label: "Shift Management", path: "/dashboard/shifts" },
      { icon: Building2, label: "Settings & Profile", path: "/dashboard/settings" },
      { icon: Crown, label: "My Subscription", path: "/dashboard/my-subscription" },
      { icon: Ticket, label: "Support", path: "/dashboard/support" },
    ],
  },
];

const AGROVET_OWNER_LINKS: SidebarGroup[] = [
  {
    label: "Sales & Transactions",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: ShoppingCart, label: "POS", path: "/dashboard/agrovet/pos" },
      { icon: Receipt, label: "Sales History", path: "/dashboard/sales-history" },
      { icon: BadgePercent, label: "Discounts", path: "/dashboard/agrovet/discounts" },
    ],
  },
  {
    label: "Inventory",
    items: [
      { icon: Boxes, label: "Inventory", path: "/dashboard/inventory" },
      { icon: ClipboardList, label: "Purchasing (GRN)", path: "/dashboard/agrovet/purchasing" },
      { icon: Truck, label: "Suppliers", path: "/dashboard/suppliers" },
    ],
  },
  {
    label: "Financial",
    items: [
      { icon: Banknote, label: "Payables", path: "/dashboard/agrovet/payables" },
      { icon: BookOpen, label: "Accounting", path: "/dashboard/agrovet/accounting" },
      { icon: CreditCard, label: "Customer Credit", path: "/dashboard/agrovet/credit" },
      { icon: Gauge, label: "KPI", path: "/dashboard/agrovet/kpi" },
    ],
  },
  {
    label: "Management",
    items: [
      { icon: CalendarCheck2, label: "Shifts", path: "/dashboard/agrovet/shifts" },
      { icon: Users, label: "Customers", path: "/dashboard/customers" },
      { icon: Users, label: "Users", path: "/dashboard/users" },
      { icon: Bell, label: "Alerts", path: "/dashboard/agrovet/alerts" },
      { icon: ShieldCheck, label: "Audit Logs", path: "/dashboard/agrovet/audit-logs" },
      { icon: Crown, label: "My Subscription", path: "/dashboard/my-subscription" },
      { icon: Ticket, label: "Support", path: "/dashboard/support" },
    ],
  },
];

const AGROVET_ACCOUNTANT_LINKS: SidebarGroup[] = [
  {
    label: "Sales & Transactions",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: BadgePercent, label: "Discounts", path: "/dashboard/agrovet/discounts" },
    ],
  },
  {
    label: "Financial",
    items: [
      { icon: ClipboardList, label: "Purchasing (GRN)", path: "/dashboard/agrovet/purchasing" },
      { icon: Banknote, label: "Payables", path: "/dashboard/agrovet/payables" },
      { icon: BookOpen, label: "Accounting", path: "/dashboard/agrovet/accounting" },
      { icon: CreditCard, label: "Customer Credit", path: "/dashboard/agrovet/credit" },
    ],
  },
  {
    label: "Management",
    items: [
      { icon: Bell, label: "Alerts", path: "/dashboard/agrovet/alerts" },
      { icon: Ticket, label: "Support", path: "/dashboard/support" },
    ],
  },
];

const AGROVET_CASHIER_LINKS: SidebarGroup[] = [
  {
    label: "Sales & Transactions",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: ShoppingCart, label: "POS", path: "/dashboard/agrovet/pos" },
      { icon: Receipt, label: "Sales History", path: "/dashboard/sales-history" },
      { icon: BadgePercent, label: "Discounts", path: "/dashboard/agrovet/discounts" },
    ],
  },
  {
    label: "Management",
    items: [
      { icon: CalendarCheck2, label: "Shifts", path: "/dashboard/agrovet/shifts" },
      { icon: Ticket, label: "Support", path: "/dashboard/support" },
    ],
  },
];

const toneIconMap: Record<SummaryCard["tone"], string> = {
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  slate: "bg-muted text-slate-700 border-border",
};

export const getToneClass = (tone: SummaryCard["tone"]) => toneIconMap[tone];

export const getDashboardScope = (role?: UserRole | null, roleId?: number, isAgrovetOrg?: boolean): DashboardScope => {
  const isSuperAdmin = roleId === 9 || role === "super_admin";
  if (isSuperAdmin) return "super_admin";

  // Agrovet tenants get their own scope per role, distinct from the generic
  // administrator/other buckets below - checked before those so an agrovet
  // Owner (whose role also loosely resembles "admin") doesn't fall through
  // to the wrong (non-agrovet) dashboard/sidebar.
  if (isAgrovetOrg) {
    if (roleId === 13 || role === "owner") return "agrovet_owner";
    if (roleId === 14 || role === "accountant") return "agrovet_accountant";
    if (roleId === 15 || roleId === 16 || role === "cashier_agro" || role === "cashier_vet") return "agrovet_cashier";
  }

  const isAdmin =
    roleId === 2 ||
    ["admin", "org_owner", "director", "medical_director"].includes(role || "");

  if (isAdmin) return "administrator";

  return "other";
};

export const getSidebarSections = (scope: DashboardScope): SidebarGroup[] => {
  if (scope === "super_admin") return SUPER_ADMIN_LINKS;
  if (scope === "administrator") return ADMIN_LINKS;
  if (scope === "agrovet_owner") return AGROVET_OWNER_LINKS;
  if (scope === "agrovet_accountant") return AGROVET_ACCOUNTANT_LINKS;
  if (scope === "agrovet_cashier") return AGROVET_CASHIER_LINKS;

  return [
    {
      label: "Workspace",
      items: [
        { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
        { icon: ShoppingCart, label: "Point of Sale", path: "/dashboard/pos" },
        { icon: Receipt, label: "Sales History", path: "/dashboard/sales-history" },
        { icon: Ticket, label: "Support", path: "/dashboard/support" },
        { icon: Users, label: "Customers", path: "/dashboard/customers" },
      ],
    },
  ];
};

const SUPER_ADMIN_VIEW: DashboardViewModel = {
  title: "Super Admin Dashboard",
  subtitle: "Platform-wide visibility across all organizations, branches, users, subscriptions, and support workflows.",
  scopeLabel: "Global platform control",
  summaryCards: [
    { label: "Total organizations", value: "128", helpText: "12 added this month", tone: "blue", icon: Building2 },
    { label: "Active organizations", value: "119", helpText: "92.9% live on platform", tone: "emerald", icon: HeartPulse },
    { label: "Pending approvals", value: "9", helpText: "Organizations awaiting review", tone: "amber", icon: ListChecks },
    { label: "Total branches", value: "486", helpText: "Across the platform", tone: "violet", icon: Warehouse },
    { label: "Total users", value: "2,741", helpText: "84 added today", tone: "slate", icon: Users },
    { label: "Platform revenue", value: "RWF 184.6M", helpText: "Current billing total", tone: "blue", icon: Banknote },
    { label: "Open support tickets", value: "23", helpText: "5 high priority", tone: "rose", icon: Ticket },
    { label: "Recent audit events", value: "152", helpText: "Last 24 hours", tone: "slate", icon: FileClock },
  ],
  actionCards: [
    { label: "Organization approval queue", description: "Review new organizations and move them through approval safely.", href: "/dashboard/organizations", icon: Building2, tone: "blue" },
    { label: "Payment approval queue", description: "Approve or reject incoming payments and reconciliations.", href: "/dashboard/payments", icon: CreditCard, tone: "amber" },
    { label: "Discount rules", description: "Manage global discount policies and platform-wide exceptions.", href: "/dashboard/discounts", icon: Ticket, tone: "violet" },
    { label: "Global organization management", description: "Inspect and manage any organization in the platform.", href: "/dashboard/organizations", icon: Building2, tone: "emerald" },
    { label: "Global branch management", description: "Review branches, ownership, and operational status.", href: "/dashboard/branches", icon: Warehouse, tone: "amber" },
    { label: "Role and permission management", description: "Control who can access each platform capability.", href: "/dashboard/roles-permissions", icon: UserCog, tone: "rose" },
    { label: "Audit logs and login history", description: "Trace actions, sessions, and privileged activity.", href: "/dashboard/audit-logs", icon: ShieldCheck, tone: "slate" },
    { label: "Support ticket monitoring", description: "Keep an eye on critical platform issues and SLAs.", href: "/dashboard/support", icon: Ticket, tone: "violet" },
  ],
  metrics: [
    { label: "Revenue by organization", value: "RWF 91.4M", detail: "Top 5 orgs contribute 67% of revenue", progress: 67, tone: "blue" },
    { label: "Revenue by branch", value: "RWF 42.8M", detail: "Branch performance is growing steadily", progress: 58, tone: "emerald" },
    { label: "Payment status", value: "92% Settled", detail: "Reconciliation backlog remains low", progress: 92, tone: "amber" },
    { label: "User activity trends", value: "+18%", detail: "Platform usage increased over the last 7 days", progress: 74, tone: "rose" },
    { label: "System-wide alerts", value: "3 Critical", detail: "Focus on service and billing exceptions", progress: 21, tone: "slate" },
  ],
  listGroups: [
    {
      title: "Recently created organizations",
      subtitle: "Newest platform signups and onboarded accounts",
      rows: [
        { title: "PrimeCare Hospital", detail: "Created 2 hours ago", status: "Pending" },
        { title: "MediLink Clinic", detail: "Created 6 hours ago", status: "Active" },
        { title: "Wellness Pharmacy", detail: "Created yesterday", status: "Active" },
      ],
    },
    {
      title: "Pending approvals",
      subtitle: "Organizations and payments needing action",
      rows: [
        { title: "Kigali Specialty Center", detail: "Organization approval", status: "Pending" },
        { title: "Invoice #P-2041", detail: "Payment review", status: "Pending" },
      ],
    },
    {
      title: "Recent payments",
      subtitle: "Latest platform billing and settlement activity",
      rows: [
        { title: "RWF 8.4M", detail: "PrimeCare Hospital", status: "Settled" },
        { title: "RWF 2.1M", detail: "Wellness Pharmacy", status: "Pending" },
        { title: "RWF 1.6M", detail: "MediLink Clinic", status: "Overdue" },
      ],
    },
    {
      title: "Recent audit logs",
      subtitle: "Security and governance events from across the platform",
      rows: [
        { title: "Role updated", detail: "Super Admin assigned to user #1842", status: "High" },
        { title: "Subscription renewed", detail: "Gold plan renewed for 12 months", status: "Info" },
        { title: "Branch created", detail: "New branch added in Nyamirambo", status: "Info" },
      ],
    },
    {
      title: "Top active branches",
      subtitle: "Branches with the highest platform usage",
      rows: [
        { title: "Kigali Central", detail: "1,204 actions today", status: "Top" },
        { title: "Kicukiro Main", detail: "892 actions today", status: "Top" },
        { title: "Gisenyi Branch", detail: "621 actions today", status: "Top" },
      ],
    },
    {
      title: "Top organizations by revenue",
      subtitle: "Highest earning organizations this cycle",
      rows: [
        { title: "PrimeCare Hospital", detail: "RWF 22.9M", status: "1" },
        { title: "MediLink Clinic", detail: "RWF 19.7M", status: "2" },
        { title: "Wellness Pharmacy", detail: "RWF 17.3M", status: "3" },
      ],
    },
  ],
  spotlightNotes: [
    "Super Admin access is intentionally unrestricted so every organization, branch, and user can be inspected.",
    "Approval queues and audit history are surfaced first to keep governance decisions quick and traceable.",
    "If live global API data is unavailable, the dashboard falls back to this structured view without breaking navigation.",
  ],
};

const ADMIN_VIEW: DashboardViewModel = {
  title: "Administrator Dashboard",
  subtitle: "Organization-scoped operations, financial performance, inventory health, and team activity.",
  scopeLabel: "Organization control center",
  summaryCards: [
    { label: "Total revenue", value: "RWF 34.2M", helpText: "This month", tone: "blue", icon: Banknote },
    { label: "Total expenses", value: "RWF 11.4M", helpText: "Vendor and operational spend", tone: "rose", icon: FileText },
    { label: "Total purchases", value: "RWF 18.9M", helpText: "Purchase order value", tone: "amber", icon: Receipt },
    { label: "Total credit exposure", value: "RWF 7.8M", helpText: "Customer balances outstanding", tone: "violet", icon: BadgeDollarSign },
    { label: "Total stock value", value: "RWF 26.7M", helpText: "Inventory at cost", tone: "emerald", icon: Boxes },
    { label: "Net cash flow", value: "RWF 13.8M", helpText: "Revenue minus spend", tone: "slate", icon: LineChart },
    { label: "Sales today", value: "RWF 2.1M", helpText: "94 transactions", tone: "emerald", icon: ShoppingCart },
    { label: "Purchases today", value: "RWF 840K", helpText: "4 purchase orders", tone: "amber", icon: Truck },
    { label: "Low stock items", value: "18", helpText: "Needs reorder attention", tone: "rose", icon: AlertTriangle },
    { label: "Expiring stock items", value: "11", helpText: "Within 30 days", tone: "violet", icon: Package },
  ],
  actionCards: [
    { label: "Recent sales", description: "Review the latest invoices and daily checkout activity.", href: "/dashboard/pos", icon: ShoppingCart, tone: "emerald" },
    { label: "Recent purchases", description: "Track supplier orders and goods received.", href: "/dashboard/purchase-orders", icon: Receipt, tone: "amber" },
    { label: "Shift Management", description: "Open and close tills with full cash control.", href: "/dashboard/shifts", icon: CalendarCheck2, tone: "blue" },
    { label: "Branch performance", description: "Compare sales and operational output by branch.", href: "/dashboard/reports", icon: BarChart3, tone: "violet" },
    { label: "Staff performance", description: "Review productivity and workload by team member.", href: "/dashboard/users", icon: Users, tone: "slate" },
    { label: "Inventory alerts", description: "Spot low stock, expiring stock, and adjustment events.", href: "/dashboard/inventory", icon: Boxes, tone: "rose" },
    { label: "Reorder suggestions", description: "See what should be reordered next and why.", href: "/dashboard/inventory", icon: Warehouse, tone: "emerald" },
    { label: "Customer balances", description: "Follow credit exposure and payment follow-up.", href: "/dashboard/customers", icon: BadgeDollarSign, tone: "amber" },
    { label: "Supplier performance", description: "Check lead times, reliability, and fulfillment.", href: "/dashboard/suppliers", icon: Truck, tone: "violet" },
    { label: "Organization support", description: "Monitor support tickets that affect daily operations.", href: "/dashboard/support", icon: Ticket, tone: "blue" },
  ],
  metrics: [
    { label: "Branch-wise sales performance", value: "3 active branches", detail: "Kigali Central leads sales this week", progress: 81, tone: "emerald" },
    { label: "Branch-wise stock health", value: "87% Healthy", detail: "Low stock items are concentrated in two branches", progress: 87, tone: "blue" },
    { label: "Low-stock products", value: "18 items", detail: "7 are urgent reorder candidates", progress: 36, tone: "rose" },
    { label: "Expiry warnings", value: "11 items", detail: "Most items expire within 21 days", progress: 24, tone: "amber" },
    { label: "Transfer activity", value: "12 transfers", detail: "Internal movement remains steady", progress: 63, tone: "violet" },
    { label: "Stock adjustments", value: "4 today", detail: "Review for shrinkage or reconciliation", progress: 41, tone: "slate" },
  ],
  listGroups: [
    {
      title: "Recent sales",
      subtitle: "Latest customer transactions",
      rows: [
        { title: "INV-2041", detail: "Walk-in customer", value: "RWF 42,000", status: "Paid" },
        { title: "INV-2040", detail: "Insurance billing", value: "RWF 128,500", status: "Pending" },
        { title: "INV-2039", detail: "Credit customer", value: "RWF 56,100", status: "Partial" },
      ],
    },
    {
      title: "Recent purchases",
      subtitle: "Incoming stock and procurement flow",
      rows: [
        { title: "PO-8021", detail: "MedSupplies Ltd", value: "RWF 780,000", status: "Received" },
        { title: "PO-8020", detail: "MediWholesalers", value: "RWF 420,000", status: "Open" },
        { title: "PO-8019", detail: "CarePlus Pharma", value: "RWF 310,000", status: "Overdue" },
      ],
    },
    {
      title: "Inventory alerts",
      subtitle: "Products requiring immediate attention",
      rows: [
        { title: "Amoxicillin 500mg", detail: "Low stock at Kigali Central", status: "Low Stock" },
        { title: "Glucose strips", detail: "Stock expiring in 18 days", status: "Expiring" },
        { title: "Surgical gloves", detail: "Reorder recommended today", status: "Reorder" },
      ],
    },
    {
      title: "Customer balances",
      subtitle: "Outstanding credit exposure",
      rows: [
        { title: "Alpha Health", detail: "Balance due in 5 days", value: "RWF 1.4M", status: "Overdue" },
        { title: "Unity Clinic", detail: "Partial payment received", value: "RWF 820K", status: "Partial" },
        { title: "Bright Pharmacy", detail: "Current account", value: "RWF 300K", status: "Open" },
      ],
    },
    {
      title: "Supplier performance",
      subtitle: "Fulfillment and reliability snapshot",
      rows: [
        { title: "MediWholesalers", detail: "98% on-time delivery", status: "Excellent" },
        { title: "CarePlus Pharma", detail: "92% on-time delivery", status: "Good" },
        { title: "HealthSource Ltd", detail: "2 delayed orders", status: "Watch" },
      ],
    },
    {
      title: "Support tickets",
      subtitle: "Open tickets for the organization",
      rows: [
        { title: "POS printer failure", detail: "Branch: Kigali Central", status: "Urgent" },
        { title: "Inventory sync issue", detail: "Branch: Kicukiro", status: "Pending" },
        { title: "Credit balance review", detail: "Branch: Gisenyi", status: "Open" },
      ],
    },
  ],
  spotlightNotes: [
    "Administrator data is automatically scoped to the current organization and its branches.",
    "Operational cards are arranged to keep sales, stock, and cash control visible first.",
    "All lists can drill down into the existing sales, inventory, purchases, customers, and reports routes.",
  ],
};

export const getDashboardViewModel = (scope: DashboardScope): DashboardViewModel => {
  if (scope === "super_admin") return SUPER_ADMIN_VIEW;
  if (scope === "administrator") return ADMIN_VIEW;
  return ADMIN_VIEW;
};

