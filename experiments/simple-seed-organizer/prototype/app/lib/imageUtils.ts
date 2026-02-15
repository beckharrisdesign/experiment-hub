/**
 * Image utility functions for handling HEIC conversion and image optimization
 */

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
    
    // Resize if needed using canvas
    const resizedBlob = await resizeImage(blob as Blob, maxWidth, quality);
    
    // Create a new File from the converted blob
    const fileName = file.name.replace(/\.(heic|heif)$/i, '.png');
    return new File([resizedBlob], fileName, { type: 'image/png' });
  } catch (error) {
    console.error('Error converting HEIC to PNG:', error);
    throw new Error('Failed to convert HEIC image. Please try converting it to PNG/JPG first.');
  }
}

/**
 * Resize an image to a maximum width while maintaining aspect ratio
 */
async function resizeImage(blob: Blob, maxWidth: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      // Calculate new dimensions
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      // Create canvas and resize
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        'image/png',
        quality
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
 * Process any image file (HEIC or regular) and return optimized File
 */
export async function processImageFile(file: File, maxWidth: number = 1024, quality: number = 0.8): Promise<File> {
  // Convert HEIC if needed
  if (file.type === 'image/heic' || file.type === 'image/heif' || 
      file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
    return convertHeicToPng(file, maxWidth, quality);
  }
  
  // For other image types, just resize if needed
  const img = new Image();
  const url = URL.createObjectURL(file);
  
  return new Promise((resolve, reject) => {
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      // Only resize if image is larger than maxWidth
      if (img.width <= maxWidth) {
        resolve(file);
        return;
      }
      
      // Resize
      resizeImage(file, maxWidth, quality)
        .then((resizedBlob) => {
          const fileName = file.name.replace(/\.[^.]+$/, '.png');
          resolve(new File([resizedBlob], fileName, { type: 'image/png' }));
        })
        .catch(reject);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      // If it's not a valid image, return as-is
      resolve(file);
    };
    
    img.src = url;
  });
}
