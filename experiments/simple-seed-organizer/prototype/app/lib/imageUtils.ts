/**
 * Image utility functions for handling HEIC conversion and image optimization
 */

/** Max size per photo before we reject (512KB) - prevents storing huge high-res images */
export const MAX_PHOTO_BYTES = 512 * 1024;

/** Max data URL length (data:image/jpeg;base64, + base64 payload ~4/3 of bytes) */
export const MAX_PHOTO_BASE64_LENGTH = 50 + Math.ceil(MAX_PHOTO_BYTES * (4 / 3));

/**
 * Convert HEIC file to PNG with acceptable size
 * Uses heic2any library for browser-based conversion
 */
export async function convertHeicToPng(file: File, maxWidth: number = 1024, quality: number = 0.8): Promise<File> {
  // Check if file is HEIC/HEIF
  const isHeic = file.type === 'image/heic' || 
                 file.type === 'image/heif' || 
                 file.name.toLowerCase().endsWith('.heic') ||
                 file.name.toLowerCase().endsWith('.heif');

  if (!isHeic) {
    // Not HEIC, return as-is (will be handled by normal image processing)
    return file;
  }

  try {
    // Dynamically import heic2any to avoid SSR issues
    const heic2any = (await import('heic2any')).default;
    
    // Convert HEIC to blob
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/png',
      quality: quality,
    });

    // heic2any returns an array, get the first result
    const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
    
    // Resize and compress to JPEG for smaller storage
    const resizedBlob = await resizeImage(blob as Blob, maxWidth, quality, 'image/jpeg');
    const fileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    return new File([resizedBlob], fileName, { type: 'image/jpeg' });
  } catch (error) {
    console.error('Error converting HEIC to PNG:', error);
    throw new Error('Failed to convert HEIC image. Please try converting it to PNG/JPG first.');
  }
}

type ImageFormat = 'image/png' | 'image/jpeg';

/**
 * Resize an image to a maximum width while maintaining aspect ratio.
 * Uses JPEG for smaller file size (better for photos); PNG for HEIC conversion.
 */
async function resizeImage(
  blob: Blob,
  maxWidth: number,
  quality: number,
  format: ImageFormat = 'image/jpeg'
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error('Failed to create blob from canvas'));
        },
        format,
        format === 'image/jpeg' ? quality : undefined
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Create a thumbnail for list/gallery views (smaller, faster to load).
 */
export async function createThumbnail(blob: Blob, maxWidth: number = 256): Promise<Blob> {
  return resizeImage(blob, maxWidth, 0.7, 'image/jpeg');
}

/**
 * Process any image file and return optimized File.
 * Always re-encodes to JPEG for consistent size control; never returns original.
 * Compresses until under MAX_PHOTO_BYTES if needed.
 */
export async function processImageFile(
  file: File,
  maxWidth: number = 1024,
  quality: number = 0.8
): Promise<File> {
  if (file.type === 'image/heic' || file.type === 'image/heif' ||
      file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
    let converted = await convertHeicToPng(file, maxWidth, quality);
    // If still over limit, re-compress to JPEG with lower quality
    if (converted.size > MAX_PHOTO_BYTES) {
      let q = quality;
      while (q >= 0.25) {
        const blob = await resizeImage(converted, maxWidth, q, 'image/jpeg');
        converted = new File([blob], converted.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
        if (converted.size <= MAX_PHOTO_BYTES) break;
        q -= 0.15;
      }
      if (converted.size > MAX_PHOTO_BYTES) {
        throw new Error(`Image too large. Max ${MAX_PHOTO_BYTES / 1024}KB per photo. Try a smaller image.`);
      }
    }
    return converted;
  }

  const img = new Image();
  const url = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    img.onload = async () => {
      URL.revokeObjectURL(url);

      let result: File | null = null;
      let currentQuality = quality;
      let currentWidth = Math.min(img.width, maxWidth);

      // Always re-encode (never return original) - ensures size control
      while (currentQuality >= 0.25) {
        const resizedBlob = await resizeImage(file, currentWidth, currentQuality, 'image/jpeg');
        result = new File([resizedBlob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });

        if (result.size <= MAX_PHOTO_BYTES) break;

        // Reduce quality/size and retry
        currentQuality -= 0.15;
        if (currentQuality < 0.25 && currentWidth > 512) {
          currentWidth = Math.max(512, Math.floor(currentWidth * 0.75));
          currentQuality = 0.8;
        }
      }

      if (!result || result.size > MAX_PHOTO_BYTES) {
        reject(new Error(`Image too large. Max ${MAX_PHOTO_BYTES / 1024}KB per photo. Try a smaller image.`));
      } else {
        resolve(result);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}
