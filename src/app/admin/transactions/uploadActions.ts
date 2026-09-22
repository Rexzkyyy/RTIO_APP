"use server";

import { put } from "@vercel/blob";

export async function uploadAdminProof(formData: FormData): Promise<{ url: string }> {
  const file = formData.get("file") as File;

  if (!file || file.size === 0) {
    throw new Error("File tidak valid.");
  }

  const filename = `payments/admin-${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const blob = await put(filename, buffer, {
    access: "public",
    contentType: file.type || "image/jpeg",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return { url: blob.url };
}
