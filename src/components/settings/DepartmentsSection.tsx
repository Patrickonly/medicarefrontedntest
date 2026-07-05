import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Loader2, Save, Building2, Users, Pencil, X, Check,
} from "lucide-react";
import { ROLE_LABELS } from "@/types/rbac";

interface Department {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  head_id: string | null;
  created_at: string;
}

interface StaffMember {
  id: string;
  role: string;
  department_id: string | null;
  first_name: string;
  last_name: string;
}

interface Props {
  onBack: () => void;
}

export default function DepartmentsSection({ onBack }: Props) {
  const { success, error: toastError } = useToast();
  const { organizationId, userRole } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New department form
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Assign staff
  const [assigningDept, setAssigningDept] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState("");

  const isAdmin = ["org_owner", "admin", "super_admin", "director"].includes(userRole || "");

  useEffect(() => {
    if (organizationId) {
      fetchDepartments();
      fetchStaff();
    }
  }, [organizationId]);

  const fetchDepartments = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: Department[] }>("/api/departments");
      setDepartments(res.data || []);
    } catch (fetchError: any) {
      toastError("Error", fetchError.message || "Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    if (!organizationId) return;
    try {
      const res = await api.get<{ success: boolean; data: any[] }>("/api/users");
      const users = res.data || [];
      setStaff(
        users.map((u) => ({
          id: u.id,
          role: u.role?.name || u.role || "",
          department_id: u.departmentId || u.department_id || null,
          first_name: u.firstName || u.first_name || "Unknown",
          last_name: u.lastName || u.last_name || "",
        }))
      );
    } catch {
      // Non-fatal — staff assignment list stays empty
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newCode.trim() || !organizationId) {
      toastError("Error", "Name and code are required");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/departments", {
        name: newName.trim(),
        code: newCode.trim().toUpperCase(),
      });
      success("Success", "Department created");
      setNewName("");
      setNewCode("");
      setShowForm(false);
      fetchDepartments();
    } catch (createError: any) {
      toastError("Error", createError.message || "Failed to create department");
    } finally {
      setSaving(false);
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await api.put(`/api/departments/${id}`, { name: editName.trim() });
      success("Success", "Department renamed");
      setEditingId(null);
      fetchDepartments();
    } catch (renameError: any) {
      toastError("Error", renameError.message || "Failed to rename department");
    }
  };

  const handleToggleActive = async (dept: Department) => {
    try {
      await api.put(`/api/departments/${dept.id}`, { is_active: !dept.is_active });
      success("Success", dept.is_active ? "Department deactivated" : "Department activated");
      fetchDepartments();
    } catch (toggleError: any) {
      toastError("Error", toggleError.message || "Failed to update department");
    }
  };

  const handleAssignStaff = async (deptId: string) => {
    if (!selectedStaff) return;
    try {
      await api.put(`/api/users`, { id: selectedStaff, departmentId: deptId });
      success("Success", "Staff assigned to department");
      setAssigningDept(null);
      setSelectedStaff("");
      fetchStaff();
    } catch (assignError: any) {
      toastError("Error", assignError.message || "Failed to assign staff");
    }
  };

  const deptStaff = (deptId: string) => staff.filter((s) => s.department_id === deptId);
  const unassignedStaff = staff.filter((s) => !s.department_id);

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft size={16} /> Back to Settings
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl text-foreground">Departments</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{departments.length} department{departments.length !== 1 ? "s" : ""}</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowForm(!showForm)} size="sm" variant={showForm ? "outline" : "default"} className="gap-2">
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Cancel" : "New Department"}
          </Button>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="medicare-card space-y-3">
          <h3 className="font-semibold text-foreground text-sm">Create Department</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Department Name *</label>
              <input className="medicare-input" placeholder="e.g. Cardiology" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Code *</label>
              <input className="medicare-input font-mono uppercase" placeholder="e.g. CARD" value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={saving} size="sm" className="gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Create
          </Button>
        </div>
      )}

      {/* Departments List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : departments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No departments yet</p>
          <p className="text-sm mt-1">Create your first department to organize staff</p>
        </div>
      ) : (
        <div className="space-y-3">
          {departments.map((dept) => {
            const assigned = deptStaff(dept.id);
            const isEditing = editingId === dept.id;
            const isAssigning = assigningDept === dept.id;

            return (
              <div key={dept.id} className={`medicare-card ${!dept.is_active ? "opacity-60" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input className="medicare-input h-8 text-sm" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleRename(dept.id)}><Check size={14} /></Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingId(null)}><X size={14} /></Button>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-foreground text-sm">{dept.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Code: <span className="font-mono">{dept.code}</span> · {assigned.length} staff
                          {!dept.is_active && <span className="ml-2 text-destructive">(Inactive)</span>}
                        </p>
                      </>
                    )}
                  </div>
                  {isAdmin && !isEditing && (
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setEditingId(dept.id); setEditName(dept.name); }}>
                        <Pencil size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setAssigningDept(isAssigning ? null : dept.id)}>
                        <Users size={14} className="mr-1" /> Assign
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-muted-foreground" onClick={() => handleToggleActive(dept)}>
                        {dept.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Assign Staff */}
                {isAssigning && (
                  <div className="mt-3 pt-3 border-t border-border space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Assign a staff member</label>
                    <div className="flex gap-2">
                      <select className="medicare-input flex-1" value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)}>
                        <option value="">Select staff...</option>
                        {unassignedStaff.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.first_name} {s.last_name} ({(ROLE_LABELS as Record<string, string>)[s.role] || s.role})
                          </option>
                        ))}
                      </select>
                      <Button size="sm" disabled={!selectedStaff} onClick={() => handleAssignStaff(dept.id)}>Assign</Button>
                    </div>
                  </div>
                )}

                {/* Current Staff */}
                {assigned.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Assigned Staff</p>
                    <div className="flex flex-wrap gap-2">
                      {assigned.map((s) => (
                        <span key={s.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-muted text-muted-foreground">
                          {s.first_name} {s.last_name}
                          <span className="opacity-60">· {(ROLE_LABELS as Record<string, string>)[s.role] || s.role}</span>
                        </span>
                      ))}
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
