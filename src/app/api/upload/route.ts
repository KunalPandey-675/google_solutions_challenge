import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export const runtime = "nodejs";

function toForwardSlashPath(filePath: string) {
  return filePath.replace(/\\/g, "/");
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    // Use /tmp for serverless (Vercel) and local uploads folder for development
    const uploadsDir = process.env.NODE_ENV === "production" 
      ? path.join("/tmp", "uploads")
      : path.join(process.cwd(), "uploads");
    
    await mkdir(uploadsDir, { recursive: true });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${Date.now()}-${safeName || "dataset.csv"}`;
    const absoluteFilePath = path.join(uploadsDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(absoluteFilePath, buffer);

    return Response.json({ datasetPath: toForwardSlashPath(absoluteFilePath) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload file";
    return Response.json({ error: message }, { status: 500 });
  }
}