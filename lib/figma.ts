/**
 * Figma API Client (READ-ONLY)
 * 
 * This client only implements read operations.
 * No destructive operations (delete, modify) are included.
 */

const FIGMA_API_BASE = 'https://api.figma.com/v1';

function getHeaders() {
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) {
    throw new Error('FIGMA_ACCESS_TOKEN not set in environment variables');
  }
  return {
    'X-Figma-Token': token,
  };
}

/**
 * Get file metadata and contents
 */
export async function getFile(fileKey: string) {
  const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get specific nodes from a file
 */
export async function getFileNodes(fileKey: string, nodeIds: string[]) {
  const ids = nodeIds.join(',');
  const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${ids}`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get images (exported renders) from a file
 */
export async function getImages(fileKey: string, nodeIds: string[], format: 'png' | 'svg' | 'jpg' | 'pdf' = 'png', scale = 2) {
  const ids = nodeIds.join(',');
  const response = await fetch(
    `${FIGMA_API_BASE}/images/${fileKey}?ids=${ids}&format=${format}&scale=${scale}`,
    { headers: getHeaders() }
  );
  if (!response.ok) {
    throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Parse a Figma URL to extract file key and node ID
 */
export function parseFigmaUrl(url: string): { fileKey: string; nodeId?: string } | null {
  // Matches: figma.com/file/KEY/..., figma.com/design/KEY/..., figma.com/make/KEY/...
  const match = url.match(/figma\.com\/(?:file|design|make)\/([a-zA-Z0-9]+)/);
  if (!match) return null;
  
  const fileKey = match[1];
  
  // Extract node-id from query params
  const nodeIdMatch = url.match(/node-id=([^&]+)/);
  const nodeId = nodeIdMatch ? decodeURIComponent(nodeIdMatch[1]) : undefined;
  
  return { fileKey, nodeId };
}
