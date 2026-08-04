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
