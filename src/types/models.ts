// ============================================
// MEDICARE ONE — Domain Type System
// Enterprise-grade TypeScript interfaces
// ============================================

// ── Base Types ──────────────────────────────
export type UUID = string;
export type ISO8601 = string;
export type Currency = number;

export interface AuditFields {
  created_at: ISO8601;
  updated_at: ISO8601;
  created_by?: UUID;
  updated_by?: UUID;
  deleted_at?: ISO8601 | null;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Enums ───────────────────────────────────
export type UserRole =
  | "super_admin"
  | "org_owner"
  | "owner"
  | "director"
  | "medical_director"
  | "admin"
  | "manager"
  | "dept_head"
  | "doctor"
  | "nurse"
  | "receptionist"
  | "pharmacist"
  | "cashier"
  | "cashier_agro"
  | "cashier_vet"
  | "accountant"
  | "hr_manager"
  | "storekeeper"
  | "lab_technician"
  | "radiologist"
  | "ambulance_staff"
  | "case_manager"
  | "social_worker"
  | "counselor"
  | "legal_officer"
  | "insurance_officer"
  | "it_manager"
  | "patient"
  | "auditor"
  | "cfo"
  | "finance_manager"
  | "procurement_officer"
  | "warehouse_manager"
  | "biomedical_engineer"
  | "compliance_officer"
  | "billing_officer"
  | "ot_coordinator"
  | "ward_manager"
  | "quality_officer";

export type OrganizationType =
  | "hospital"
  | "clinic"
  | "pharmacy"
  | "agrovet"
  | "medical_center"
  | "diagnostic_center"
  | "specialist_center";

export type AppointmentStatus =
  | "requested"
  | "confirmed"
  | "checked_in"
  | "waiting"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show"
  | "rescheduled";

export type PatientStatus =
  | "active"
  | "inactive"
  | "discharged"
  | "critical"
  | "follow_up"
  | "deceased";

export type LabOrderStatus =
  | "ordered"
  | "specimen_collected"
  | "in_progress"
  | "completed"
  | "verified"
  | "critical"
  | "cancelled";

export type BillingStatus =
  | "draft"
  | "pending"
  | "partial"
  | "paid"
  | "overdue"
  | "insurance_pending"
  | "refunded"
  | "waived";

export type InventoryStatus = "in_stock" | "low_stock" | "critical" | "out_of_stock" | "expiring_soon";

export type TriageLevel = "red" | "orange" | "yellow" | "green" | "blue";

export type CaseStatus = "active" | "follow_up" | "closed" | "escalated" | "referred";

export type CasePriority = "critical" | "high" | "medium" | "low";

// ── Organizations ───────────────────────────
export interface Organization extends AuditFields {
  id: UUID;
  name: string;
  type: OrganizationType;
  code: string;
  license_number?: string;
  accreditation?: string;
  address: Address;
  phone: string;
  email: string;
  website?: string;
  logo_url?: string;
  is_active: boolean;
  subscription_plan?: string;
  business_unit?: string;
  tax_id?: string;
  registration_number?: string;
  settings: OrganizationSettings;
}

export interface OrganizationSettings {
  timezone: string;
  currency: string;
  language: string;
  modules_enabled: string[];
  branding: {
    primary_color?: string;
    secondary_color?: string;
  };
}

export interface Address {
  street: string;
  city: string;
  state?: string;
  country: string;
  postal_code?: string;
  coordinates?: { lat: number; lng: number };
}

export interface Department extends AuditFields {
  id: UUID;
  organization_id: UUID;
  name: string;
  code: string;
  head_id?: UUID;
  is_active: boolean;
  description?: string;
}

// ── Users ───────────────────────────────────
export interface User extends AuditFields {
  id: UUID;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login?: ISO8601;
  organization_id?: UUID;
  department_id?: UUID;
  role?: UserRole;
  branch?: string;
  status?: "active" | "inactive";
}

export interface UserWithRole extends User {
  roles: RoleAssignment[];
}

export interface RoleAssignment {
  id: UUID;
  user_id: UUID;
  role: UserRole;
  organization_id: UUID;
  department_id?: UUID;
  granted_by: UUID;
  granted_at: ISO8601;
  expires_at?: ISO8601;
  is_active: boolean;
}

export interface Permission {
  id: UUID;
  code: string;
  name: string;
  module: string;
  description: string;
}

// ── Patients ────────────────────────────────
export interface Patient extends AuditFields {
  id: UUID;
  organization_id: UUID;
  patient_code: string;
  first_name: string;
  last_name: string;
  date_of_birth: ISO8601;
  gender: "male" | "female" | "other";
  blood_type?: string;
  phone: string;
  email?: string;
  address?: Address;
  emergency_contact?: EmergencyContact;
  insurance?: PatientInsurance;
  allergies: string[];
  status: PatientStatus;
  avatar_url?: string;
  national_id?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface PatientInsurance {
  provider: string;
  policy_number: string;
  group_number?: string;
  coverage_type: string;
  valid_until: ISO8601;
}

// ── Medical Records ─────────────────────────
export interface MedicalRecord extends AuditFields {
  id: UUID;
  patient_id: UUID;
  organization_id: UUID;
  visit_id?: UUID;
  record_type: "consultation" | "lab_result" | "imaging" | "prescription" | "procedure" | "note";
  title: string;
  content: string;
  attachments?: string[];
  is_confidential: boolean;
  signed_by?: UUID;
  signed_at?: ISO8601;
}

export interface VitalSigns {
  id: UUID;
  patient_id: UUID;
  visit_id: UUID;
  recorded_by: UUID;
  recorded_at: ISO8601;
  temperature?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  notes?: string;
}

// ── Appointments ────────────────────────────
export interface Appointment extends AuditFields {
  id: UUID;
  organization_id: UUID;
  patient_id: UUID;
  patient?: Patient;
  doctor_id: UUID;
  doctor?: User;
  department_id: UUID;
  department?: Department;
  appointment_type: "new_visit" | "follow_up" | "consultation" | "emergency" | "telemedicine" | "vaccination" | "procedure";
  scheduled_date: ISO8601;
  scheduled_time: string;
  duration_minutes: number;
  status: AppointmentStatus;
  chief_complaint?: string;
  notes?: string;
  queue_number?: number;
}

// ── Visits / Encounters ─────────────────────
export interface Visit extends AuditFields {
  id: UUID;
  organization_id: UUID;
  patient_id: UUID;
  appointment_id?: UUID;
  visit_type: "outpatient" | "inpatient" | "emergency" | "telemedicine";
  department_id: UUID;
  attending_doctor_id: UUID;
  admission_date?: ISO8601;
  discharge_date?: ISO8601;
  status: "active" | "completed" | "transferred" | "discharged";
  diagnosis?: Diagnosis[];
  vitals?: VitalSigns[];
  notes?: string;
  discharge_summary?: string;
}

export interface Diagnosis {
  code: string;
  description: string;
  type: "primary" | "secondary";
  notes?: string;
}

// ── Prescriptions ───────────────────────────
export interface Prescription extends AuditFields {
  id: UUID;
  organization_id: UUID;
  patient_id: UUID;
  visit_id: UUID;
  doctor_id: UUID;
  items: PrescriptionItem[];
  status: "active" | "dispensed" | "partially_dispensed" | "cancelled" | "expired";
  notes?: string;
  valid_until: ISO8601;
}

export interface PrescriptionItem {
  id: UUID;
  medication_id: UUID;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions?: string;
  is_dispensed: boolean;
}

// ── Lab Orders ──────────────────────────────
export interface LabOrder extends AuditFields {
  id: UUID;
  order_code: string;
  organization_id: UUID;
  patient_id: UUID;
  patient?: Patient;
  visit_id: UUID;
  ordered_by: UUID;
  doctor?: User;
  test_name: string;
  test_category: string;
  priority: "normal" | "urgent" | "stat";
  status: LabOrderStatus;
  specimen_type?: string;
  specimen_collected_at?: ISO8601;
  results?: LabResult[];
  turnaround_hours?: number;
  notes?: string;
}

export interface LabResult {
  parameter: string;
  value: string;
  unit: string;
  reference_range: string;
  is_abnormal: boolean;
}

// ── Pharmacy / Medications ──────────────────
export interface Medication extends AuditFields {
  id: UUID;
  organization_id: UUID;
  name: string;
  generic_name: string;
  category: string;
  dosage_form: string;
  strength: string;
  unit: string;
  manufacturer?: string;
  barcode?: string;
  requires_prescription: boolean;
  is_controlled: boolean;
  contraindications?: string[];
  interactions?: string[];
}

export interface InventoryItem extends AuditFields {
  id: UUID;
  organization_id: UUID;
  medication_id?: UUID;
  medication?: Medication;
  item_name: string;
  category: string;
  batch_number: string;
  expiry_date: ISO8601;
  quantity: number;
  min_quantity: number;
  max_quantity: number;
  unit_price: Currency;
  selling_price: Currency;
  supplier_id?: UUID;
  location: string;
  status: InventoryStatus;
}

// ── Billing ─────────────────────────────────
export interface Invoice extends AuditFields {
  id: UUID;
  invoice_number: string;
  organization_id: UUID;
  patient_id: UUID;
  patient?: Patient;
  visit_id?: UUID;
  items: InvoiceItem[];
  subtotal: Currency;
  tax: Currency;
  discount: Currency;
  total: Currency;
  amount_paid: Currency;
  balance: Currency;
  status: BillingStatus;
  due_date: ISO8601;
  payment_method?: string;
  insurance_claim_id?: UUID;
  notes?: string;
}

export interface InvoiceItem {
  id: UUID;
  description: string;
  category: "consultation" | "lab" | "imaging" | "pharmacy" | "procedure" | "room" | "other";
  quantity: number;
  unit_price: Currency;
  total: Currency;
}

export interface InsuranceClaim extends AuditFields {
  id: UUID;
  claim_number: string;
  organization_id: UUID;
  patient_id: UUID;
  invoice_id: UUID;
  insurer_id: UUID;
  insurer_name: string;
  amount_claimed: Currency;
  amount_approved?: Currency;
  status: "submitted" | "under_review" | "approved" | "rejected" | "resubmitted" | "paid";
  submitted_at: ISO8601;
  responded_at?: ISO8601;
  rejection_reason?: string;
}

// ── Staff / HR ──────────────────────────────
export interface StaffMember extends AuditFields {
  id: UUID;
  user_id: UUID;
  user?: User;
  organization_id: UUID;
  department_id: UUID;
  department?: Department;
  employee_code: string;
  job_title: string;
  contract_type: "permanent" | "contract" | "temporary" | "intern";
  hire_date: ISO8601;
  shift: string;
  salary?: Currency;
  status: "on_duty" | "off_duty" | "on_leave" | "suspended" | "terminated";
  qualifications?: string[];
  licenses?: StaffLicense[];
}

export interface StaffLicense {
  type: string;
  number: string;
  issued_by: string;
  valid_until: ISO8601;
}

// ── Wards / Beds ────────────────────────────
export interface Ward extends AuditFields {
  id: UUID;
  organization_id: UUID;
  name: string;
  category: "general" | "icu" | "pediatric" | "maternity" | "surgical" | "isolation" | "nicu" | "psychiatric";
  total_beds: number;
  occupied_beds: number;
  available_beds: number;
  floor?: string;
  nurse_station?: string;
}

export interface Bed {
  id: UUID;
  ward_id: UUID;
  bed_number: string;
  status: "available" | "occupied" | "maintenance" | "reserved";
  patient_id?: UUID;
  admission_date?: ISO8601;
}

// ── Emergency ───────────────────────────────
export interface EmergencyCase extends AuditFields {
  id: UUID;
  case_code: string;
  organization_id: UUID;
  patient_id?: UUID;
  patient_name: string;
  age?: number;
  gender?: string;
  triage_level: TriageLevel;
  chief_complaint: string;
  arrival_mode: "walk_in" | "ambulance" | "referral" | "police";
  arrival_time: ISO8601;
  assigned_doctor_id?: UUID;
  assigned_doctor?: User;
  status: "triage" | "assessment" | "treatment" | "observation" | "admitted" | "discharged" | "transferred" | "deceased";
  vital_signs?: VitalSigns;
  notes?: string;
  disposition?: string;
}

// ── One-Stop Center ─────────────────────────
export interface OneStopCase extends AuditFields {
  id: UUID;
  case_code: string;
  organization_id: UUID;
  client_code: string; // anonymized
  age?: number;
  gender?: string;
  case_type: string;
  priority: CasePriority;
  status: CaseStatus;
  assigned_team: CaseTeamMember[];
  medical_notes?: string;
  counseling_notes?: string;
  legal_notes?: string;
  social_notes?: string;
  protection_plan?: string;
  referrals?: CaseReferral[];
  follow_up_date?: ISO8601;
  is_confidential: boolean;
}

export interface CaseTeamMember {
  user_id: UUID;
  role: string;
  name: string;
}

export interface CaseReferral {
  to_organization?: string;
  to_department?: string;
  reason: string;
  date: ISO8601;
  status: "pending" | "accepted" | "completed";
}

// ── Audit ───────────────────────────────────
export interface AuditLog {
  id: UUID;
  organization_id: UUID;
  user_id: UUID;
  user_name: string;
  action: string;
  resource_type: string;
  resource_id?: UUID;
  details?: string;
  ip_address?: string;
  user_agent?: string;
  risk_level: "low" | "medium" | "high" | "critical";
  timestamp: ISO8601;
}

// ── Notifications ───────────────────────────
export interface Notification {
  id: UUID;
  user_id: UUID;
  organization_id: UUID;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "danger";
  category: "appointment" | "lab" | "pharmacy" | "billing" | "emergency" | "system" | "security";
  is_read: boolean;
  action_url?: string;
  created_at: ISO8601;
}

// ── Dashboard / Analytics ───────────────────
export interface DashboardStats {
  total_patients: number;
  total_appointments_today: number;
  revenue_mtd: Currency;
  bed_occupancy_rate: number;
  active_emergencies: number;
  pending_lab_orders: number;
  low_stock_items: number;
  staff_on_duty: number;
}

export interface TrendDataPoint {
  label: string;
  value: number;
  previousValue?: number;
}

export type BillingCycle = "monthly" | "quarterly" | "yearly";
export type PaymentMethod = "card" | "momo" | "bank_transfer";
export type SubscriptionStatus = "active" | "expired" | "cancelled" | "pending";

export interface Subscription extends AuditFields {
  id: UUID;
  organization_id: UUID;
  plan_name: string;
  billing_cycle: BillingCycle;
  amount: Currency;
  payment_method: PaymentMethod;
  start_date: ISO8601;
  end_date: ISO8601;
  status: SubscriptionStatus;
  auto_renew: boolean;
}

export interface TempUser {
  id: UUID;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  organization_name: string;
  organization_type: OrganizationType;
  organization_business_unit?: string;
  organization_address?: Address;
  organization_tax_id?: string;
  organization_registration_number?: string;
  organization_license_number?: string;
  organization_website?: string;
  otp: string;
  otp_expires_at: ISO8601;
  subscription_purchased: boolean;
  subscription_plan?: string;
  subscription_billing_cycle?: BillingCycle;
  subscription_payment_method?: PaymentMethod;
  subscription_amount?: number;
}

export interface DepartmentMetrics {
  department_id: UUID;
  department_name: string;
  patients_seen: number;
  revenue: Currency;
  avg_wait_time: number;
  satisfaction_score: number;
}
