import type {
  UUID,
  ISO8601,
  User,
  Organization,
  Subscription,
  TempUser,
  OrganizationType,
  UserRole,
  BillingCycle,
  PaymentMethod,
  InventoryItem,
  Address,
} from "@/types/models";

// Generate a simple UUID
const generateId = (): UUID =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const now = (): ISO8601 => new Date().toISOString();

// LocalStorage keys
const STORAGE_KEYS = {
  USERS: "medicare_users",
  ORGANIZATIONS: "medicare_organizations",
  SUBSCRIPTIONS: "medicare_subscriptions",
  TEMP_USERS: "medicare_temp_users",
  SESSION: "medicare_session",
  INVENTORY_ITEMS: "medicare_inventory_items",
  CUSTOMERS: "medicare_customers",
  SUPPLIERS: "medicare_suppliers",
  SALES: "medicare_sales",
  PURCHASE_ORDERS: "medicare_purchase_orders",
  EXPENSES: "medicare_expenses",
  
  // NEW SCALABLE SCHEMA KEYS
  ROLES: "medicare_roles",
  PERMISSIONS: "medicare_permissions",
  ROLE_PERMISSIONS: "medicare_role_permissions",
  SHIFTS: "medicare_shifts",
  PRODUCT_TYPES: "medicare_product_types",
  CATEGORIES: "medicare_categories",
  PRODUCTS: "medicare_products",
  PRODUCT_BATCHES: "medicare_product_batches",
  MOVEMENT_TYPES: "medicare_movement_types",
  INVENTORY_MOVEMENTS: "medicare_inventory_movements",
  GOODS_RECEIVED_NOTES: "medicare_goods_received_notes",
  CREDIT_PAYMENTS: "medicare_credit_payments",
  SALE_ITEMS: "medicare_sale_items",
  DISCOUNT_REQUESTS: "medicare_discount_requests",
  CASHBOOK: "medicare_cashbook",
  AUDIT_LOGS: "medicare_audit_logs",
} as const;

// Helper to get/set localStorage
const getFromStorage = <T>(key: string): T[] => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  } catch {
    return [];
  }
};

const setToStorage = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// --- NEW SCHEMAS ---

export interface Shift {
  id: UUID;
  organization_id: UUID;
  user_id: UUID;
  start_time: ISO8601;
  end_time?: ISO8601;
  starting_cash: number;
  closing_cash?: number;
  status: "Open" | "Closed";
}

export interface ProductType {
  id: UUID;
  organization_id: UUID;
  name: string;
}

export interface Category {
  id: UUID;
  organization_id: UUID;
  product_type_id: UUID;
  name: string;
}

export interface Product {
  id: UUID;
  organization_id: UUID;
  category_id: UUID;
  name: string;
  barcode?: string;
  unit_of_measure: string;
  reorder_level: number;
  is_active: boolean;
}

export interface ProductBatch {
  id: UUID;
  organization_id: UUID;
  product_id: UUID;
  batch_number: string;
  expiry_date: string;
  quantity_remaining: number;
  unit_cost: number;
  selling_price: number;
  goods_received_note_id?: UUID;
}

export interface MovementType {
  id: UUID;
  organization_id: UUID;
  name: string;
}

export interface InventoryMovement {
  id: UUID;
  organization_id: UUID;
  product_id: UUID;
  batch_id: UUID;
  movement_type_id: UUID;
  quantity: number;
  reference_id?: string;
  user_id: UUID;
  timestamp: ISO8601;
}

export interface GoodsReceivedNote {
  id: UUID;
  organization_id: UUID;
  purchase_order_id: UUID;
  supplier_id: UUID;
  received_by: UUID;
  received_date: ISO8601;
}

export interface CreditPayment {
  id: UUID;
  organization_id: UUID;
  customer_id: UUID;
  amount_paid: number;
  payment_method: string;
  received_by: UUID;
  date: ISO8601;
}

