import { api, setApiAuthToken } from "@/lib/api";
import { fetchRoleOptions } from "@/lib/roleDirectory";
import { saveFlowSession, clearFlowSession } from "@/lib/flowSession";
import { ensureOrganizationTypeDirectory, isAgrovetTypeName } from "@/lib/organizationTypeDirectory";
import type { User, UserRole } from "@/types/models";
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState
} from "react";

interface SignUpMeta {
  organizationName: string;
  organizationTypeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password?: string;
  businessUnit?: string;
  taxId?: string;
  registrationNumber?: string;
  licenseNumber?: string;
  website?: string;
  address?: {
    country: string;
    city: string;
    street?: string;
    state?: string;
    postalCode?: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  roleLoading: boolean;
  userRole: UserRole | null;
  organizationId: string | null;
  tempUserId: string | null;
  /** True once the current user's organization is resolved to be the
   * agrovet org type ("Agrovet Pharmacy") - drives agrovet-specific
   * dashboard/sidebar/routes without affecting any other org type. */
  isAgrovetOrg: boolean;

  signUp: (meta: SignUpMeta) => Promise<{ error: any; organizationId?: string; userId?: string }>;
  signIn: (identifier: string, password: string) => Promise<{ error: any; requiresOtp?: boolean; userId?: string; user?: User }>;
  verifyOtp: (code: string, flowToken?: string) => Promise<{ error: any; token?: string; user?: User }>;
  forgotPassword: (identifier: string) => Promise<{ error: any; userId?: string }>;
  resetPassword: (identifier: string, code: string, newPassword: string, confirmPassword: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
  setTempUserId: (id: string | null) => void;
}

const KNOWN_ROLES = new Set<UserRole>([
  "super_admin",
  "org_owner",
  "owner",
  "director",
  "medical_director",
  "admin",
  "manager",
  "dept_head",
  "doctor",
  "nurse",
  "receptionist",
  "pharmacist",
  "cashier",
  "cashier_agro",
  "cashier_vet",
  "accountant",
  "hr_manager",
  "storekeeper",
  "lab_technician",
  "radiologist",
  "ambulance_staff",
  "case_manager",
  "social_worker",
  "counselor",
  "legal_officer",
  "insurance_officer",
  "it_manager",
  "patient",
  "auditor",
  "cfo",
  "finance_manager",
  "procurement_officer",
  "warehouse_manager",
  "biomedical_engineer",
  "compliance_officer",
  "billing_officer",
  "ot_coordinator",
  "ward_manager",
  "quality_officer",
]);

const ROLE_ALIASES: Record<string, UserRole> = {
  administrator: "admin",
  manager: "manager",
  "super admin": "super_admin",
  "organization owner": "org_owner",
  "org owner": "org_owner",
  "hospital director": "director",
  "medical director": "medical_director",
  "finance manager": "finance_manager",
  "chief financial officer": "cfo",
  "hr manager": "hr_manager",
  "it manager": "it_manager",
  "procurement officer": "procurement_officer",
  "warehouse manager": "warehouse_manager",
  "billing officer": "billing_officer",
  "quality officer": "quality_officer",
  "compliance officer": "compliance_officer",
  "legal officer": "legal_officer",
  "insurance officer": "insurance_officer",
  "lab technician": "lab_technician",
  "social worker": "social_worker",
  "case manager": "case_manager",
  "store keeper": "storekeeper",
  "cashier agro": "cashier_agro",
  "cashier vet": "cashier_vet",
};

const ROLE_ID_ALIASES: Record<number, UserRole> = {
  2: "admin",
  9: "super_admin",
};

const normalizeRoleName = (role?: string | null): UserRole | null => {
  if (typeof role !== "string") return null;

  const lower = role.trim().toLowerCase();
  const slug = lower.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const mapped = ROLE_ALIASES[lower] || ROLE_ALIASES[slug] || slug;

  return KNOWN_ROLES.has(mapped as UserRole) ? (mapped as UserRole) : null;
};

// Fetched once per session from GET /api/roles so any role_id (not just the
// hardcoded super_admin/admin ones) can resolve to its real role name.
let roleDirectoryCache: Record<string, string> | null = null;
let roleDirectoryPromise: Promise<Record<string, string>> | null = null;

const ensureRoleDirectory = async (): Promise<Record<string, string>> => {
  if (roleDirectoryCache) return roleDirectoryCache;
  if (!roleDirectoryPromise) {
    roleDirectoryPromise = fetchRoleOptions()
      .then((roles) => {
        const map: Record<string, string> = {};
        roles.forEach((r) => {
          map[String(r.id)] = r.name;
        });
        roleDirectoryCache = map;
        return map;
      })
      .catch(() => ({}));
  }
  return roleDirectoryPromise;
};

const resolveNumericRole = (numericRole: number, directory?: Record<string, string>): UserRole | null => {
  if (ROLE_ID_ALIASES[numericRole]) return ROLE_ID_ALIASES[numericRole];

  const directoryName = directory?.[String(numericRole)];
  if (directoryName) return normalizeRoleName(directoryName);

  return null;
};

const normalizeRoleValue = (role: unknown, directory?: Record<string, string>): UserRole | null => {
  if (typeof role === "number") {
    return resolveNumericRole(role, directory);
  }

  if (typeof role === "string") {
    const trimmed = role.trim();
    const numericRole = Number(trimmed);
    if (trimmed !== "" && !Number.isNaN(numericRole)) {
      return resolveNumericRole(numericRole, directory);
    }

    return normalizeRoleName(role);
  }

  return null;
};

const getOrganizationId = (user: any): string | null => {
  return user?.organizationId || user?.organization_id || null;
};

const getUserId = (user: any): string | null => {
  return user?.id || user?.user_id || user?.userId || null;
};

/** The session/profile response only carries the org's numeric
 * organization_type_id (via the nested `organization` object) - resolve it
 * against the org-type directory to know if this is the agrovet tenant. */
const resolveIsAgrovetOrg = async (user: any): Promise<boolean> => {
  const typeId = user?.organization?.organization_type_id ?? user?.organization_type_id;
  if (!typeId) return false;
  const directory = await ensureOrganizationTypeDirectory();
  return isAgrovetTypeName(directory[String(typeId)]);
};

const persistAuthContext = (user: any) => {
  const organizationId = getOrganizationId(user);
  const userId = getUserId(user);
  localStorage.setItem("auth_user", JSON.stringify(user));

  if (organizationId) {
    localStorage.setItem("auth_organization_id", organizationId);
    localStorage.setItem("organization_id", organizationId);
  } else {
    localStorage.removeItem("auth_organization_id");
    localStorage.removeItem("organization_id");
  }

  if (userId) {
    localStorage.setItem("user_id", userId);
  } else {
    localStorage.removeItem("user_id");
  }

  return organizationId;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [tempUserId, setTempUserIdState] = useState<string | null>(null);
  const [isAgrovetOrg, setIsAgrovetOrg] = useState(false);

  const loadSession = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_organization_id');
        localStorage.removeItem('organization_id');
        localStorage.removeItem('user_id');
        setApiAuthToken(null);
        return;
      }

      setApiAuthToken(token);

      const validationResponse = await api.validateToken<{ success: boolean; data: any }>();
      if (!validationResponse.success) {
        throw new Error('Session validation failed');
      }

      const response = await api.get<{ success: boolean; data: any }>('/api/users/profile');
      if (response.success && response.data) {
        setUser(response.data);
        const directory = await ensureRoleDirectory();
        setUserRole(normalizeRoleValue(response.data?.role_id ?? response.data?.roleId ?? response.data?.role?.id ?? response.data?.role?.name ?? response.data?.role, directory));
        const orgId = persistAuthContext(response.data);
        setOrganizationId(orgId);
        localStorage.setItem('user_id', String(response.data?.id || response.data?.user_id || response.data?.userId || ''));
        if (orgId) localStorage.setItem('organization_id', orgId);
        setIsAgrovetOrg(await resolveIsAgrovetOrg(response.data));
      }
    } catch (error) {
      console.error("Failed to load session", error);
      // Clear invalid tokens and cached user
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_organization_id');
      localStorage.removeItem('user_id');
      localStorage.removeItem('organization_id');
      setApiAuthToken(null);
      setUser(null);
      setIsAgrovetOrg(false);
      setUserRole(null);
      setOrganizationId(null);
    } finally {
      setLoading(false);
      setRoleLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => {
      setApiAuthToken(null);
      setUser(null);
      setUserRole(null);
      setOrganizationId(null);
      setTempUserIdState(null);
      setIsAgrovetOrg(false);
      clearFlowSession();
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, []);

  // Periodically re-check that the backend session is still active, and again
  // whenever the tab regains focus. A 401 here is handled by api.ts's
  // handleResponse (clears storage and fires auth:session-expired), so we
  // just need to trigger the check and swallow the rejection.
  useEffect(() => {
    const revalidate = () => {
      if (!localStorage.getItem('auth_token')) return;
      api.validateToken().catch(() => {});
    };

    const interval = setInterval(revalidate, 5 * 60 * 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') revalidate();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', revalidate);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', revalidate);
    };
  }, []);

