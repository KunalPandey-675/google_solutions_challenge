import axios from "axios";

export const runtime = "nodejs";

const BACKEND_BASE = process.env.BACKEND_URL || "http://localhost:5001";

type CreateJobRequestBody = {
  dataset_path?: string;
  api_url?: string;
  frequency?: string;
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
    const body = (await request.json()) as CreateJobRequestBody;
    const datasetPath = body.dataset_path?.trim();
    const apiUrl = body.api_url?.trim();
    const frequency = body.frequency?.trim();

    if (!datasetPath) {
      return Response.json({ success: false, error: "dataset_path is required" }, { status: 400 });
    }

    if (!apiUrl) {
      return Response.json({ success: false, error: "api_url is required" }, { status: 400 });
    }

    const payload: Record<string, string> = {
      dataset_path: datasetPath,
      api_url: apiUrl,
    };

    if (frequency) {
      payload.frequency = frequency;
    }

    const { data } = await axios.post(`${BACKEND_BASE}/create-job`, payload);

    return Response.json(data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 502;
      const details = error.response?.data ?? error.message;
      const backendError = extractBackendErrorMessage(details, "Failed to create monitoring setup", status);
      return Response.json(
        {
          success: false,
          error: backendError,
          details,
        },
        { status }
      );
    }

    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}