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
  enrichment_pending?: boolean;
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
  enrichment_pending?: boolean;
};

export type EnrichmentResponse = {
  prediction_id: number | string;
  message: string;
  sources?: PredictionSource[];
  similar_terms?: string[];
  enrichment_pending?: boolean;
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

export async function enrichPrediction(
  token: string,
  predictionId: number | string,
): Promise<EnrichmentResponse> {
  return apiFetch<EnrichmentResponse>(
    `/api/predict/${predictionId}/enrich`,
    { method: "POST" },
    token,
  );
}

/** Social Facebook / YouTube / other link → Somali text only. */
export async function transcribeMediaUrl(
  token: string,
  url: string,
  kind: "audio" | "video" = "video",
): Promise<TranscribeMediaResponse> {
  return apiFetch<TranscribeMediaResponse>(
    "/api/transcribe/url",
    {
      method: "POST",
      body: JSON.stringify({ url, kind }),
      signal: AbortSignal.timeout(600_000),
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
      signal: AbortSignal.timeout(600_000),
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