  const signUp = async (meta: SignUpMeta) => {
    try {
      const response = await api.post<{ success: boolean; message: string; data: { organizationId: string; userId: string; flowToken?: string; otpExpiresAt?: string } }>(
        '/api/auth/register',
        meta
      );

      setTempUserIdState(response.data.userId);

      if (response.data.flowToken) {
        saveFlowSession({
          token: response.data.flowToken,
          userId: response.data.userId,
          organizationId: response.data.organizationId,
          step: "subscribe",
          origin: "register",
          otpExpiresAt: response.data.otpExpiresAt,
        });
      }

      return {
        error: null,
        organizationId: response.data.organizationId,
        userId: response.data.userId
      };
    } catch (error: any) {
      return { error: { message: error.message || "Failed to register" } };
    }
  };

  const signIn = async (identifier: string, password: string) => {
    try {
      const response = await api.post<{ success: boolean; message: string; data: { requireOtp: boolean; userId: string; user: any; flowToken?: string; otpExpiresAt?: string } }>(
        '/api/auth/login',
        { identifier, password }
      );

      if (response.data.requireOtp) {
        setTempUserIdState(response.data.userId);
        if (response.data.flowToken) {
          saveFlowSession({
            token: response.data.flowToken,
            userId: response.data.userId,
            step: "verify-otp",
            origin: "login",
            otpExpiresAt: response.data.otpExpiresAt,
          });
        }
        return {
          error: null,
          requiresOtp: true,
          userId: response.data.userId,
          user: response.data.user
        };
      }

      // If no OTP required (maybe future case)
      return {
        error: null,
        requiresOtp: false,
        userId: response.data.userId,
        user: response.data.user
      };
    } catch (error: any) {
      return { error: { message: error.message || "Invalid credentials" } };
    }
  };

