# MedicareOne — Frontend Integration Guide

Complete API reference for integrating the frontend, covering **all organization types**
(Hospital, Clinic, Pharmacy, **Agrovet Pharmacy**, …) plus the agrovet-specific modules,
role-based dashboards, and bulk table actions.

> Two companion docs exist: [`APP_API.md`](./APP_API.md) (the original platform API, still valid)
> and [`AGROVET_API.md`](./AGROVET_API.md) (agrovet endpoint detail). **This file is the single
> place to start.**

---

## 1. Base setup

- **Base URL**: your backend origin, e.g. `http://localhost:3000` in dev. Every path below is
  relative to it.
- **CORS** is enabled for all `/api/*` routes (preflight handled), so the frontend can call from
  any origin with credentials.
- **Auth**: send `Authorization: Bearer <jwt>` on every protected route. The token is returned by
  the login/OTP flow and carries `id`, `role_id`, `organization_id`.
- The organization scope comes from the **token**. If you also send `x-organization-id` /
  `x-branch-id` headers they must match the token, or the request is rejected (cross-tenant guard).

### Response envelope
```jsonc
// success
{ "success": true, "data": { ... } }        // or { "success": true, "message": "...", "data": ... }
// error
{ "success": false, "error": "human message", "code": "OPTIONAL_CODE" }
```
BigInt ids are returned as **strings**. Some older platform routes return raw arrays/objects —
noted where relevant.

### Status codes (handle these in your API client)
| Code | Meaning | Frontend action |
|------|---------|-----------------|
| 200/201 | OK / created | proceed |
| 400 | validation | show `error` inline |
| 401 | not authenticated | redirect to login |
| 402 | feature not in the org's plan | show "upgrade plan" |
| 403 | forbidden (role/scope) | hide/deny the action |
| 404 | not found | show not-found |
| 409 | conflict/duplicate | show `error` |
| 503 | **server/DB unreachable** | **show a network / "can't reach server" banner** |

### Network & error handling (required for a professional UX)
The backend never leaks raw stack traces. When the DB/server is unreachable it returns **503**
with a friendly message. Your API client should:
```js
async function apiCall(path, opts) {
  let res;
  try {
    res = await fetch(BASE + path, { ...opts, headers: { ...authHeaders(), ...opts.headers } });
  } catch (e) {
    // No response at all = network down / server unreachable
    throw { network: true, message: "Can't reach the server. Check your connection." };
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 503) throw { network: true, message: body.error };
    if (res.status === 401) { redirectToLogin(); return; }
    throw { status: res.status, message: body.error || 'Something went wrong.' };
  }
  return body;
}
```
Show `error.network` failures as a **network banner**, everything else as an inline/toast message.

---

## 2. Auth flow (all org types)

| Method | Path | Body | Notes |
|--------|------|------|-------|
| POST | `/api/auth/register` | `{ organizationName, organizationTypeId, firstName, lastName, email, phone, password }` | Creates org + owner. `organizationTypeId` from `/api/organization-types` (Agrovet Pharmacy = 4). Returns `flowToken` + starts OTP. |
| POST | `/api/auth/login` | `{ identifier, password }` | `identifier` = email/phone. Returns token or triggers OTP. |
| POST | `/api/auth/verify-otp` | `{ ... , code }` | Completes login/registration. |
| POST | `/api/auth/forgot-password` / `/api/auth/reset-password` | — | Password reset. |
| GET | `/api/organization-types` | — | Populates the org-type dropdown. |
| GET | `/api/health` | — | `{ status, connections:{ prisma, supabase } }` — use for a status indicator. |

---

## 3. Dashboards (role-aware)

### 3a. Agrovet role dashboard — `GET /api/agrovet/dashboard`
Returns a payload shaped for the caller's role. Optional `?branchId=`.

| Role (role_id) | `data` shape (key fields) |
|----------------|---------------------------|
| **Owner (13)** | `cards:{ sales_today, sales_last_30d, gross_profit_30d, inventory_turnover, inventory_value, low_stock_alerts, expiry_alerts, pending_discount_approvals, overdue_credit_count, overdue_credit_total }`, `top_selling_products[]`, `gross_profit_per_product[]`, `sales_by_cashier[]`, `recent_alerts[]` |
| **Accountant (14)** | `cards:{ revenue_mtd, vat_output_mtd, expenses_mtd, accounts_payable, accounts_receivable, momo_received_mtd, bank_received_mtd, overdue_credit_count, overdue_credit_total }` |
| **Cashier-Agro (15)** | `department:"AGRO"`, `shift:{ id, opened_at, opening_balance, totals }`, `cards:{ my_sales_today, my_sales_count_today, shift_open, department_low_stock_count }`, `department_low_stock[]`, `my_recent_discount_requests[]` |
| **Cashier-Vet (16)** | same as Cashier-Agro with `department:"VET"` |

> **No subscription remaining/expiry countdown appears on any dashboard** — by design.

