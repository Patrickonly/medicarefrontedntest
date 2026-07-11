
import { MfaChallengeGate } from "@/components/auth/MfaChallengeGate";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SuperAdminRoute } from "@/components/auth/SuperAdminRoute";
import { TwoFactorGate } from "@/components/auth/TwoFactorGate";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { SubscriptionProvider } from "@/hooks/SubscriptionContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { lazy, ReactNode, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { BackendOfflineBanner } from "@/components/shared/BackendOfflineBanner";

import Index from "./pages/landing-page/Index";
import NotFound from "./pages/NotFound";
import SubscriptionPage from "./pages/landing-page/SubscriptionPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import LoginPage from "./pages/auth/LoginPage";
import OTPPage from "./pages/auth/OTPPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";


// Public pages
const AboutPage = lazy(() => import("./pages/landing-page/AboutPage"));
const ContactPage = lazy(() => import("./pages/landing-page/ContactPage"));
const PricingPage = lazy(() => import("./pages/landing-page/PricingPage"));

// Onboarding and security
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const TwoFactorUnlockPage = lazy(() => import("./pages/auth/TwoFactorUnlockPage"));

// Admin workspace
const DashboardLayout = lazy(() => import("./components/dashboard/DashboardLayout"));
const DashboardHome = lazy(() => import("./pages/dashboard/core/DashboardHome"));
const POSPage = lazy(() => import("./pages/dashboard/sales/POSPage"));
const SalesHistoryPage = lazy(() => import("./pages/dashboard/sales/SalesHistoryPage"));
const CustomersPage = lazy(() => import("./pages/dashboard/customers/CustomersPage"));
const CustomerFormPage = lazy(() => import("./pages/dashboard/customers/CustomerFormPage"));
const CustomerProfilePage = lazy(() => import("./pages/dashboard/customers/CustomerProfilePage"));
const SuppliersPage = lazy(() => import("./pages/dashboard/suppliers/SuppliersPage"));
const AddSupplierPage = lazy(() => import("./pages/dashboard/suppliers/AddSupplierPage"));
const EditSupplierPage = lazy(() => import("./pages/dashboard/suppliers/EditSupplierPage"));
const SupplierProfilePage = lazy(() => import("./pages/dashboard/suppliers/SupplierProfilePage"));
const ProductTypesPage = lazy(() => import("./pages/dashboard/inventory/ProductTypesPage"));
const CategoriesPage = lazy(() => import("./pages/dashboard/inventory/CategoriesPage"));
const ProductsPage = lazy(() => import("./pages/dashboard/inventory/ProductsPage"));
const ShiftManagementPage = lazy(() => import("./pages/dashboard/sales/ShiftManagementPage"));
const PurchaseOrdersPage = lazy(() => import("./pages/dashboard/finance/PurchaseOrdersPage"));
const CreditPaymentsPage = lazy(() => import("./pages/dashboard/finance/CreditPaymentsPage"));
const CashbookPage = lazy(() => import("./pages/dashboard/finance/CashbookPage"));
const ExpensesPage = lazy(() => import("./pages/dashboard/finance/ExpensesPage"));
const AuditLogsPage = lazy(() => import("./pages/dashboard/reports/AuditLogsPage"));
const DiscountRequestsPage = lazy(() => import("./pages/dashboard/sales/DiscountRequestsPage"));
const InventoryPage = lazy(() => import("./pages/dashboard/inventory/InventoryPage"));
const AddInventoryPage = lazy(() => import("./pages/dashboard/inventory/AddInventoryPage"));
const EditInventoryPage = lazy(() => import("./pages/dashboard/inventory/EditInventoryPage"));
const BillingPage = lazy(() => import("./pages/dashboard/finance/BillingPage"));
const ReportsPage = lazy(() => import("./pages/dashboard/reports/ReportsPage"));
const MonthlyReportPage = lazy(() => import("./pages/dashboard/reports/MonthlyReportPage"));
const SecurityAuditPage = lazy(() => import("./pages/dashboard/reports/SecurityAuditPage"));
const SettingsPage = lazy(() => import("./pages/dashboard/settings/SettingsPage"));
const MySubscriptionPage = lazy(() => import("./pages/dashboard/organizations/MySubscriptionPage"));
const OrganizationSubscriptionsPage = lazy(() => import("./pages/dashboard/subscriptions/OrganizationSubscriptionsPage"));
const UsersPage = lazy(() => import("./pages/dashboard/users/UsersPage"));
const AddUserPage = lazy(() => import("./pages/dashboard/users/AddUserPage"));
const EditUserPage = lazy(() => import("./pages/dashboard/users/EditUserPage"));
const OrganizationsPage = lazy(() => import("./pages/dashboard/organizations/OrganizationsPage"));
const AddOrganizationPage = lazy(() => import("./pages/dashboard/organizations/AddOrganizationPage"));
const EditOrganizationPage = lazy(() => import("./pages/dashboard/organizations/EditOrganizationPage"));
const BranchesPage = lazy(() => import("./pages/dashboard/branches/BranchesPage"));
const AddBranchPage = lazy(() => import("./pages/dashboard/branches/AddBranchPage"));
const EditBranchPage = lazy(() => import("./pages/dashboard/branches/EditBranchPage"));
const RolesPermissionsPage = lazy(() => import("./pages/dashboard/roles-permissions/RolesPermissionsPage"));
const AddRolePage = lazy(() => import("./pages/dashboard/roles-permissions/AddRolePage"));
const EditRolePage = lazy(() => import("./pages/dashboard/roles-permissions/EditRolePage"));
const SubscriptionsPage = lazy(() => import("./pages/dashboard/subscriptions/SubscriptionsPage"));
const SubscriptionRemindersPage = lazy(() => import("./pages/dashboard/subscriptions/SubscriptionRemindersPage"));
const AddSubscriptionPlanPage = lazy(() => import("./pages/dashboard/subscriptions/AddSubscriptionPlanPage"));
const EditSubscriptionPlanPage = lazy(() => import("./pages/dashboard/subscriptions/EditSubscriptionPlanPage"));
const AddDiscountRulePage = lazy(() => import("./pages/dashboard/subscriptions/AddDiscountRulePage"));
const EditDiscountRulePage = lazy(() => import("./pages/dashboard/subscriptions/EditDiscountRulePage"));
const OrganizationTypesPage = lazy(() => import("./pages/dashboard/organization-types/OrganizationTypesPage"));
const AddOrganizationTypePage = lazy(() => import("./pages/dashboard/organization-types/AddOrganizationTypePage"));
const EditOrganizationTypePage = lazy(() => import("./pages/dashboard/organization-types/EditOrganizationTypePage"));
const SupportPage = lazy(() => import("./pages/dashboard/support/SupportPage"));
const PaymentsPage = lazy(() => import("./pages/dashboard/payments/PaymentsPage"));

