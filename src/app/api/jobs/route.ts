import axios from "axios";

export const runtime = "nodejs";

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

export async function GET() {
  try {
    const { data } = await axios.get("http://localhost:5001/jobs");
    return Response.json(data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 502;
      const details = error.response?.data ?? error.message;
      const backendError = extractBackendErrorMessage(details, "Failed to load monitoring jobs", status);
      return Response.json({ success: false, error: backendError, details }, { status });
    }

    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}