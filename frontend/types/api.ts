export type User = {
  id: string;
  email: string;
  full_name: string | null;
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

export type Detection = {
  id: string;
  user_id: string;
  input_text: string;
  label: string | null;
  confidence: number | null;
  somali_status: string;
  created_at: string;
};