export interface DiscountRequest {
  id: UUID;
  organization_id: UUID;
  sale_id: UUID;
  requested_by: UUID;
  approved_by?: UUID;
  amount: number;
  status: "Pending" | "Approved" | "Rejected";
}

export interface Cashbook {
  id: UUID;
  organization_id: UUID;
  transaction_type: "IN" | "OUT";
  category: string;
  amount: number;
  reference_id?: string;
  description?: string;
  date: ISO8601;
}

export interface AuditLog {
  id: UUID;
  organization_id: UUID;
  user_id: UUID;
  action: string;
  table_affected: string;
  record_id: string;
  old_data?: string;
  new_data?: string;
  timestamp: ISO8601;
}

// Legacy interfaces modified to match the new structure
export interface Customer {
  id: UUID;
  organization_id: UUID;
  name: string;
  phone?: string;
  credit_limit: number;
  current_balance: number;
}

export interface Supplier {
  id: UUID;
  organization_id: UUID;
  name: string;
  contact_info?: string;
  payment_terms?: string;
  outstanding_balance: number;
}

export interface Sale {
  id: UUID;
  organization_id: UUID;
  shift_id?: UUID;
  customer_id?: UUID;
  subtotal: number;
  discount_amount: number;
  vat_amount: number;
  total_amount: number;
  payment_method: string;
  ebm_receipt_no?: string;
  status: string;
  timestamp: ISO8601;
}

