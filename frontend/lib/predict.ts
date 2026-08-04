import { apiFetch } from "@/lib/api";

export type TextPredictionResponse = {
  prediction_id: number | string;
  is_medical: boolean;
  label: string | null;
  label_confidence: number | null;
  topic: string | null;
  topic_confidence: number | null;
  message: string;
  transcript: string;
};

export type MediaPredictionResponse = {
  prediction_id: number | string;
  kind: "audio" | "video";
  filename: string | null;
  transcript: string;
  is_medical: boolean;
  label: string | null;
  label_confidence: number | null;
  topic: string | null;
  topic_confidence: number | null;
  message: string;
};

export type TranscribeVideoResponse = {
  transcribed_text: string;
};

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

/** Upload a video → Somali text only (then call predictText with the result). */
export async function transcribeVideo(
  token: string,
  file: File,
): Promise<TranscribeVideoResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<TranscribeVideoResponse>(
    "/api/transcribe",
    {
      method: "POST",
      body: formData,
    },
    token,
  );
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
