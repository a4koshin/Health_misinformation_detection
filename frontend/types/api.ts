export type UserRole = "user" | "admin" | "doctor";
export type AppLanguage = "so" | "en";

export type User = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url?: string | null;
  language_preference?: AppLanguage;
  is_active?: boolean;
  deletion_requested_at?: string | null;
  created_at: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  user?: User;
};

export type RegisterPayload = {
  email: string;
  password: string;
  full_name?: string;
};

export type StoredChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type Detection = {
  id: string;
  user_id: string;
  input_text: string;
  claim_text?: string;
  label: string | null;
  confidence: number | null;
  label_confidence?: number | null;
  is_medical?: boolean;
  source?: string | null;
  somali_status: string;
  created_at: string;
  message_count?: number;
  needs_review?: boolean;
  review_status?:
    | "awaiting_assignment"
    | "pending"
    | "confirmed"
    | "corrected"
    | null;
  advisor_note?: string | null;
  original_claim_text?: string | null;
  corrected_claim_text?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  advisor_id?: string | null;
  advisor_name?: string | null;
  assigned_by_id?: string | null;
  assigned_by_name?: string | null;
  assigned_at?: string | null;
  reviewed_at?: string | null;
  is_active?: boolean;
};

export type AppointmentStatus = "pending" | "confirmed" | "declined";

export type DoctorAvailability = {
  id: string;
  doctor_user_id: string;
  starts_at: string;
  ends_at: string;
  created_at?: string | null;
  booked?: boolean;
};

export type Appointment = {
  id: string;
  user_id: string;
  doctor_user_id: string;
  prediction_id: string;
  availability_id?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  note: string | null;
  status: AppointmentStatus;
  payment_status?: string | null;
  payment_amount?: string | null;
  payment_currency?: string | null;
  payment_method?: string | null;
  payer_phone?: string | null;
  payment_reference?: string | null;
  paid_at?: string | null;
  queue_number?: number | null;
  created_at: string | null;
  updated_at: string | null;
  user_name?: string | null;
  user_email?: string | null;
  doctor_name?: string | null;
  doctor_job_title?: string | null;
  doctor_workplace?: string | null;
  claim_text?: string | null;
  corrected_claim_text?: string | null;
};

export type Conversation = Detection & {
  messages: StoredChatMessage[];
  enrichment_pending?: boolean;
};

export type DashboardStats = {
  total_users: number;
  total_admins: number;
  total_advisors?: number;
  total_doctors?: number;
  total_regular_users?: number;
  total_detections: number;
  total_predictions: number;
  reliable_count: number;
  misinformation_count: number;
  non_reliable_count: number;
  pending_count: number;
  review_pending_count?: number;
  review_confirmed_count?: number;
  review_corrected_count?: number;
  daily: {
    date: string;
    label: string;
    count: number;
    reliable?: number;
    non_reliable?: number;
  }[];
  active_users: { name: string; count: number }[];
  label_mix?: { name: string; reliable: number; non_reliable: number }[];
  roles?: { name: string; count: number; key: string }[];
  sources?: { name: string; count: number }[];
  reviews?: { name: string; count: number; key: string }[];
  users_table: {
    id: string;
    full_name: string | null;
    email: string;
    role: string;
    predictions: number;
    reliable: number;
    non_reliable: number;
    joined: string | null;
  }[];
};

export type UserDashboardStats = {
  total_predictions: number;
  reliable_count: number;
  non_reliable_count: number;
  chat_count: number;
};

export type ReportRow = {
  conversation_id?: string;
  id?: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  user_role?: UserRole | string | null;
  claim: string;
  label: string | null;
  review_status?:
    | "awaiting_assignment"
    | "pending"
    | "confirmed"
    | "corrected"
    | null;
  advisor_id?: string | null;
  advisor_name?: string | null;
  advisor_email?: string | null;
  source?: string | null;
  created_at: string;
};

export type ReportDoctor = {
  id: string;
  name: string;
  email: string;
  corrections: number;
};

export type UserReportResponse = {
  total_rows: number;
  total_claims?: number;
  users_with_predictions?: number;
  reliable_count: number;
  non_reliable_count: number;
  reliable_percent?: number;
  non_reliable_percent?: number;
  doctors_who_can_review?: number;
  doctors?: ReportDoctor[];
  rows: ReportRow[];
};

export type AdminUserCreate = {
  email: string;
  full_name?: string | null;
  password: string;
  role?: UserRole;
};

export type AdminUserUpdate = {
  email?: string;
  full_name?: string | null;
  password?: string;
  role?: UserRole;
};

export type DoctorProfile = {
  id: string;
  user_id: string;
  name: string;
  license: string;
  license_url?: string | null;
  profile_image: string;
  profile_image_url?: string | null;
  job_title: string;
  workplace: string;
  email?: string;
  role?: UserRole | string;
  is_active?: boolean;
  full_name?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type DoctorCreate = {
  email: string;
  password: string;
  name: string;
  job_title: string;
  workplace: string;
  license: File;
  profile_image: File;
};

export type DoctorUpdate = {
  email?: string;
  password?: string;
  name?: string;
  job_title?: string;
  workplace?: string;
  license?: File | null;
  profile_image?: File | null;
};

export type DatasetPredictionRow = {
  row: number;
  text: string;
  prediction: string | null;
  error: string | null;
};

export type DatasetPredictionResponse = {
  total_rows: number;
  processed_rows: number;
  reliable_count: number;
  misinformation_count: number;
  error_count: number;
  saved_rows?: number;
  results: DatasetPredictionRow[];
};

export type NotificationType =
  | "review_queued"
  | "review_assigned"
  | "claim_corrected"
  | "appointment_requested"
  | "appointment_confirmed"
  | "appointment_declined";

export type AppNotification = {
  id: string;
  recipient_id: string;
  audience: "user" | "advisor" | "admin";
  type: NotificationType;
  title: string;
  body: string;
  prediction_id: string | null;
  actor_id: string | null;
  actor_role: string | null;
  actor_name: string | null;
  other_user_id: string | null;
  other_user_name: string | null;
  claim_excerpt: string | null;
  corrected_excerpt: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string | null;
  unread: boolean;
};

export type NotificationListResponse = {
  items: AppNotification[];
  unread_count: number;
};

export type AuditLog = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string | null;
};

export type PaymentStatus = "success" | "rejected" | "failed";

export type PaymentTransaction = {
  id: string;
  user_id: string;
  doctor_user_id: string | null;
  prediction_id: string | null;
  appointment_id: string | null;
  status: PaymentStatus | string;
  amount: string | null;
  currency: string | null;
  payment_method: string | null;
  payer_phone: string | null;
  payment_reference: string | null;
  payment_invoice_id: string | null;
  payment_request_id: string | null;
  response_code: string | null;
  message: string | null;
  created_at: string | null;
  user_name: string | null;
  user_email: string | null;
  doctor_name: string | null;
};

export type UserProfile = {
  name: string | null;
  email: string;
  avatar_url: string | null;
  language_preference: AppLanguage;
  role?: UserRole;
  is_active?: boolean;
  deletion_requested_at?: string | null;
  created_at?: string | null;
};

export type UpdateProfileRequest = {
  name: string;
  email: string;
};

export type ChangePasswordRequest = {
  current_password: string;
  new_password: string;
};

export type UpdateLanguageRequest = {
  language: AppLanguage;
};

export type DeleteAccountRequest = {
  password: string;
};

export type SettingsMessageResponse = {
  message: string;
  avatar_url?: string | null;
  language_preference?: AppLanguage;
  deleted_count?: number;
  name?: string | null;
  email?: string;
};