### 3b. Super Admin dashboard
`GET /api/agrovet/dashboard` **or** the existing `GET /api/dashboard` (both work for SA).
Returns the **platform** view: `organizations_total, active_organizations,
pending_organization_approvals, total_branches, total_users, active_subscriptions,
pending_subscription_approvals, open_support_tickets, pending_payments, recent_*[],
top_organizations_by_revenue[]`.
**Subscription is shown as COUNTS only** (active/pending) — the per-org **subscription remaining /
expiry** detail is intentionally **not** here; it lives in **Organization / Subscription
Management** (§7).

### 3c. Administrator (non-agrovet org) dashboard
`GET /api/dashboard` → org KPIs: `sales_today, purchases_today, profit_today, total_products,
low_stock_products, expired_products, revenue, expenses, creditExposure, stockValue, netCashFlow,
analytics{...}, recent_sales[]`.

---

## 4. Agrovet POS

| Method | Path | Body / Query | Perm · Feature |
|--------|------|--------------|----------------|
| GET | `/api/agrovet/pos/lookup` | `?barcode=` or `?q=&department=AGRO\|VET` | VIEW:PRODUCTS |
| POST | `/api/agrovet/pos/sale` | `{ branch_id, payment_method, items:[{product_id,quantity,unit_price}], customer_id?, amount_paid?, due_date?, cash_session_id?, discount_request_id?, client_ref? }` | CREATE:SALES · `pos` (credit → `credit_management`) |
| GET | `/api/agrovet/pos/receipt` | `?sale_id=` | VIEW:OWN_SALES/ALL_SALES |

Sale behaviour: FEFO stock, **EBM fiscal invoice auto-generated (mandatory)**, shift linkage, VAT,
single-use approved discount, **server-side credit hard-stop**, idempotent on `client_ref`
(offline sync). Sale `data` includes `ebm_invoice_number, ebm_status, vat_amount, discount_amount`
and `ebm.receipt_data{ qr_code_data, receipt_signature, … }` for printing.

## 5. Shifts (per cashier)

| Method | Path | Body/Query |
|--------|------|-----------|
| GET | `/api/agrovet/shifts` | `?status=&userId=&branchId=` |
| POST | `/api/agrovet/shifts` | `{ opening_balance, user_id?, branch_id? }` |
| GET | `/api/agrovet/shifts/current` | `?userId=` → open shift + live totals |
| POST | `/api/agrovet/shifts/close` | `{ shift_id, closing_balance }` → reconciled (CLOSED/DISCREPANCY) |

## 6. Discounts (request → approve)

| Method | Path | Body | Perm |
|--------|------|------|------|
| GET | `/api/agrovet/discounts` | `?status=&branchId=` | REQUEST or APPROVE:DISCOUNTS |
| POST | `/api/agrovet/discounts` | `{ amount, sale_total, customer_id?, reason? }` | REQUEST:DISCOUNTS |
| POST | `/api/agrovet/discounts/review` | `{ request_id, decision:"APPROVED"\|"REJECTED", comment? }` | APPROVE:DISCOUNTS |

## 7. Purchasing & payables

| Method | Path | Body | Perm · Feature |
|--------|------|------|----------------|
| POST | `/api/agrovet/purchasing/grn` | `{ purchase_order_id, branch_id?, lines:[{ po_item_id, received_quantity, batch_number?, expiry_date?, selling_price }] }` | MANAGE:INVENTORY · `inventory` |
| GET | `/api/agrovet/purchasing/payables` | — | VIEW:SUPPLIERS · `accounting` |
| POST | `/api/agrovet/purchasing/payables` | `{ supplier_id, amount, payment_method?, reference?, note? }` | MANAGE:SUPPLIERS · `accounting` |

## 8. Accounting

`GET /api/agrovet/accounting/{report}` — `report ∈ cashbook | pnl | vat | channels`.
Query `?from=&to=&branchId=`. Feature `accounting`; perm VIEW:FINANCIAL_REPORTS (cashbook also
accepts VIEW:CASHBOOK).

## 9. Customer credit

| Method | Path | Query | Feature |
|--------|------|-------|---------|
| GET | `/api/agrovet/credit/statement` | `?customer_id=` | `credit_management` |
| GET | `/api/agrovet/credit/overdue` | — | `credit_management` |

## 10. Alerts (single feed)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/agrovet/alerts` | `?type=&unread=true&targetRole=&limit=&offset=` → `{ total, unread, items[] }` |
| PATCH | `/api/agrovet/alerts` | `{ ids:[] }` mark read |
| POST | `/api/agrovet/alerts/scan` | recompute low-stock/expiry/overdue |

Types: `LOW_STOCK, EXPIRY_30, EXPIRY_7, UNUSUAL_DISCOUNT, LARGE_SALE, VOIDED_SALE, OVERDUE_CREDIT`.

## 11. KPI

