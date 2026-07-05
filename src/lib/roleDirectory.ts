import { api } from "@/lib/api";
import { ROLE_LABELS, type RoleLabelKey } from "@/types/rbac";

export interface ApiRole {
  id: string;
  name: string;
  description?: string;
  status?: string;
  permissions?: Array<{ id: string; action: string; subject: string }>;
}

export interface RoleOption {
  id: string;
  name: string;
  label: string;
}

const normalizeRoleKey = (value: string): RoleLabelKey | null => {
  const lower = value.trim().toLowerCase();
  const slug = lower.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

  const aliases: Record<string, RoleLabelKey> = {
    administrator: "admin",
    "super admin": "super_admin",
    "organization owner": "org_owner",
    "org owner": "org_owner",
    "owner / admin": "admin",
    manager: "manager",
    pharmacist: "pharmacist",
    cashier: "cashier",
    accountant: "accountant",
    "finance manager": "finance_manager",
    "store keeper": "storekeeper",
  };

  const key = aliases[lower] || aliases[slug] || (slug as RoleLabelKey);
  return ROLE_LABELS[key] ? key : null;
};

export const getRoleLabel = (value?: string | number | null): string => {
  if (value === null || value === undefined) return "User";

  const raw = String(value).trim();
  if (!raw) return "User";

  const normalized = normalizeRoleKey(raw);
  if (normalized) {
    return ROLE_LABELS[normalized] || raw;
  }

  const titleCase = raw
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return titleCase;
};

export const fetchRoleOptions = async (): Promise<RoleOption[]> => {
  const res = await api.get<{ success: boolean; data: ApiRole[] }>("/api/roles");
  const roles = res.data || [];

  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    label: getRoleLabel(role.name),
  }));
};
