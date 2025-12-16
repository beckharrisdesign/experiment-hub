import { promises as fs } from 'fs';
import path from 'path';
import sizeOf from 'image-size';

export interface ImageMetadata {
  width?: number;
  height?: number;
  format?: string;
  fileSize?: number;
  resolution?: string;
}

/**
 * Get image metadata from a file path
 * @param imagePath - Absolute path to the image file
 * @returns Image metadata or null if unable to read
 */
export async function getImageMetadata(imagePath: string): Promise<ImageMetadata | null> {
  try {
    console.log('[Image Metadata] Reading image from path:', imagePath);
    
    // Check if file exists
    await fs.access(imagePath);
    console.log('[Image Metadata] File exists');
    
    // Get file stats for size
    const stats = await fs.stat(imagePath);
    const fileSize = stats.size;
    console.log('[Image Metadata] File size:', fileSize, 'bytes');
    
    // Check file extension
    const ext = path.extname(imagePath).slice(1).toUpperCase();
    console.log('[Image Metadata] File extension:', ext);
    
    // SVG files don't have fixed dimensions - try to parse viewBox or dimensions from file
    if (ext === 'SVG') {
      try {
        const svgContent = await fs.readFile(imagePath, 'utf-8');
        // Try to extract width and height from SVG
        const widthMatch = svgContent.match(/width=["']?(\d+(?:\.\d+)?)/i);
        const heightMatch = svgContent.match(/height=["']?(\d+(?:\.\d+)?)/i);
        const viewBoxMatch = svgContent.match(/viewBox=["']?\d+\s+\d+\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/i);
        
        let width: number | undefined;
        let height: number | undefined;
        
        if (widthMatch && heightMatch) {
          width = parseFloat(widthMatch[1]);
          height = parseFloat(heightMatch[1]);
        } else if (viewBoxMatch) {
          width = parseFloat(viewBoxMatch[1]);
          height = parseFloat(viewBoxMatch[2]);
        }
        
        console.log('[Image Metadata] SVG dimensions extracted:', { width, height });
        
        return {
          width,
          height,
          format: 'SVG',
          fileSize: fileSize,
          resolution: width && height ? `${width}×${height}` : undefined,
        };
      } catch (svgError) {
        console.warn('[Image Metadata] Failed to parse SVG:', svgError);
        return {
          format: 'SVG',
          fileSize: fileSize,
        };
      }
    }
    
    // Get image dimensions and format using image-size for raster images
    try {
      console.log('[Image Metadata] Attempting to read dimensions with image-size...');
      // Read file as buffer for image-size
      const imageBuffer = await fs.readFile(imagePath);
      const dimensions = sizeOf(imageBuffer);
      console.log('[Image Metadata] Dimensions read:', dimensions);
      
      const result = {
        width: dimensions.width,
        height: dimensions.height,
        format: dimensions.type?.toUpperCase() || ext,
        fileSize: fileSize,
        resolution: dimensions.width && dimensions.height ? `${dimensions.width}×${dimensions.height}` : undefined,
      };
      
      console.log('[Image Metadata] Returning metadata:', result);
      return result;
    } catch (dimError) {
      console.error('[Image Metadata] image-size failed:', dimError);
      // If image-size fails, at least return file size
      return {
        format: ext,
        fileSize: fileSize,
      };
    }
  } catch (error) {
    console.error('[Image Metadata] Error reading image:', error);
    if (error instanceof Error) {
      console.error('[Image Metadata] Error message:', error.message);
      console.error('[Image Metadata] Error stack:', error.stack);
    }
    return null;
  }
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

