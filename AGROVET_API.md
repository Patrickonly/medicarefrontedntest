# Agrovet Backend API (FONI onboarding — Stage 1)

Backend endpoints added for `org_type = "agrovet"` (tenant: **FONI AGROVET SOLUTIONS LTD**,
organization_id `4`). All live under `/api/agrovet/*`. This is the contract Stage 2 (frontend)
integrates against.

## Conventions

- **Auth**: every endpoint requires `Authorization: Bearer <jwt>`. The token carries `id`,
  `role_id`, `organization_id`. The organization scope comes from the **token**, never a header
  alone. An `x-organization-id` / `x-branch-id` header, if sent, must match the token or the
  request is rejected (cross-tenant protection).
- **RBAC**: enforced server-side via the existing `PermissionService` (permissions are
  `ACTION:SUBJECT`). Missing permission → `403`.
- **Subscription gating**: premium capabilities check the tenant's plan `features` JSON.
  Not entitled → `402` with an upgrade message. FONI is on **Premium**
  (`pos, inventory, accounting, multi_branch, credit_management`; it does **not** have
  `advanced_analytics`).
- **Response shape**: `{ success: true, data }` on success; `{ success: false, error }` on error.
  BigInt ids serialize as strings.
- **Status codes**: `200` ok, `201` created, `400` validation, `401` unauthenticated,
  `402` feature not in plan, `403` forbidden (RBAC/scope), `404` not found, `500` server error.

## Roles (new, seeded)

| Role | id | Summary |
|------|----|---------|
| Owner | 13 | Full operational + financial + approvals |
| Accountant | 14 | Finance, reports, discount approval; no user admin |
| Cashier-Agro | 15 | POS for AGRO department |
| Cashier-Vet | 16 | POS for VET department (+ dispense) |

---

## 1. Auth / Shifts / Audit

### `GET /api/agrovet/shifts`
List cashier shifts. Perm `VIEW:BRANCH_DASHBOARD`.
Query: `status`, `userId`, `branchId`. → `{ data: [session…] }`

### `POST /api/agrovet/shifts`
Open a shift. Perm `CREATE:SALES`.
Body: `{ opening_balance:number, user_id?, branch_id? }` → `201 { data: session }`

### `GET /api/agrovet/shifts/current`
Current open shift + live shift-linked totals. Perm `CREATE:SALES`.
Query: `userId?` → `{ data: { …session, totals:{ grandTotal, cashTotal, salesCount, byMethod } } }` or `{ data:null }`

### `POST /api/agrovet/shifts/close`
Close & reconcile against shift-linked cash sales. Perm `CREATE:SALES`.
Body: `{ shift_id, closing_balance:number }` → `{ data:{ …session, expected_balance, cash_sales, difference, status } }`
(`status` = `CLOSED` if reconciled else `DISCREPANCY`.)

### `GET /api/agrovet/audit-logs`
Immutable audit trail (read-only). Perm `VIEW:AUDIT_LOGS`.
Query: `module, table, action, userId, branchId, limit, offset` →
`{ data:{ total, limit, offset, items:[{ user, action, table_affected, record_id, before, after, timestamp, branch }] } }`

## 2. Inventory (department split)

Products now carry `department` = `AGRO | VET | GENERAL`. Exposed on lookup and settable on the
existing `/api/products` create/update payloads (additive field).

## 3. POS

### `GET /api/agrovet/pos/lookup`
Barcode or text product lookup with live stock + department. Perm `VIEW:PRODUCTS`.
Query: `barcode=<exact>` **or** `q=<text>` (+ optional `department=AGRO|VET`) →
`{ data:[{ id, name, barcode, uom, department, category, selling_price, tax_rate, stock }] }`

### `POST /api/agrovet/pos/sale`
Create a POS sale. Perm `CREATE:SALES`; feature `pos` (credit also needs `credit_management`).
Body:
```json
{ "branch_id":1, "payment_method":"CASH|MOMO|BANK_TRANSFER|CREDIT|CARD",
  "items":[{"product_id":5,"quantity":2,"unit_price":28000}],
  "customer_id":5, "amount_paid":56000, "due_date":"2026-08-01",
  "cash_session_id":4, "discount_request_id":7, "client_ref":"pos-uuid-123" }
```
Behaviour: FEFO batch deduction · **EBM fiscal invoice generated automatically (mandatory)** ·
shift linkage · approved single-use discount applied · VAT captured · **server-side credit
hard-stop** · large-sale/low-stock alerts · idempotent on `client_ref` (offline-sync).
→ `201 { data:{ sale:{…, ebm_invoice_number, ebm_status, vat_amount, discount_amount,
cash_session_id }, ebm:{ receipt_data:{ qr_code_data, receipt_signature, … } } } }`
(duplicate `client_ref` → `200`, same sale.)

### `GET /api/agrovet/pos/receipt?sale_id=<id>`
Structured receipt + EBM fiscal block for printing. Perm `VIEW:OWN_SALES` or `VIEW:ALL_SALES`.
→ `{ data:{ invoice_number, ebm_invoice_number, ebm_receipt_data, items[], subtotal,
discount_amount, vat_amount, total_amount, amount_paid, remaining_balance, cashier, customer } }`

## 4. Discounts (request → approve)

### `GET /api/agrovet/discounts`
List requests. Perm `REQUEST:DISCOUNTS` or `APPROVE:DISCOUNTS`.
Query: `status, branchId, requesterId`.