export interface SaleItem {
  id: UUID;
  organization_id: UUID;
  sale_id: UUID;
  product_id: UUID;
  batch_id: UUID;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface PurchaseOrder {
  id: UUID;
  organization_id: UUID;
  supplier_id: UUID;
  status: string;
  total_amount: number;
  created_by: UUID;
  created_at: ISO8601;
}

export interface PurchaseOrderItem {
  id: UUID;
  organization_id: UUID;
  purchase_order_id: UUID;
  product_id: UUID;
  expected_quantity: number;
  unit_price: number;
}

// Generate a helper factory for boilerplate generic CRUD operations
const createEntityMethods = <T extends { id: UUID; organization_id?: UUID }>(storageKey: string) => {
  return {
    getAll: () => getFromStorage<T>(storageKey),
    getById: (id: UUID) => getFromStorage<T>(storageKey).find((item) => item.id === id),
    getByOrganizationId: (orgId: UUID) => getFromStorage<T>(storageKey).filter((item) => item.organization_id === orgId),
    create: (data: Omit<T, "id">) => {
      const item = { ...data, id: generateId() } as unknown as T;
      const items = getFromStorage<T>(storageKey);
      items.push(item);
      setToStorage(storageKey, items);
      return item;
    },
    update: (id: UUID, updates: Partial<T>) => {
      const items = getFromStorage<T>(storageKey);
      const index = items.findIndex((item) => item.id === id);
      if (index !== -1) {
        items[index] = { ...items[index], ...updates };
        setToStorage(storageKey, items);
        return items[index];
      }
      return null;
    },
    delete: (id: UUID) => {
      const items = getFromStorage<T>(storageKey);
      const filtered = items.filter((item) => item.id !== id);
      setToStorage(storageKey, filtered);
    },
  };
};

export const localDB = {
  // Temp Users (Special Case due to logic)
  tempUsers: {
    ...createEntityMethods<TempUser>(STORAGE_KEYS.TEMP_USERS),
    create: (data: Omit<TempUser, "id" | "otp" | "otp_expires_at" | "subscription_purchased">) => {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const tempUser: TempUser = {
        ...data,
        id: generateId(),
        otp,
        otp_expires_at: otpExpiresAt,
        subscription_purchased: false,
      };
      const tempUsers = getFromStorage<TempUser>(STORAGE_KEYS.TEMP_USERS);
      tempUsers.push(tempUser);
      setToStorage(STORAGE_KEYS.TEMP_USERS, tempUsers);
      return tempUser;
    },
    getByEmail: (email: string) => getFromStorage<TempUser>(STORAGE_KEYS.TEMP_USERS).find((u) => u.email === email),
  },

  // Organizations
  organizations: {
    ...createEntityMethods<Organization>(STORAGE_KEYS.ORGANIZATIONS),
    create: (data: Omit<Organization, "id" | "created_at" | "updated_at">) => {
      const org: Organization = { ...data, id: generateId(), created_at: now(), updated_at: now() };
      const orgs = getFromStorage<Organization>(STORAGE_KEYS.ORGANIZATIONS);
      orgs.push(org);
      setToStorage(STORAGE_KEYS.ORGANIZATIONS, orgs);
      return org;
    },
  },

  users: {
    ...createEntityMethods<User>(STORAGE_KEYS.USERS),
    getByEmail: (email: string) => getFromStorage<User>(STORAGE_KEYS.USERS).find((u) => u.email === email),
  },
  
  subscriptions: createEntityMethods<Subscription>(STORAGE_KEYS.SUBSCRIPTIONS),
  
  // LEGACY
  inventoryItems: createEntityMethods<InventoryItem>(STORAGE_KEYS.INVENTORY_ITEMS),
  expenses: createEntityMethods<any>(STORAGE_KEYS.EXPENSES),

  // SCALABLE SCHEMA
  customers: createEntityMethods<Customer>(STORAGE_KEYS.CUSTOMERS),
  suppliers: createEntityMethods<Supplier>(STORAGE_KEYS.SUPPLIERS),
  sales: createEntityMethods<Sale>(STORAGE_KEYS.SALES),
  saleItems: createEntityMethods<SaleItem>(STORAGE_KEYS.SALE_ITEMS),
  purchaseOrders: createEntityMethods<PurchaseOrder>(STORAGE_KEYS.PURCHASE_ORDERS),
  purchaseOrderItems: createEntityMethods<PurchaseOrderItem>("medicare_purchase_order_items"),
  
  shifts: createEntityMethods<Shift>(STORAGE_KEYS.SHIFTS),
  productTypes: createEntityMethods<ProductType>(STORAGE_KEYS.PRODUCT_TYPES),
  categories: createEntityMethods<Category>(STORAGE_KEYS.CATEGORIES),
  products: createEntityMethods<Product>(STORAGE_KEYS.PRODUCTS),
  productBatches: createEntityMethods<ProductBatch>(STORAGE_KEYS.PRODUCT_BATCHES),
  movementTypes: createEntityMethods<MovementType>(STORAGE_KEYS.MOVEMENT_TYPES),
  inventoryMovements: createEntityMethods<InventoryMovement>(STORAGE_KEYS.INVENTORY_MOVEMENTS),
  goodsReceivedNotes: createEntityMethods<GoodsReceivedNote>(STORAGE_KEYS.GOODS_RECEIVED_NOTES),
  creditPayments: createEntityMethods<CreditPayment>(STORAGE_KEYS.CREDIT_PAYMENTS),
  discountRequests: createEntityMethods<DiscountRequest>(STORAGE_KEYS.DISCOUNT_REQUESTS),
  cashbook: createEntityMethods<Cashbook>(STORAGE_KEYS.CASHBOOK),
  auditLogs: createEntityMethods<AuditLog>(STORAGE_KEYS.AUDIT_LOGS),

  // --- Session ---
  session: {
    get: () => {
      try {
        const item = localStorage.getItem(STORAGE_KEYS.SESSION);
        return item ? JSON.parse(item) : null;
      } catch {
        return null;
      }
    },
    set: (data: { userId: UUID; organizationId: UUID; userRole: UserRole }) => {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(data));
    },
    clear: () => {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    },
  },

