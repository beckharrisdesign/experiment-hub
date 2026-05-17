import { ACCEPTED_MIMES, MAX_EDGE_PX, type AcceptedMime } from "./constants";

export function isAcceptedMime(type: string): type is AcceptedMime {
  return (ACCEPTED_MIMES as readonly string[]).includes(type);
}

export function mimeRejectionMessage(type: string): string {
  return `Unsupported file type (“${type || "unknown"}”). Use JPEG, PNG, or WebP.`;
}

export function oversizeMessage(width: number, height: number): string {
  const longest = Math.max(width, height);
  return `Image is ${longest}px on the longest edge. For smoother editing, use something under ${MAX_EDGE_PX}px.`;
}

export function isOversized(width: number, height: number): boolean {
  return Math.max(width, height) > MAX_EDGE_PX;
}

export async function decodeImageFile(file: File): Promise<HTMLImageElement> {
  if (!isAcceptedMime(file.type)) {
    throw new Error(mimeRejectionMessage(file.type));
  }

  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not prepare canvas for decoding.");
      ctx.drawImage(bitmap, 0, 0);
      const dataUrl = canvas.toDataURL(file.type === "image/jpeg" ? "image/jpeg" : "image/png");
      return loadImageElement(dataUrl);
    } finally {
      bitmap.close();
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await loadImageElement(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      if (img.decode) {
        try {
          await img.decode();
        } catch {
          reject(new Error("Could not decode this image."));
          return;
        }
      }
      resolve(img);
    };
    img.onerror = () => reject(new Error("Could not decode this image."));
    img.src = src;
  });
}
