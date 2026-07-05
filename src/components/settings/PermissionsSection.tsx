import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Loader2, Save, ArrowLeft, ChevronDown, ChevronRight,
  UserCheck, AlertTriangle,
} from "lucide-react";
import { ROLE_LABELS, ROLE_HIERARCHY, canGrantRole } from "@/types/rbac";
import type { UserRole } from "@/types/models";
import { fetchRoleOptions, type RoleOption } from "@/lib/roleDirectory";

interface MemberWithProfile {
  id: string;
  role: UserRole;
  is_active: boolean;
  granted_at: string;
  first_name: string;
  last_name: string;
  role_id?: string;
}

const ASSIGNABLE_ROLES: UserRole[] = [
  "admin", "director", "medical_director", "dept_head",
  "doctor", "nurse", "receptionist", "pharmacist",
  "cashier", "accountant", "hr_manager", "storekeeper",
  "lab_technician", "radiologist", "ambulance_staff",
  "case_manager", "social_worker", "counselor",
  "legal_officer", "insurance_officer", "it_manager", "auditor",
];

interface Props {
  onBack: () => void;
}

export default function PermissionsSection({ onBack }: Props) {
  const { success, error: toastError } = useToast();
  const { user, organizationId, userRole } = useAuth();
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [roleChanges, setRoleChanges] = useState<Record<string, UserRole>>({});

  const currentUserRole = (userRole || "patient") as UserRole;

  useEffect(() => {
    if (organizationId) {
      fetchMembers();
      fetchRoleOptions().then(setRoleOptions).catch(() => undefined);
    }
  }, [organizationId]);

  const fetchMembers = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: any[] }>("/api/users");
      const users = res.data || [];
      setMembers(
        users.map((u) => ({
          id: u.id,
          role: (u.role?.name || u.role || "patient") as UserRole,
          role_id: String(u.role_id ?? u.roleId ?? u.role?.id ?? ""),
          is_active: u.isActive ?? u.is_active ?? true,
          granted_at: u.createdAt || u.created_at || new Date().toISOString(),
          first_name: u.firstName || u.first_name || "Unknown",
          last_name: u.lastName || u.last_name || "",
        }))
      );
    } catch (fetchError: any) {
      toastError("Error", fetchError.message || "Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (member: MemberWithProfile) => {
    const newRole = roleChanges[member.id];
    if (!newRole || newRole === member.role) return;

    if (!canGrantRole(currentUserRole, newRole)) {
      toastError("Error", "You cannot assign a role equal to or higher than your own");
      return;
    }

    const newRoleId = roleOptions.find((r) => r.name === newRole)?.id;
    if (!newRoleId) {
      toastError("Error", "Could not resolve the selected role");
      return;
    }

    setSaving(member.id);
    try {
      await api.put(`/api/users/${member.id}`, { roleId: newRoleId });
      success("Success", `Role updated to ${ROLE_LABELS[newRole] || newRole}`);
      setRoleChanges((prev) => { const n = { ...prev }; delete n[member.id]; return n; });
      fetchMembers();
    } catch (updateError: any) {
      toastError("Error", updateError.message || "Failed to update role");
    } finally {
      setSaving(null);
    }
  };

  const grantableRoles = ASSIGNABLE_ROLES.filter((r) => canGrantRole(currentUserRole, r));

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft size={16} /> Back to Settings
      </button>

      <div>
        <h2 className="font-display font-bold text-xl text-foreground">Permissions & RBAC</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Manage staff roles and access levels</p>
      </div>

      {/* Role Hierarchy Legend */}
      <div className="medicare-card">
        <h3 className="font-semibold text-foreground text-sm mb-3">Role Hierarchy</h3>
        <div className="flex flex-wrap gap-2">
          {grantableRoles.slice(0, 10).map((r) => (
            <span key={r} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
              <Shield size={10} />
              {ROLE_LABELS[r] || r}
              <span className="text-muted-foreground ml-0.5">L{ROLE_HIERARCHY[r]}</span>
            </span>
          ))}
          {grantableRoles.length > 10 && (
            <span className="text-xs text-muted-foreground self-center">+{grantableRoles.length - 10} more</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
          <AlertTriangle size={12} />
          You can only assign roles below your current level ({ROLE_LABELS[currentUserRole] || currentUserRole})
        </p>
      </div>

      {/* Members List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <UserCheck size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No active members</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((m) => {
            const isExpanded = expandedMember === m.id;
            const isSelf = m.id === user?.id;
            const pendingRole = roleChanges[m.id];
            const canEdit = !isSelf && canGrantRole(currentUserRole, m.role);

            return (
              <div key={m.id} className="medicare-card">
                <button
                  onClick={() => setExpandedMember(isExpanded ? null : m.id)}
                  className="w-full flex items-center gap-3 text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {m.first_name[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {m.first_name} {m.last_name} {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{ROLE_LABELS[m.role] || m.role}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    ROLE_HIERARCHY[m.role] >= 75 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                    : ROLE_HIERARCHY[m.role] >= 50 ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    : "bg-muted text-muted-foreground"
                  }`}>
                    L{ROLE_HIERARCHY[m.role]}
                  </span>
                  {isExpanded ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
                </button>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-border">
                    {!canEdit ? (
                      <p className="text-sm text-muted-foreground">
                        {isSelf ? "You cannot change your own role." : "You don't have permission to modify this member's role."}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <label className="text-xs font-medium text-muted-foreground block">Change Role</label>
                        <select
                          className="medicare-input"
                          value={pendingRole || m.role}
                          onChange={(e) => setRoleChanges((prev) => ({ ...prev, [m.id]: e.target.value as UserRole }))}
                        >
                          <option value={m.role}>{ROLE_LABELS[m.role] || m.role} (current)</option>
                          {grantableRoles.filter((r) => r !== m.role).map((r) => (
                            <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                          ))}
                        </select>
                        {pendingRole && pendingRole !== m.role && (
                          <Button onClick={() => handleRoleChange(m)} disabled={saving === m.id} size="sm" className="gap-2">
                            {saving === m.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            Save Role Change
                          </Button>
                        )}
                      </div>
                    )}
                    <div className="mt-3 text-xs text-muted-foreground">
                      Joined: {new Date(m.granted_at).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