  // --- Initialize Demo Data ---
  initDemoData: (organizationId: UUID) => {
    // Check if data already exists
    const existingTypes = getFromStorage<ProductType>(STORAGE_KEYS.PRODUCT_TYPES);
    if (existingTypes.some(t => t.organization_id === organizationId)) return;

    // 1. Movement Types
    const moveTypes = [
      { id: generateId(), organization_id: organizationId, name: "Stock In (GRN)" },
      { id: generateId(), organization_id: organizationId, name: "Stock Out (Sale)" },
      { id: generateId(), organization_id: organizationId, name: "Adjustment (Loss)" }
    ];
    setToStorage(STORAGE_KEYS.MOVEMENT_TYPES, [...getFromStorage(STORAGE_KEYS.MOVEMENT_TYPES), ...moveTypes]);

    // 2. Product Types
    const ptAgro = { id: generateId(), organization_id: organizationId, name: "Agro Inputs" };
    const ptVet = { id: generateId(), organization_id: organizationId, name: "Veterinary Medicine" };
    setToStorage(STORAGE_KEYS.PRODUCT_TYPES, [...getFromStorage(STORAGE_KEYS.PRODUCT_TYPES), ptAgro, ptVet]);

    // 3. Categories
    const catFert = { id: generateId(), organization_id: organizationId, product_type_id: ptAgro.id, name: "Fertilizers" };
    const catSeed = { id: generateId(), organization_id: organizationId, product_type_id: ptAgro.id, name: "Seeds" };
    const catAnti = { id: generateId(), organization_id: organizationId, product_type_id: ptVet.id, name: "Antibiotics" };
    setToStorage(STORAGE_KEYS.CATEGORIES, [...getFromStorage(STORAGE_KEYS.CATEGORIES), catFert, catSeed, catAnti]);

    // 4. Products
    const prod1 = { id: generateId(), organization_id: organizationId, category_id: catFert.id, name: "DAP Fertilizer 50kg", barcode: "123456789", unit_of_measure: "Bag", reorder_level: 20, is_active: true };
    const prod2 = { id: generateId(), organization_id: organizationId, category_id: catSeed.id, name: "Maize Seeds 2kg", barcode: "987654321", unit_of_measure: "Packet", reorder_level: 50, is_active: true };
    const prod3 = { id: generateId(), organization_id: organizationId, category_id: catAnti.id, name: "Amoxil 500mg", barcode: "555555555", unit_of_measure: "Box", reorder_level: 10, is_active: true };
    setToStorage(STORAGE_KEYS.PRODUCTS, [...getFromStorage(STORAGE_KEYS.PRODUCTS), prod1, prod2, prod3]);

    // 5. Suppliers
    const sup1 = { id: generateId(), organization_id: organizationId, name: "Kigali Agro Suppliers", contact_info: "0780000001", payment_terms: "Net 30", outstanding_balance: 50000 };
    setToStorage(STORAGE_KEYS.SUPPLIERS, [...getFromStorage(STORAGE_KEYS.SUPPLIERS), sup1]);

    // 6. Customers
    const cust1 = { id: generateId(), organization_id: organizationId, name: "John Doe Farm", phone: "0781111111", credit_limit: 100000, current_balance: 15000 };
    setToStorage(STORAGE_KEYS.CUSTOMERS, [...getFromStorage(STORAGE_KEYS.CUSTOMERS), cust1]);

    // 7. Product Batches & Inventory Items (Legacy sync)
    const batch1 = { id: generateId(), organization_id: organizationId, product_id: prod1.id, batch_number: "BATCH-001", expiry_date: "2027-12-31", quantity_remaining: 150, unit_cost: 12000, selling_price: 15000 };
    const batch2 = { id: generateId(), organization_id: organizationId, product_id: prod2.id, batch_number: "BATCH-002", expiry_date: "2025-06-30", quantity_remaining: 300, unit_cost: 2000, selling_price: 3500 };
    const batch3 = { id: generateId(), organization_id: organizationId, product_id: prod3.id, batch_number: "BATCH-003", expiry_date: "2026-01-15", quantity_remaining: 45, unit_cost: 4500, selling_price: 6000 };
    setToStorage(STORAGE_KEYS.PRODUCT_BATCHES, [...getFromStorage(STORAGE_KEYS.PRODUCT_BATCHES), batch1, batch2, batch3]);

    // Populate legacy inventory items for dashboard metrics compatibility
    const legacyInv1 = { id: generateId(), organization_id: organizationId, name: prod1.name, category: "Fertilizers", type: "Agro Inputs", quantity: 150, unit_price: 15000, expiry_date: "2027-12-31", status: "In Stock" };
    const legacyInv2 = { id: generateId(), organization_id: organizationId, name: prod2.name, category: "Seeds", type: "Agro Inputs", quantity: 300, unit_price: 3500, expiry_date: "2025-06-30", status: "In Stock" };
    const legacyInv3 = { id: generateId(), organization_id: organizationId, name: prod3.name, category: "Antibiotics", type: "Veterinary Medicine", quantity: 45, unit_price: 6000, expiry_date: "2026-01-15", status: "Low Stock" };
    setToStorage(STORAGE_KEYS.INVENTORY_ITEMS, [...getFromStorage(STORAGE_KEYS.INVENTORY_ITEMS), legacyInv1, legacyInv2, legacyInv3]);

    // 8. Open Shift
    const shift1 = { id: generateId(), organization_id: organizationId, user_id: "demo-user", start_time: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), starting_cash: 50000, status: "Open" };
    setToStorage(STORAGE_KEYS.SHIFTS, [...getFromStorage(STORAGE_KEYS.SHIFTS), shift1]);