// Agrovet workspace (org_type = "agrovet" only - see useAuth's isAgrovetOrg)
const AgrovetPOSPage = lazy(() => import("./pages/dashboard/agrovet/AgrovetPOSPage"));
const AgrovetShiftsPage = lazy(() => import("./pages/dashboard/agrovet/AgrovetShiftsPage"));
const AgrovetDiscountsPage = lazy(() => import("./pages/dashboard/agrovet/AgrovetDiscountsPage"));
const AgrovetPurchasingPage = lazy(() => import("./pages/dashboard/agrovet/AgrovetPurchasingPage"));
const AgrovetPayablesPage = lazy(() => import("./pages/dashboard/agrovet/AgrovetPayablesPage"));
const AgrovetAccountingPage = lazy(() => import("./pages/dashboard/agrovet/AgrovetAccountingPage"));
const AgrovetCreditPage = lazy(() => import("./pages/dashboard/agrovet/AgrovetCreditPage"));
const AgrovetKpiPage = lazy(() => import("./pages/dashboard/agrovet/AgrovetKpiPage"));
const AgrovetAlertsPage = lazy(() => import("./pages/dashboard/agrovet/AgrovetAlertsPage"));
const AgrovetAuditLogsPage = lazy(() => import("./pages/dashboard/agrovet/AgrovetAuditLogsPage"));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-muted">
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-8 py-7 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        <ShieldCheck className="h-6 w-6" />
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">Loading MediCare workspace</p>
        <p className="mt-1 text-xs text-muted-foreground">Preparing secure clinical operations</p>
      </div>

      <Loader2 className="h-5 w-5 animate-spin text-blue-700" />
    </div>
  </div>
);

const SecureAppRoute = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute>
    <MfaChallengeGate>
      <TwoFactorGate>{children}</TwoFactorGate>
    </MfaChallengeGate>
  </ProtectedRoute>
);

