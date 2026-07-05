// ============================================
// MEDICARE ONE — RBAC Constants & Permissions
// ============================================

import type { UserRole, Permission } from "./models";

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  org_owner: 90,
  director: 85,
  cfo: 82,
  medical_director: 80,
  admin: 75,
  manager: 74,
  finance_manager: 72,
  dept_head: 70,
  compliance_officer: 68,
  quality_officer: 67,
  auditor: 65,
  doctor: 60,
  it_manager: 60,
  ward_manager: 58,
  ot_coordinator: 58,
  warehouse_manager: 56,
  nurse: 55,
  pharmacist: 55,
  procurement_officer: 52,
  biomedical_engineer: 52,
  lab_technician: 50,
  radiologist: 50,
  case_manager: 50,
  hr_manager: 50,
  social_worker: 45,
  counselor: 45,
  legal_officer: 45,
  insurance_officer: 45,
  accountant: 45,
  billing_officer: 42,
  cashier: 40,
  receptionist: 40,
  storekeeper: 40,
  ambulance_staff: 40,
  patient: 10,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  org_owner: "Organization Owner",
  director: "Hospital Director",
  medical_director: "Medical Director",
  admin: "Administrator",
  manager: "Manager",
  dept_head: "Department Head",
  doctor: "Doctor / Specialist",
  nurse: "Nurse",
  receptionist: "Receptionist",
  pharmacist: "Pharmacist",
  cashier: "Cashier",
  accountant: "Accountant",
  hr_manager: "HR Manager",
  storekeeper: "Storekeeper",
  lab_technician: "Lab Technician",
  radiologist: "Radiologist",
  ambulance_staff: "Ambulance Staff",
  case_manager: "Case Manager",
  social_worker: "Social Worker",
  counselor: "Counselor",
  legal_officer: "Legal Officer",
  insurance_officer: "Insurance Officer",
  it_manager: "IT Manager",
  patient: "Patient",
  auditor: "Auditor",
  cfo: "Chief Financial Officer",
  finance_manager: "Finance Manager",
  procurement_officer: "Procurement Officer",
  warehouse_manager: "Warehouse Manager",
  biomedical_engineer: "Biomedical Engineer",
  compliance_officer: "Compliance Officer",
  billing_officer: "Billing Officer",
  ot_coordinator: "OT Coordinator",
  ward_manager: "Ward Manager",
  quality_officer: "Quality Officer",
};

export const MODULE_PERMISSIONS = {
  patients: {
    view: "patients.view",
    create: "patients.create",
    edit: "patients.edit",
    delete: "patients.delete",
    view_records: "patients.view_records",
    export: "patients.export",
  },
  appointments: {
    view: "appointments.view",
    create: "appointments.create",
    edit: "appointments.edit",
    cancel: "appointments.cancel",
  },
  emr: {
    view: "emr.view",
    create: "emr.create",
    edit: "emr.edit",
    sign: "emr.sign",
    view_confidential: "emr.view_confidential",
  },
  pharmacy: {
    view: "pharmacy.view",
    dispense: "pharmacy.dispense",
    manage_stock: "pharmacy.manage_stock",
    procurement: "pharmacy.procurement",
  },
  billing: {
    view: "billing.view",
    create: "billing.create",
    approve_discount: "billing.approve_discount",
    process_refund: "billing.process_refund",
    view_reports: "billing.view_reports",
  },
  lab: {
    view: "lab.view",
    create_order: "lab.create_order",
    enter_results: "lab.enter_results",
    verify_results: "lab.verify_results",
  },
  hr: {
    view: "hr.view",
    manage_staff: "hr.manage_staff",
    manage_payroll: "hr.manage_payroll",
    view_reports: "hr.view_reports",
  },
  admin: {
    manage_roles: "admin.manage_roles",
    manage_settings: "admin.manage_settings",
    view_audit: "admin.view_audit",
    manage_org: "admin.manage_org",
  },
  one_stop: {
    view: "one_stop.view",
    manage_cases: "one_stop.manage_cases",
    view_confidential: "one_stop.view_confidential",
  },
} as const;