`GET /api/agrovet/kpi?view=&from=&to=&branchId=` — `view ∈ sales-by-cashier | gross-profit |
top-selling | turnover | cashflow | activity | dashboard`. `dashboard` needs the
`advanced_analytics` plan feature (returns **402** if the plan lacks it — show upgrade).

---

## 12. Bulk table actions (multi-select) — NEW

For tables with checkboxes (Users, Products, Customers, Suppliers). One endpoint per entity:

**`POST /api/agrovet/bulk/{entity}`** — `entity ∈ users | products | customers | suppliers`

```jsonc
// bulk soft-delete selected rows
{ "action": "DELETE", "ids": [12, 15, 20] }

// bulk status change
{ "action": "STATUS", "status": "INACTIVE", "ids": [12, 15] }
// user statuses: ACTIVE | INACTIVE | SUSPENDED
// product/customer/supplier statuses: ACTIVE | INACTIVE
```
- Perm: `MANAGE:<ENTITY>` (Owner/Admin). Org-scoped — rows outside your org are skipped.
- Response reports **per-id** results (partial success is normal):
```jsonc
{ "success": true, "data": { "total": 3, "succeeded": 2, "failed": 1,
  "results": [ { "id":"12", "ok":true }, { "id":"20", "ok":false, "error":"Not in your organization" } ] } }
```
Render `succeeded`/`failed` as a summary toast and, if `failed>0`, list the reasons.

---

## 13. Single-row management (existing platform routes)

These serve **every org type**. Full detail in [`APP_API.md`](./APP_API.md).

| Area | Endpoints |
|------|-----------|
| Users | `GET/POST/PUT/DELETE /api/users` · `GET/PUT/DELETE /api/users/{id}` · `PUT /api/users` (`action:UPDATE_STATUS`) · profile: `GET/PUT /api/users/profile`, `POST /api/users/profile/change-password` |
| Roles & permissions | `GET/POST /api/roles` · `GET /api/permissions` |
| Products | `GET/POST/PUT/DELETE /api/products` (+ `department` field for agrovet) · types · categories · suppliers · cost-history · lifecycle |
| Inventory | `POST /api/inventory/stock` · `/adjust` · `GET /movements` · `/reorder-suggestions` · `POST /disposals` · transfers · stock-transfers |
| Sales | `GET/POST/PUT/DELETE /api/sales` |
| Customers | `GET/POST/PUT/DELETE /api/customers` · `GET/POST /api/customers/payments` |
| Suppliers | `GET/POST/PUT/DELETE /api/suppliers` · `GET /api/suppliers/performance` |
| Purchases | `GET/POST/PUT/DELETE /api/purchases` |
| Cash sessions | `GET /api/cash-sessions` · `POST /open` · `/close` |
| Support | `GET/POST /api/support/tickets` |
| Returns / Expenses | `GET/POST /api/returns` · `GET/POST/PUT/DELETE /api/expenses` |
| Notifications | `GET/PUT /api/notifications/preferences` |

### Super Admin (Org & Subscription Management — where subscription detail lives)
| Area | Endpoints |
|------|-----------|
| Organizations | `GET/POST/PUT/DELETE /api/admin/organizations` (+ `x-admin-id`) |
| Branches | `POST /api/admin/branches` · `GET/POST /api/branches` |
| **Subscriptions** | `GET /api/subscriptions/plans` · `POST /api/subscriptions/subscribe` · admin: `GET/POST/PUT/DELETE /api/admin/subscriptions/plans` · discount-rules · `POST /approve` · `GET /payments` — **this is where per-org subscription status / remaining is shown, not on the dashboard** |
| Audit | `GET /api/agrovet/audit-logs` (org-scoped, filterable) |

---

## 14. Roles reference (agrovet)

| Role | id | Can |
|------|----|-----|
| Owner | 13 | Everything operational + finance + approvals + bulk manage |
| Accountant | 14 | Finance, reports, discount approval; no user admin |
| Cashier-Agro | 15 | POS (AGRO), request discounts, open/close own shift |
| Cashier-Vet | 16 | POS (VET) + dispense, request discounts, own shift |
| Administrator | 2 | Org admin (implicit manage within org) |
| Super Admin | 9 | Platform-wide |

## 15. Subscription feature gates (Premium plan for FONI)
`pos, inventory, accounting, multi_branch, credit_management`. Not included: `advanced_analytics`
→ the consolidated KPI dashboard returns **402** (show "upgrade"). Individual KPI views work.

---

## 16. Integration order (suggested)
1. Auth (register/login/OTP) + `/api/health` status indicator + the network-error banner.
2. Role dashboard (`/api/agrovet/dashboard`) — first screen after login.
3. Master data: products (with department), customers, suppliers.
4. POS: lookup → shift open → sale (EBM/receipt) → shift close.
5. Discounts, purchasing/GRN, credit.
6. Accounting, alerts, KPI.
7. Management tables + **bulk actions**; Super Admin org/subscription management.
