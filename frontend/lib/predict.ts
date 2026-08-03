import { apiFetch } from "@/lib/api";

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
