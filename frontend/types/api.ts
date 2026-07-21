export type UserRole = "user" | "admin";

export type User = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
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
  label: string | null;
  confidence: number | null;
  somali_status: string;
  created_at: string;
  message_count?: number;
};

export type Conversation = Detection & {
  messages: StoredChatMessage[];
};

export type DashboardStats = {
  total_users: number;
  total_admins: number;
  total_detections: number;
  reliable_count: number;
  misinformation_count: number;
  pending_count: number;
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
  results: DatasetPredictionRow[];
};
