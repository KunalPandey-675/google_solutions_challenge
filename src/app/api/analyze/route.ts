import axios from "axios";

export const runtime = "nodejs";

const BACKEND_BASE = process.env.BACKEND_URL || "http://localhost:5001";

type AnalyzeRequestBody = {
  datasetPath?: string;
  api_url?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeRequestBody;
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
      const backendError =
        typeof details === "object"
          ? (details as { error?: string }).error
          : undefined;
      return Response.json(
        {
          error: backendError ?? "Failed to analyze dataset",
          details,
        },
        { status }
      );
    }

    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}