const SecurePortalRoute = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute>
    <MfaChallengeGate>{children}</MfaChallengeGate>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BackendOfflineBanner />

      <BrowserRouter>
                <AuthProvider>
                  <SubscriptionProvider>
                    <Suspense fallback={<RouteFallback />}>
                      <Routes>
                        {/* Public */}
                        <Route path="/" element={<Index />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/subscription" element={<SubscriptionPage />} />
                        <Route path="/otp" element={<OTPPage />} />
                        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                        <Route path="/reset-password" element={<ResetPasswordPage />} />
                        <Route path="/about" element={<AboutPage />} />
                        <Route path="/contact" element={<ContactPage />} />
                        <Route path="/pricing" element={<PricingPage />} />

              {/* Onboarding */}
              <Route
                path="/onboarding"
                element={
                  <SecurePortalRoute>
                    <OnboardingPage />
                  </SecurePortalRoute>
                }
              />

              <Route
                path="/2fa-unlock"
                element={
                  <ProtectedRoute>
                    <TwoFactorUnlockPage />
                  </ProtectedRoute>
                }
              />

              {/* Administration */}
              <Route
                path="/dashboard"
                element={
                  <SecureAppRoute>
                    <DashboardLayout />
                  </SecureAppRoute>
                }
              >
                <Route index element={<DashboardHome />} />
                <Route path="pos" element={<POSPage />} />
                <Route path="sales-history" element={<SalesHistoryPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="customers/add" element={<CustomerFormPage />} />
                <Route path="customers/edit/:id" element={<CustomerFormPage />} />
                <Route path="customers/:id/profile" element={<CustomerProfilePage />} />
                <Route path="suppliers" element={<SuppliersPage />} />
                <Route path="suppliers/add" element={<AddSupplierPage />} />
                <Route path="suppliers/edit/:id" element={<EditSupplierPage />} />
                <Route path="suppliers/:id/profile" element={<SupplierProfilePage />} />
                <Route path="product-types" element={<ProductTypesPage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="inventory/add" element={<AddInventoryPage />} />
                <Route path="inventory/edit/:id" element={<EditInventoryPage />} />
                <Route path="billing" element={<BillingPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="reports/monthly" element={<MonthlyReportPage />} />
                <Route path="security-audit" element={<SecurityAuditPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="my-subscription" element={<MySubscriptionPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="users/add" element={<AddUserPage />} />
                <Route path="users/edit/:id" element={<EditUserPage />} />
                <Route path="shifts" element={<ShiftManagementPage />} />
                <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
                <Route path="credit-payments" element={<CreditPaymentsPage />} />
                <Route path="cashbook" element={<CashbookPage />} />
                <Route path="expenses" element={<ExpensesPage />} />
                <Route path="audit-logs" element={<SuperAdminRoute><AuditLogsPage /></SuperAdminRoute>} />
                <Route path="discounts" element={<DiscountRequestsPage />} />
                <Route path="organizations" element={<SuperAdminRoute><OrganizationsPage /></SuperAdminRoute>} />
                <Route path="organizations/add" element={<SuperAdminRoute><AddOrganizationPage /></SuperAdminRoute>} />
                <Route path="organizations/edit/:id" element={<SuperAdminRoute><EditOrganizationPage /></SuperAdminRoute>} />
                <Route path="branches" element={<SuperAdminRoute><BranchesPage /></SuperAdminRoute>} />
                <Route path="branches/add" element={<SuperAdminRoute><AddBranchPage /></SuperAdminRoute>} />
                <Route path="branches/edit/:id" element={<SuperAdminRoute><EditBranchPage /></SuperAdminRoute>} />
                <Route path="roles-permissions" element={<SuperAdminRoute><RolesPermissionsPage /></SuperAdminRoute>} />
                <Route path="roles-permissions/add" element={<SuperAdminRoute><AddRolePage /></SuperAdminRoute>} />
                <Route path="roles-permissions/edit/:id" element={<SuperAdminRoute><EditRolePage /></SuperAdminRoute>} />
                <Route path="subscriptions" element={<SuperAdminRoute><SubscriptionsPage /></SuperAdminRoute>} />
                <Route path="organization-subscriptions" element={<SuperAdminRoute><OrganizationSubscriptionsPage /></SuperAdminRoute>} />
                <Route path="subscriptions/reminders" element={<SuperAdminRoute><SubscriptionRemindersPage /></SuperAdminRoute>} />
                <Route path="subscriptions/plans/add" element={<SuperAdminRoute><AddSubscriptionPlanPage /></SuperAdminRoute>} />
                <Route path="subscriptions/plans/edit/:id" element={<SuperAdminRoute><EditSubscriptionPlanPage /></SuperAdminRoute>} />
                <Route path="subscriptions/discounts/add" element={<SuperAdminRoute><AddDiscountRulePage /></SuperAdminRoute>} />
                <Route path="subscriptions/discounts/edit/:id" element={<SuperAdminRoute><EditDiscountRulePage /></SuperAdminRoute>} />
                <Route path="organization-types" element={<SuperAdminRoute><OrganizationTypesPage /></SuperAdminRoute>} />
                <Route path="organization-types/add" element={<SuperAdminRoute><AddOrganizationTypePage /></SuperAdminRoute>} />
                <Route path="organization-types/edit/:id" element={<SuperAdminRoute><EditOrganizationTypePage /></SuperAdminRoute>} />
                <Route path="support" element={<SupportPage />} />
                <Route path="payments" element={<SuperAdminRoute><PaymentsPage /></SuperAdminRoute>} />

                {/* Agrovet workspace - backend enforces org_type/role/feature scoping
                    per-endpoint regardless, these routes just need a session. */}
                <Route path="agrovet/pos" element={<AgrovetPOSPage />} />
                <Route path="agrovet/shifts" element={<AgrovetShiftsPage />} />
                <Route path="agrovet/discounts" element={<AgrovetDiscountsPage />} />
                <Route path="agrovet/purchasing" element={<AgrovetPurchasingPage />} />
                <Route path="agrovet/payables" element={<AgrovetPayablesPage />} />
                <Route path="agrovet/accounting" element={<AgrovetAccountingPage />} />
                <Route path="agrovet/credit" element={<AgrovetCreditPage />} />
                <Route path="agrovet/kpi" element={<AgrovetKpiPage />} />
                <Route path="agrovet/alerts" element={<AgrovetAlertsPage />} />
                <Route path="agrovet/audit-logs" element={<AgrovetAuditLogsPage />} />
              </Route>

                    </Routes>
                  </Suspense>
                </SubscriptionProvider>
              </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