  const verifyOtp = async (code: string, flowToken?: string) => {
    try {
      const response = await api.post<{ success: boolean; message: string; data: { token: string; user: any } }>(
        '/api/auth/verify-otp',
        { code },
        flowToken ? { headers: { 'x-flow-token': flowToken } } : undefined
      );

      const { token, user: verifiedUser } = response.data;

      localStorage.setItem('auth_token', token);
      setApiAuthToken(token);
      const orgId = persistAuthContext(verifiedUser);
      const resolvedUserId = getUserId(verifiedUser);
      if (resolvedUserId) {
        localStorage.setItem('user_id', resolvedUserId);
      }

      setUser(verifiedUser);
      const directory = await ensureRoleDirectory();
      setUserRole(normalizeRoleValue(verifiedUser?.role_id ?? verifiedUser?.roleId ?? verifiedUser?.role?.id ?? verifiedUser?.role?.name ?? verifiedUser?.role, directory));
      setOrganizationId(orgId);
      setTempUserIdState(null);
      clearFlowSession();

      // The verify-otp response only carries a bare organizationId, not the
      // nested organization (needed to resolve organization_type_id) - pull
      // the full profile now so isAgrovetOrg (and everything else) is
      // correct before the caller navigates to the dashboard.
      await refreshRole();

      return {
        error: null,
        token,
        user: verifiedUser
      };
    } catch (error: any) {
      return { error: { message: error.message || "Invalid OTP" } };
    }
  };

  const forgotPassword = async (identifier: string) => {
    try {
      const response = await api.post<{ success: boolean; message: string; data: { userId: string } }>(
        '/api/auth/forgot-password',
        { identifier }
      );
      
      setTempUserIdState(response.data.userId);

      return {
        error: null,
        userId: response.data.userId
      };
    } catch (error: any) {
      return { error: { message: error.message || "Failed to send reset code" } };
    }
  };

  const resetPassword = async (identifier: string, code: string, newPassword: string, confirmPassword: string) => {
    try {
      const response = await api.post<{ success: boolean; message: string }>(
        '/api/auth/reset-password',
        { identifier, code, newPassword, confirmPassword }
      );

      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message || "Failed to reset password" } };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_organization_id');
    localStorage.removeItem('user_id');
    localStorage.removeItem('organization_id');
    setApiAuthToken(null);
    setUser(null);
    setUserRole(null);
    setOrganizationId(null);
    setTempUserIdState(null);
    setIsAgrovetOrg(false);
    clearFlowSession();
  };

  // Re-fetches the current user's profile and re-derives role/org from it.
  // Used after onboarding creates/joins an organization, so the in-memory
  // role updates immediately and ProtectedRoute doesn't bounce the user
  // back to /onboarding while waiting for a full page reload.
  const refreshRole = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any }>('/api/users/profile');
      if (response.success && response.data) {
        setUser(response.data);
        const directory = await ensureRoleDirectory();
        setUserRole(normalizeRoleValue(response.data?.role_id ?? response.data?.roleId ?? response.data?.role?.id ?? response.data?.role?.name ?? response.data?.role, directory));
        const orgId = persistAuthContext(response.data);
        setOrganizationId(orgId);
        if (orgId) localStorage.setItem('organization_id', orgId);
        setIsAgrovetOrg(await resolveIsAgrovetOrg(response.data));
      }
    } catch (error) {
      console.error("Failed to refresh role", error);
    }
  };

  const setTempUserId = (id: string | null) => {
    setTempUserIdState(id);
  };

  const value: AuthContextType = {
    user,
    loading,
    roleLoading,
    userRole,
    organizationId,
    tempUserId,
    isAgrovetOrg,
    signUp,
    signIn,
    verifyOtp,
    forgotPassword,
    resetPassword,
    signOut,
    refreshRole,
    setTempUserId
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}


