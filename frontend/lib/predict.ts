import { apiFetch } from "@/lib/api";

export type SourcePlatform = "facebook" | "youtube" | "web";

export type PredictionSource = {
  title: string;
  url: string;
  platform?: SourcePlatform | string;
  image?: string | null;
  profile?: string | null;
};

export type TextPredictionResponse = {
  prediction_id: number | string;
  is_medical: boolean;
  label: string | null;
  label_confidence: number | null;
  message: string;
  transcript: string;
  sources?: PredictionSource[];
  similar_terms?: string[];
  model?: string | null;
  pred_id?: number | null;
  class_probs?: number[] | null;
};

export type MediaPredictionResponse = {
  prediction_id: number | string;
  kind: "audio" | "video";
  filename: string | null;
  transcript: string;
  is_medical: boolean;
  label: string | null;
  label_confidence: number | null;
  message: string;
  sources?: PredictionSource[];
  similar_terms?: string[];
  model?: string | null;
  pred_id?: number | null;
  class_probs?: number[] | null;
};

export type TranscribeMediaResponse = {
  transcribed_text: string;
};

/** @deprecated Prefer transcribeMedia — kept for callers that still import this name. */
export type TranscribeVideoResponse = TranscribeMediaResponse;

export async function predictText(
  token: string,
  text: string,
): Promise<TextPredictionResponse> {
  return apiFetch<TextPredictionResponse>(
    "/api/predict",
    {
      method: "POST",
      body: JSON.stringify({ text }),
    },
    token,
  );
}

/** Upload audio or video → Somali text only (then call predictText with the result). */
export async function transcribeMedia(
  token: string,
  file: File,
  kind: "audio" | "video" = "video",
): Promise<TranscribeMediaResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", kind);

  return apiFetch<TranscribeMediaResponse>(
    "/api/transcribe",
    {
      method: "POST",
      body: formData,
    },
    token,
  );
}

/** @deprecated Use transcribeMedia(token, file, "video"). */
export async function transcribeVideo(
  token: string,
  file: File,
): Promise<TranscribeMediaResponse> {
  return transcribeMedia(token, file, "video");
}

export async function predictMedia(
  token: string,
  file: File,
  kind: "audio" | "video",
): Promise<MediaPredictionResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", kind);

  return apiFetch<MediaPredictionResponse>(
    "/api/predict/media",
    {
      method: "POST",
      body: formData,
    },
    token,
  );
}
