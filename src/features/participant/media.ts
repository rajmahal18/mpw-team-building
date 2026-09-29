"use client";

export async function prepareParticipantFile(file: File, lowBandwidth: boolean): Promise<{ name: string; type: string; blob: Blob }> {
  if (!file.type.startsWith("image/")) return { name: file.name, type: file.type, blob: file };
  if (typeof document === "undefined" || typeof createImageBitmap === "undefined") return { name: file.name, type: file.type, blob: file };
  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = lowBandwidth ? 1100 : 1800;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return { name: file.name, type: file.type, blob: file };
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const outputType = "image/jpeg";
    const quality = lowBandwidth ? 0.68 : 0.84;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType, quality));
    if (!blob || blob.size >= file.size) return { name: file.name, type: file.type, blob: file };
    const base = file.name.replace(/\.[^.]+$/, "") || "proof";
    return { name: `${base}.jpg`, type: outputType, blob };
  } catch {
    return { name: file.name, type: file.type, blob: file };
  }
}
