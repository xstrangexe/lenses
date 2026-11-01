import { getSupabase } from "./supabase/client";

/**
 * A review's photo: shrunk in the browser, then uploaded to the order's own
 * folder of the `review-photos` bucket. A phone photo is 3 to 8 MB; the bucket
 * takes 3 MB and a buyer on mobile data should not send more than they must.
 */
const MAX_SIDE = 1200;
const JPEG_QUALITY = 0.8;

/** The size to draw at: longest side at most `max`, same ratio, whole pixels, never enlarged. */
export function fitWithin(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const scale = max / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** `<token>/<id>.jpg`: the folder name is what the upload rule checks. */
export function reviewPhotoPath(token: string, id: string): string {
  return `${token}/${id}.jpg`;
}

/** Rejects when the file cannot be read as an image, so the page can send the review without it. */
export async function shrinkPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_SIDE);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) throw new Error("The photo could not be encoded");
  return blob;
}

/** Uploads the shrunk photo and returns its public address; throws if the upload fails. */
export async function uploadReviewPhoto(token: string, photo: Blob): Promise<string> {
  const bucket = getSupabase().storage.from("review-photos");
  const path = reviewPhotoPath(token, crypto.randomUUID());
  const { error } = await bucket.upload(path, photo, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(error.message);
  return bucket.getPublicUrl(path).data.publicUrl;
}