// Default role → permission mapping
export const ROLE_PERMISSIONS: Partial<Record<UserRole, string[]>> = {
  super_admin: ["*"],
  org_owner: ["*"],
  director: ["*"],
  admin: [
    MODULE_PERMISSIONS.patients.view, MODULE_PERMISSIONS.patients.create,
    MODULE_PERMISSIONS.appointments.view, MODULE_PERMISSIONS.appointments.create,
    MODULE_PERMISSIONS.billing.view, MODULE_PERMISSIONS.billing.create,
    MODULE_PERMISSIONS.hr.view, MODULE_PERMISSIONS.hr.manage_staff,
    MODULE_PERMISSIONS.admin.manage_roles, MODULE_PERMISSIONS.admin.manage_settings,
    MODULE_PERMISSIONS.admin.view_audit,
  ],
  doctor: [
    MODULE_PERMISSIONS.patients.view, MODULE_PERMISSIONS.patients.view_records,
    MODULE_PERMISSIONS.appointments.view, MODULE_PERMISSIONS.appointments.edit,
    MODULE_PERMISSIONS.emr.view, MODULE_PERMISSIONS.emr.create, MODULE_PERMISSIONS.emr.edit, MODULE_PERMISSIONS.emr.sign,
    MODULE_PERMISSIONS.lab.view, MODULE_PERMISSIONS.lab.create_order,
    MODULE_PERMISSIONS.pharmacy.view,
  ],
  nurse: [
    MODULE_PERMISSIONS.patients.view,
    MODULE_PERMISSIONS.appointments.view,
    MODULE_PERMISSIONS.emr.view, MODULE_PERMISSIONS.emr.create,
  ],
  pharmacist: [
    MODULE_PERMISSIONS.pharmacy.view, MODULE_PERMISSIONS.pharmacy.dispense,
    MODULE_PERMISSIONS.pharmacy.manage_stock,
    MODULE_PERMISSIONS.patients.view,
  ],
  receptionist: [
    MODULE_PERMISSIONS.patients.view, MODULE_PERMISSIONS.patients.create,
    MODULE_PERMISSIONS.appointments.view, MODULE_PERMISSIONS.appointments.create,
    MODULE_PERMISSIONS.billing.view,
  ],
  lab_technician: [
    MODULE_PERMISSIONS.lab.view, MODULE_PERMISSIONS.lab.enter_results,
    MODULE_PERMISSIONS.patients.view,
  ],
  cashier: [
    MODULE_PERMISSIONS.billing.view, MODULE_PERMISSIONS.billing.create,
    MODULE_PERMISSIONS.patients.view,
  ],
  cfo: ["*"],
  finance_manager: [
    MODULE_PERMISSIONS.billing.view, MODULE_PERMISSIONS.billing.create,
    MODULE_PERMISSIONS.billing.approve_discount, MODULE_PERMISSIONS.billing.process_refund,
    MODULE_PERMISSIONS.billing.view_reports,
    MODULE_PERMISSIONS.hr.view, MODULE_PERMISSIONS.hr.manage_payroll,
    MODULE_PERMISSIONS.admin.view_audit,
  ],
  procurement_officer: [
    MODULE_PERMISSIONS.pharmacy.view, MODULE_PERMISSIONS.pharmacy.procurement,
    MODULE_PERMISSIONS.pharmacy.manage_stock,
  ],
  warehouse_manager: [
    MODULE_PERMISSIONS.pharmacy.view, MODULE_PERMISSIONS.pharmacy.manage_stock,
    MODULE_PERMISSIONS.pharmacy.procurement,
  ],
  biomedical_engineer: [
    MODULE_PERMISSIONS.patients.view,
  ],
  compliance_officer: [
    MODULE_PERMISSIONS.admin.view_audit,
    MODULE_PERMISSIONS.patients.view, MODULE_PERMISSIONS.patients.export,
    MODULE_PERMISSIONS.emr.view,
  ],
  billing_officer: [
    MODULE_PERMISSIONS.billing.view, MODULE_PERMISSIONS.billing.create,
    MODULE_PERMISSIONS.patients.view,
  ],
  ot_coordinator: [
    MODULE_PERMISSIONS.appointments.view, MODULE_PERMISSIONS.appointments.create, MODULE_PERMISSIONS.appointments.edit,
    MODULE_PERMISSIONS.patients.view,
  ],
  ward_manager: [
    MODULE_PERMISSIONS.patients.view, MODULE_PERMISSIONS.emr.view,
    MODULE_PERMISSIONS.appointments.view,
  ],
  quality_officer: [
    MODULE_PERMISSIONS.admin.view_audit, MODULE_PERMISSIONS.patients.view,
    MODULE_PERMISSIONS.emr.view,
  ],
};

export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  if (userPermissions.includes("*")) return true;
  return userPermissions.includes(requiredPermission);
}

export function canGrantRole(granterRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_HIERARCHY[granterRole] > ROLE_HIERARCHY[targetRole];
}