### `POST /api/agrovet/discounts`
Cashier raises a request. Perm `REQUEST:DISCOUNTS`.
Body: `{ amount, sale_total, customer_id?, reason? }` → `201 { data: request }`
(≥20% of total also raises an `UNUSUAL_DISCOUNT` alert.)

### `POST /api/agrovet/discounts/review`
Owner/Accountant decides. Perm `APPROVE:DISCOUNTS`.
Body: `{ request_id, decision:"APPROVED"|"REJECTED", comment? }` → `{ data: request }`
An approved request is single-use — consumed by the sale it's applied to.

## 5. Purchasing

### `POST /api/agrovet/purchasing/grn`
Goods-received note against a PO. Perm `MANAGE:INVENTORY`; feature `inventory`.
Body:
```json
{ "purchase_order_id":4, "branch_id":1,
  "lines":[{"po_item_id":4,"received_quantity":20,"batch_number":"B-1",
            "expiry_date":"2027-01-15","selling_price":30000}] }
```
Creates batches **with captured expiry + real selling price**, updates stock, marks PO
`RECEIVED`, and increments supplier payable. → `201 { data:{ payable_increase } }`

### `GET /api/agrovet/purchasing/payables`
Per-supplier outstanding payables + total. Perm `VIEW:SUPPLIERS`; feature `accounting`.
→ `{ data:{ total_payable, suppliers:[{ id, name, outstanding_balance, payment_terms }] } }`

### `POST /api/agrovet/purchasing/payables`
Record a supplier payment (decrements payable, logs cash-out). Perm `MANAGE:SUPPLIERS`;
feature `accounting`.
Body: `{ supplier_id, amount, payment_method?, reference?, note? }` →
`201 { data:{ payment, outstanding_balance } }`

## 6. Accounting

### `GET /api/agrovet/accounting/{report}`
`report` ∈ `cashbook | pnl | vat | channels`. Feature `accounting`.
Perm `VIEW:FINANCIAL_REPORTS` (cashbook also accepts `VIEW:CASHBOOK`).
Query: `from, to` (ISO dates), `branchId?`.
- `cashbook` → daily ledger with running balance + daily/period totals.
- `pnl` → `{ revenue_gross, vat_output, cogs, gross_profit, operating_expenses, net_profit }`.
- `vat` → `{ total_taxable, total_output_vat, daily }`.
- `channels` → `{ momo:[…], bank:[…] }` separate transaction logs.

## 7. Customer credit

### `GET /api/agrovet/credit/statement?customer_id=<id>`
Running credit ledger. Perm `VIEW:CUSTOMERS`; feature `credit_management`.
→ `{ data:{ credit_limit, current_balance, available_credit, ledger:[{ kind, at, amount, running_balance }] } }`

### `GET /api/agrovet/credit/overdue`
Overdue balances (past due_date) + (re)emits Owner alerts. Perm `VIEW:CUSTOMERS`;
feature `credit_management`.
→ `{ data:{ count, total_overdue, items:[{ sale_id, customer_name, balance, due_date, days_overdue }] } }`

## 8. Alerts (single service)

### `GET /api/agrovet/alerts`
Unified feed. Perm `VIEW:BRANCH_DASHBOARD`.
Query: `type, unread=true, targetRole, limit, offset` →
`{ data:{ total, unread, items:[{ type, severity, title, message, target_role, data, is_read, created_at }] } }`
Types: `LOW_STOCK, EXPIRY_30, EXPIRY_7, UNUSUAL_DISCOUNT, LARGE_SALE, VOIDED_SALE, OVERDUE_CREDIT`.

### `PATCH /api/agrovet/alerts`
Mark read. Body: `{ ids:number[] }`.

### `POST /api/agrovet/alerts/scan`
Recompute low-stock / expiry / overdue alerts (idempotent). Perm `VIEW:BRANCH_DASHBOARD`.
→ `{ data:{ emitted, byType } }`

## 9. KPI dashboard

### `GET /api/agrovet/kpi`
Perm `VIEW:COMPANY_DASHBOARD`. Query: `from, to, branchId, view`.
`view` ∈ `dashboard | sales-by-cashier | gross-profit | top-selling | turnover | cashflow | activity`.
- Individual views are available on FONI's plan.
- `view=dashboard` (consolidated) requires feature `advanced_analytics` → **`402` for FONI**
  (Premium does not include it; this is correct tier gating).

---

## 10. Role dashboards

### `GET /api/agrovet/dashboard`
Role-aware payload (Owner / Accountant / Cashier-Agro / Cashier-Vet); Super Admin gets the
platform dashboard. Optional `?branchId=`. No subscription remaining/countdown on any dashboard.
See `FRONTEND_INTEGRATION.md` §3 for the per-role field list.

## 11. Bulk table actions

### `POST /api/agrovet/bulk/{entity}`
`entity ∈ users | products | customers | suppliers`. Body `{ action:"DELETE"|"STATUS", ids:[], status? }`.
Perm `MANAGE:<ENTITY>`, org-scoped, per-id results. See `FRONTEND_INTEGRATION.md` §12.

## EBM integration note

All EBM calls go through one adapter: `getEbmProvider().fiscalize(...)`
(`src/services/ebm/ebm.provider.ts`). Currently `MockEbmProvider` returns realistic fake fiscal
data. RRA config is isolated in `src/services/ebm/ebm.config.ts`. To go live: implement
`RraEbmProvider` (marked `>>> REAL API CALL REPLACES THE MOCK HERE <<<`) and set `EBM_PROVIDER=rra`
plus the `RRA_*` env vars — no calling code changes.