    // 9. Sales
    const sale1 = { id: generateId(), organization_id: organizationId, shift_id: shift1.id, customer_id: cust1.id, subtotal: 30000, discount_amount: 0, vat_amount: 5400, total_amount: 35400, payment_method: "Cash", status: "Completed", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), invoice_number: "INV-1001" };
    const sale2 = { id: generateId(), organization_id: organizationId, shift_id: shift1.id, subtotal: 10500, discount_amount: 500, vat_amount: 1800, total_amount: 11800, payment_method: "MoMo", status: "Completed", timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), invoice_number: "INV-1002" };
    setToStorage(STORAGE_KEYS.SALES, [...getFromStorage(STORAGE_KEYS.SALES), sale1, sale2]);

    // 10. Cashbook
    const cb1 = { id: generateId(), organization_id: organizationId, transaction_type: "IN", category: "Sales", amount: 35400, description: "Sale INV-1001", date: sale1.timestamp };
    const cb2 = { id: generateId(), organization_id: organizationId, transaction_type: "IN", category: "Sales", amount: 11800, description: "Sale INV-1002", date: sale2.timestamp };
    const cb3 = { id: generateId(), organization_id: organizationId, transaction_type: "OUT", category: "Utilities", amount: 5000, description: "Electricity Bill", date: now() };
    setToStorage(STORAGE_KEYS.CASHBOOK, [...getFromStorage(STORAGE_KEYS.CASHBOOK), cb1, cb2, cb3]);

    // 11. Expenses
    const exp1 = { id: generateId(), organization_id: organizationId, category: "Utilities", description: "Electricity Bill", amount: 5000, date: now() };
    setToStorage(STORAGE_KEYS.EXPENSES, [...getFromStorage(STORAGE_KEYS.EXPENSES), exp1]);

    // 12. Purchase Orders
    const po1 = { id: generateId(), organization_id: organizationId, supplier_id: sup1.id, status: "Delivered", total_amount: 250000, created_by: "demo-user", created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() };
    setToStorage(STORAGE_KEYS.PURCHASE_ORDERS, [...getFromStorage(STORAGE_KEYS.PURCHASE_ORDERS), po1]);
  }
};

export { generateId, now };
