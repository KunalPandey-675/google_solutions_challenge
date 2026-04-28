import axios from "axios";

export const runtime = "nodejs";

const BACKEND_BASE = process.env.BACKEND_URL || "http://localhost:5001";

type DetectBiasRequestBody = {
  datasetPath?: string;
  api_url?: string;
};

function extractBackendErrorMessage(details: unknown, fallback: string, status?: number) {
  if (typeof details === "string") {
    const trimmed = details.trim();
    if (trimmed) {
      if (/^<!doctype html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) {
        return status ? `${status} ${fallback}` : fallback;
      }

      const firstLine = trimmed.split("\n", 1)[0].trim();
      return firstLine || trimmed;
    }
  }

  if (details && typeof details === "object") {
    const error = (details as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) {
      return error.trim();
    }
  }

  if (status) {
    return `${status} ${fallback}`;
  }

  return fallback;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DetectBiasRequestBody;
    const datasetPath = body.datasetPath?.trim();
    const apiUrl = body.api_url?.trim();

    if (!datasetPath) {
      return Response.json({ error: "datasetPath is required" }, { status: 400 });
    }

    const payload: Record<string, string> = { dataset_path: datasetPath };
    if (apiUrl) {
      payload.api_url = apiUrl;
    }

    const { data } = await axios.post(`${BACKEND_BASE}/detect-bias`, payload);

    return Response.json(data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 502;
      const details = error.response?.data ?? error.message;
      const backendError = extractBackendErrorMessage(details, "Failed to analyze dataset", status);
      return Response.json(
        {
          error: backendError,
          details,
        },
        { status }
      );
    }

    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}