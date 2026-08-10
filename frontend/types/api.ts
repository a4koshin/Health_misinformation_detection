export type UserRole = "user" | "admin" | "healthcare_advisor";
export type AppLanguage = "so" | "en";

export type User = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url?: string | null;
  language_preference?: AppLanguage;
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
  review_status?: "pending" | "confirmed" | "corrected" | null;
  advisor_note?: string | null;
  original_claim_text?: string | null;
  corrected_claim_text?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  advisor_name?: string | null;
  reviewed_at?: string | null;
};

export type Conversation = Detection & {
  messages: StoredChatMessage[];
  enrichment_pending?: boolean;
};

export type DashboardStats = {
  total_users: number;
  total_admins: number;
  total_advisors?: number;
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
  claim: string;
  label: string | null;
  source?: string | null;
  created_at: string;
};

export type UserReportResponse = {
  total_rows: number;
  total_claims?: number;
  users_with_predictions?: number;
  reliable_count: number;
  non_reliable_count: number;
  reliable_percent?: number;
  non_reliable_percent?: number;
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

export type UserProfile = {
  name: string | null;
  email: string;
  avatar_url: string | null;
  language_preference: AppLanguage;
  role?: UserRole;
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
