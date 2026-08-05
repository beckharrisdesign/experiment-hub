import './lib/load-env.js';
import express from 'express';
import { readFile, readdir, writeFile, rename, unlink, stat } from 'fs/promises';
import { PDFDocument } from 'pdf-lib';
import { fileURLToPath } from 'url';
import { basename, dirname, join, resolve, sep } from 'path';
import { existsSync } from 'fs';
import OpenAI from 'openai';
import { loadTaxonomy } from './lib/taxonomy-loader.js';

// Parse comma-delimited string, handling quoted values
function parseCommaDelimitedString(str) {
  if (!str || typeof str !== 'string') return [];
  
  // Simple split by comma, then trim each item
  const result = str
    .split(',')
    .map(item => {
      // Remove quotes if present and trim
      let trimmed = item.trim();
      if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
          (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        trimmed = trimmed.slice(1, -1).trim();
      }
      return trimmed;
    })
    .filter(item => item.length > 0);
  
  return result;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3004;

// Construct the OpenAI client lazily. The SDK throws on an empty apiKey, so
// building it at module load made an API key mandatory just to boot — even
// though AI suggestions are optional and every other feature works without one.
let openaiClient = null;
function getOpenAI() {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

// Get PDFs directory path from environment variable or default to 'pdfs'
function getPDFsDirectory() {
  const pdfsDir = process.env.PDFS_DIR || 'pdfs';
  // If it's an absolute path, use it as-is; otherwise, make it relative to project root
  if (pdfsDir.startsWith('/') || (process.platform === 'win32' && /^[A-Z]:/.test(pdfsDir))) {
    return pdfsDir;
  }
  return join(__dirname, pdfsDir);
}

const PDFS_DIR = getPDFsDirectory();

// Activity log file path
const LOG_FILE = join(__dirname, 'activity-log.json');

class PathValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PathValidationError';
    this.statusCode = 400;
  }
}

/**
 * Resolve a client-supplied filename to a path inside PDFS_DIR.
 *
 * Every route takes a filename straight from the URL or body, so this is the
 * single choke point that keeps `../` out of read, write, rename, and delete.
 * Throws on anything that isn't a plain .pdf basename resolving inside the
 * PDF directory.
 *
 * @param {string} filename
 * @returns {string} absolute path within PDFS_DIR
 */
function resolvePdfPath(filename) {
  if (typeof filename !== 'string' || filename.trim() === '') {
    throw new PathValidationError('Filename is required');
  }

  // A legitimate filename is a bare basename — no directory component at all.
  if (filename !== basename(filename)) {
    throw new PathValidationError('Filename must not contain a path');
  }

  if (filename.startsWith('.')) {
    throw new PathValidationError('Filename must not start with a dot');
  }

  if (!filename.toLowerCase().endsWith('.pdf')) {
    throw new PathValidationError('Only .pdf files are supported');
  }

  const resolved = resolve(PDFS_DIR, filename);

  // Belt and braces: confirm the resolved path really is inside PDFS_DIR, which
  // also catches symlink-style surprises the basename check can't see.
  const root = resolve(PDFS_DIR);
  if (resolved !== join(root, filename) || !resolved.startsWith(root + sep)) {
    throw new PathValidationError('Resolved path escapes the PDF directory');
  }

  return resolved;
}


// Helper function to read file with timeout and better error handling
async function readFileWithTimeout(filePath, timeoutMs = 60000) {
  const filename = filePath.split(/[/\\]/).pop();
  const startTime = Date.now();
  
  try {
    // Check if file is actually accessible (not just a placeholder from unmounted drive)
    let fileSizeMB = 'unknown';
    let isGoogleDrive = false;
    try {
      const stats = await stat(filePath);
      fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      // Detect Google Drive mount points
      const pathLower = filePath.toLowerCase();
      if (pathLower.includes('googledrive') || 
          pathLower.includes('google drive') ||
          pathLower.includes('drive.google.com') ||
          pathLower.match(/\/[gG]oogle\s*[dD]rive/)) {
        isGoogleDrive = true;
      }
      
      // Check if file size is 0 or suspiciously small (might be a placeholder)
      if (stats.size === 0) {
        console.warn(`⚠ Warning: File appears to be empty (0 bytes): ${filename}`);
        if (isGoogleDrive) {
          throw new Error(`File "${filename}" appears to be a placeholder. The Google Drive client may be closed or the file is not synced. Please ensure Google Drive is running and the file is synced locally.`);
        }
      }
      
      if (stats.size > 100 * 1024 * 1024) { // > 100MB
        console.warn(`⚠ Warning: Large file detected: ${filename} (${fileSizeMB} MB). This may take a while...`);
      }
    } catch (statError) {
      // If we can't even stat the file, it's likely not available
      if (statError.code === 'ENOENT') {
        throw new Error(`File not found: ${filename}. The file may not be synced or the Google Drive client is closed.`);
      }
      console.warn(`⚠ Could not get file stats for ${filename}:`, statError.message);
      if (statError.message.includes('Google Drive')) {
        throw statError; // Re-throw our custom Google Drive error
      }
    }
    
    // Read file with timeout - try AbortController first (Node 15+), fallback to Promise.race
    let pdfBytes;
    try {
      // Try with AbortController (better cancellation support)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeoutMs);
      
      try {
        pdfBytes = await readFile(filePath, { signal: controller.signal });
        clearTimeout(timeoutId);
      } catch (readError) {
        clearTimeout(timeoutId);
      if (readError.name === 'AbortError') {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.error(`✗ Timeout reading file: ${filename} after ${duration}s`);
        console.error(`  File path: ${filePath}`);
        console.error(`  File size: ${fileSizeMB} MB`);
        if (isGoogleDrive) {
          console.error(`  ⚠ Google Drive detected - the client may be closed or file not synced`);
          throw new Error(`File read timeout: ${filename}. The Google Drive client appears to be closed or the file is not synced locally. Please ensure Google Drive is running and the file is available offline.`);
        }
        console.error(`  This may indicate a slow network drive or a very large file.`);
        throw new Error(`File read timeout: ${filename} (${fileSizeMB} MB). The file may be on a slow network drive or is very large. Try accessing the file directly to ensure it's available.`);
      }
        // If AbortSignal not supported, fall through to Promise.race approach
        if (readError.code !== 'ERR_INVALID_ARG_TYPE') {
          throw readError;
        }
        // Fallback to Promise.race if AbortSignal not supported
        const readPromise = readFile(filePath);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`File read timeout after ${timeoutMs}ms`)), timeoutMs);
        });
        pdfBytes = await Promise.race([readPromise, timeoutPromise]);
      }
    } catch (raceError) {
      // Handle Promise.race timeout
      if (raceError.message.includes('timeout')) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.error(`✗ Timeout reading file: ${filename} after ${duration}s`);
        console.error(`  File path: ${filePath}`);
        console.error(`  File size: ${fileSizeMB} MB`);
        if (isGoogleDrive) {
          throw new Error(`File read timeout: ${filename}. The Google Drive client appears to be closed or the file is not synced locally. Please ensure Google Drive is running and the file is available offline.`);
        }
        throw new Error(`File read timeout: ${filename} (${fileSizeMB} MB). The file may be on a slow network drive or is very large.`);
      }
      throw raceError;
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✓ Read ${filename} (${fileSizeMB} MB) in ${duration}s`);
    return pdfBytes;
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Check if it's a Google Drive related error
    const pathLower = filePath.toLowerCase();
    const isGoogleDrive = pathLower.includes('googledrive') || 
                          pathLower.includes('google drive') ||
                          pathLower.includes('drive.google.com') ||
                          pathLower.match(/\/[gG]oogle\s*[dD]rive/);
    
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      console.error(`✗ Timeout reading file: ${filename} after ${duration}s`);
      console.error(`  File path: ${filePath}`);
      if (isGoogleDrive) {
        console.error(`  ⚠ Google Drive detected - the client may be closed or file not synced`);
        throw new Error(`File read timeout: ${filename}. The Google Drive client appears to be closed or the file is not synced locally. Please ensure Google Drive is running and the file is available offline.`);
      }
      console.error(`  This may indicate a slow network drive or very large file.`);
      throw new Error(`File read timeout: ${filename}. The file may be on a slow network drive or is very large. Try accessing the file directly to ensure it's available.`);
    }
    
    // Re-throw custom Google Drive errors
    if (error.message.includes('Google Drive')) {
      throw error;
    }
    
    console.error(`✗ Error reading file: ${filename} after ${duration}s`);
    console.error(`  Error: ${error.message}`);
    console.error(`  Code: ${error.code || 'N/A'}`);
    throw error;
  }
}

// Template file path
const PROMPT_TEMPLATE_FILE = join(__dirname, 'config', 'ai-prompt-template.md');

// Logging function
async function logActivity(type, details) {
  try {
    let log = [];
    if (existsSync(LOG_FILE)) {
      const logData = await readFile(LOG_FILE, 'utf-8');
      log = JSON.parse(logData);
    }
    
    const entry = {
      timestamp: new Date().toISOString(),
      type,
      ...details
    };
    
    log.push(entry);
    
    // Keep only last 1000 entries to prevent file from growing too large
    if (log.length > 1000) {
      log = log.slice(-1000);
    }
    
    await writeFile(LOG_FILE, JSON.stringify(log, null, 2));
  } catch (error) {
    console.error('Error writing to activity log:', error);
  }
}

// Serve static files
app.use(express.static('public'));

// Parse JSON bodies with increased limit for image data
app.use(express.json({ limit: '10mb' }));

// Validate every :filename route param once, before any handler runs, and hand
// the handler a resolved path it can trust. Rejects traversal attempts with a
// 400 rather than letting them reach the filesystem.
app.param('filename', (req, res, next, value) => {
  let decoded;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return res.status(400).json({ error: 'Invalid filename', details: 'Malformed URL encoding' });
  }

  try {
    req.pdfFilename = decoded;
    req.pdfPath = resolvePdfPath(decoded);
    next();
  } catch (error) {
    if (error instanceof PathValidationError) {
      return res.status(400).json({ error: 'Invalid filename', details: error.message });
    }
    next(error);
  }
});

// Endpoint to get PDF metadata
app.get('/api/metadata/:filename', async (req, res) => {
  try {
    const filename = req.pdfFilename;
    const filePath = req.pdfPath;
    
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const pdfBytes = await readFileWithTimeout(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Get keywords - pdf-lib returns an array
    let keywordsRaw = pdfDoc.getKeywords() || [];
    
    // pdf-lib's getKeywords() should return an array directly
    // If it's already an array, use it as-is
    let keywordsArray = [];
    if (Array.isArray(keywordsRaw)) {
      keywordsArray = keywordsRaw;
    } else if (typeof keywordsRaw === 'string') {
      // If it's a string (shouldn't happen with pdf-lib, but handle it)
      if (keywordsRaw.includes(',')) {
        keywordsArray = parseCommaDelimitedString(keywordsRaw);
      } else {
        // Legacy format: space-separated
        keywordsArray = keywordsRaw.split(/\s+/).filter(k => k.trim().length > 0);
      }
    }
    
    // Join with comma to send comma-delimited string to client
    const keywordsString = keywordsArray.join(',');
    
    const metadata = {
      title: pdfDoc.getTitle() || 'Untitled',
      author: pdfDoc.getAuthor() || 'Unknown',
      subject: pdfDoc.getSubject() || '',
      creator: pdfDoc.getCreator() || '',
      producer: pdfDoc.getProducer() || '',
      creationDate: pdfDoc.getCreationDate()?.toString() || '',
      modificationDate: pdfDoc.getModificationDate()?.toString() || '',
      keywords: keywordsString,
      pageCount: pdfDoc.getPageCount(),
      // Custom metadata (XMP)
      custom: {}
    };

    // Try to get custom properties if available
    try {
      const customProps = pdfDoc.context.lookup(pdfDoc.context.trailerInfo.Root);
      if (customProps && customProps.get('Metadata')) {
        // Additional metadata extraction could go here
      }
    } catch (e) {
      // Ignore if custom metadata not available
    }

    res.json(metadata);
  } catch (error) {
    console.error('Error reading PDF metadata:', error);
    console.error('Filename:', req.params.filename);
    console.error('File path:', req.pdfPath);
    
    // Provide more helpful error messages
    let errorMessage = error.message;
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      errorMessage = `File read timeout. The file "${req.params.filename}" may be on a slow network drive or is very large. Try accessing the file directly to ensure it's available.`;
    } else if (error.code === 'ENOENT') {
      errorMessage = `File not found: ${req.params.filename}`;
    }
    
    res.status(500).json({ 
      error: 'Failed to read PDF metadata', 
      details: errorMessage,
      code: error.code || 'UNKNOWN'
    });
  }
});

// Serve PDF files
app.get('/pdfs/:filename', (req, res) => {
  const filename = req.pdfFilename;
  const filePath = req.pdfPath;
  
  if (!existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  res.sendFile(filePath);
});

// Endpoint to update PDF metadata
app.put('/api/metadata/:filename', async (req, res) => {
  try {
    const filename = req.pdfFilename;
    const filePath = req.pdfPath;
    const { field, value } = req.body;
    
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (!field) {
      return res.status(400).json({ error: 'Field name is required' });
    }

    // Load the PDF
    const pdfBytes = await readFileWithTimeout(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Get old value before updating
    let oldValue = '';
    if (field === 'title') oldValue = pdfDoc.getTitle() || '';
    else if (field === 'author') oldValue = pdfDoc.getAuthor() || '';
    else if (field === 'subject') oldValue = pdfDoc.getSubject() || '';
    else if (field === 'keywords') {
      const oldKeywords = pdfDoc.getKeywords() || [];
      oldValue = Array.isArray(oldKeywords) ? oldKeywords.join(',') : String(oldKeywords);
    }
    
    // Update the specified field
    const fieldMap = {
      title: () => pdfDoc.setTitle(value || ''),
      author: () => pdfDoc.setAuthor(value || ''),
      subject: () => pdfDoc.setSubject(value || ''),
      creator: () => pdfDoc.setCreator(value || ''),
      producer: () => pdfDoc.setProducer(value || ''),
      // Keywords expects an array, split by comma and trim each keyword
      keywords: () => {
        const keywordsArray = value 
          ? value.split(',').map(k => k.trim()).filter(k => k.length > 0)
          : [];
        pdfDoc.setKeywords(keywordsArray);
      }
    };

    if (fieldMap[field]) {
      fieldMap[field]();
    } else {
      return res.status(400).json({ error: `Field '${field}' is not editable` });
    }

    // Save the updated PDF
    const updatedPdfBytes = await pdfDoc.save();
    await writeFile(filePath, updatedPdfBytes);

    // Log the activity
    await logActivity('metadata_update', {
      filename,
      field,
      oldValue,
      newValue: value || ''
    });

    res.json({ success: true, message: `Updated ${field}` });
  } catch (error) {
    console.error('Error updating PDF metadata:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to update PDF metadata', details: error.message });
  }
});

// Endpoint to rename a PDF file
app.post('/api/rename/:filename', async (req, res) => {
  try {
    const filename = req.pdfFilename;
    const { newFilename } = req.body;
    const oldFilePath = req.pdfPath;
    
    if (!newFilename) {
      return res.status(400).json({ error: 'New filename is required' });
    }
    
    // Ensure new filename has .pdf extension
    const finalNewFilename = newFilename.endsWith('.pdf') ? newFilename : `${newFilename}.pdf`;
    const finalNewFilePath = resolvePdfPath(finalNewFilename);
    
    if (!existsSync(oldFilePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    if (existsSync(finalNewFilePath)) {
      return res.status(400).json({ error: 'A file with that name already exists' });
    }
    
    await rename(oldFilePath, finalNewFilePath);
    
    // Log the activity
    await logActivity('file_rename', {
      oldFilename: filename,
      newFilename: finalNewFilename
    });
    
    res.json({ success: true, message: 'File renamed successfully', newFilename: finalNewFilename });
  } catch (error) {
    if (error instanceof PathValidationError) {
      return res.status(400).json({ error: 'Invalid filename', details: error.message });
    }
    console.error('Error renaming file:', error);
    res.status(500).json({ error: 'Failed to rename file', details: error.message });
  }
});

// Get activity log
app.get('/api/activity-log', async (req, res) => {
  try {
    if (!existsSync(LOG_FILE)) {
      // Return empty array if file doesn't exist yet
      return res.json([]);
    }
    
    const logData = await readFile(LOG_FILE, 'utf-8');
    
    // Handle empty file
    if (!logData || logData.trim() === '') {
      return res.json([]);
    }
    
    let log;
    try {
      log = JSON.parse(logData);
    } catch (parseError) {
      console.error('Error parsing activity log JSON:', parseError);
      // If JSON is malformed, return empty array and reset the file
      await writeFile(LOG_FILE, JSON.stringify([], null, 2));
      return res.json([]);
    }
    
    // Ensure log is an array
    if (!Array.isArray(log)) {
      console.error('Activity log is not an array, resetting');
      await writeFile(LOG_FILE, JSON.stringify([], null, 2));
      return res.json([]);
    }
    
    // Return most recent entries first
    res.json(log.reverse());
  } catch (error) {
    console.error('Error reading activity log:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to read activity log', details: error.message });
  }
});

// List available PDFs (simple list)
app.get('/api/pdfs', async (req, res) => {
  try {
    const pdfsDir = PDFS_DIR;
    
    if (!existsSync(pdfsDir)) {
      return res.json([]);
    }

    const files = await readdir(pdfsDir);
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
    
    res.json(pdfFiles);
  } catch (error) {
    console.error('Error listing PDFs:', error);
    res.status(500).json({ error: 'Failed to list PDFs', details: error.message });
  }
});

// Get files with metadata and update counts (optimized for large directories)
app.get('/api/files-list', async (req, res) => {
  try {
    const pdfsDir = PDFS_DIR;
    const { limit, offset, metadata } = req.query;
    const includeMetadata = metadata !== 'false'; // Default to true for backward compatibility
    const limitNum = limit ? parseInt(limit, 10) : null;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    
    if (!existsSync(pdfsDir)) {
      return res.json([]);
    }

    const files = await readdir(pdfsDir);
    let pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
    
    // Sort by filename (most recent first if dates in filename)
    pdfFiles.sort((a, b) => b.localeCompare(a));
    
    // Apply pagination if requested
    const totalFiles = pdfFiles.length;
    if (limitNum) {
      pdfFiles = pdfFiles.slice(offsetNum, offsetNum + limitNum);
    }
    
    // Load activity log to count updates per file (only if metadata is requested)
    let activityLog = [];
    let updateCounts = {};
    if (includeMetadata) {
      if (existsSync(LOG_FILE)) {
        try {
          const logData = await readFile(LOG_FILE, 'utf-8');
          if (logData && logData.trim() !== '') {
            activityLog = JSON.parse(logData);
          }
        } catch (e) {
          // Ignore log parsing errors
        }
      }
      
      // Count updates per file (only for files we're returning)
      pdfFiles.forEach(filename => {
        let count = 0;
        activityLog.forEach(entry => {
          if (entry.type === 'metadata_update' && entry.filename === filename) {
            count++;
          } else if (entry.type === 'file_rename') {
            if (entry.oldFilename === filename || entry.newFilename === filename) {
              count++;
            }
          } else if (entry.type === 'pdf_split') {
            if (entry.originalFilename === filename) {
              count++;
            } else if (entry.createdFiles && entry.createdFiles.includes(filename)) {
              count++;
            }
          } else if (entry.type === 'file_delete' && entry.filename === filename) {
            count++;
          }
        });
        updateCounts[filename] = count;
      });
    }
    
    // If metadata not requested, return just filenames quickly
    if (!includeMetadata) {
      const filesList = pdfFiles.map(filename => ({
        filename,
        title: '',
        subject: '',
        author: '',
        keywords: '',
        pageCount: 0,
        updateCount: 0
      }));
      return res.json({
        files: filesList,
        total: totalFiles,
        limit: limitNum,
        offset: offsetNum
      });
    }
    
    // Get metadata for each file (with concurrency limit for performance)
    const CONCURRENCY_LIMIT = 10; // Process 10 files at a time
    const filesWithMetadata = [];
    
    for (let i = 0; i < pdfFiles.length; i += CONCURRENCY_LIMIT) {
      const batch = pdfFiles.slice(i, i + CONCURRENCY_LIMIT);
      const batchResults = await Promise.all(
        batch.map(async (filename) => {
          try {
            const filePath = join(pdfsDir, filename);
            const pdfBytes = await readFileWithTimeout(filePath);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            
            // Get keywords
            let keywordsRaw = pdfDoc.getKeywords() || [];
            let keywordsArray = [];
            if (Array.isArray(keywordsRaw)) {
              keywordsArray = keywordsRaw;
            } else if (typeof keywordsRaw === 'string') {
              if (keywordsRaw.includes(',')) {
                keywordsArray = parseCommaDelimitedString(keywordsRaw);
              } else {
                keywordsArray = keywordsRaw.split(/\s+/).filter(k => k.trim().length > 0);
              }
            }
            const keywordsString = keywordsArray.join(',');
            
            return {
              filename,
              title: pdfDoc.getTitle() || '',
              subject: pdfDoc.getSubject() || '',
              author: pdfDoc.getAuthor() || '',
              keywords: keywordsString,
              pageCount: pdfDoc.getPageCount(),
              updateCount: updateCounts[filename] || 0
            };
          } catch (error) {
            // If we can't read metadata, return basic info
            return {
              filename,
              title: '',
              subject: '',
              author: '',
              keywords: '',
              pageCount: 0,
              updateCount: updateCounts[filename] || 0
            };
          }
        })
      );
      filesWithMetadata.push(...batchResults);
    }
    
    // Return with pagination info if pagination was used
    if (limitNum) {
      res.json({
        files: filesWithMetadata,
        total: totalFiles,
        limit: limitNum,
        offset: offsetNum
      });
    } else {
      res.json(filesWithMetadata);
    }
  } catch (error) {
    console.error('Error getting files list:', error);
    res.status(500).json({ error: 'Failed to get files list', details: error.message });
  }
});

// Delete a PDF file
app.delete('/api/files/:filename', async (req, res) => {
  try {
    const filename = req.pdfFilename;
    const filePath = req.pdfPath;
    
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    await unlink(filePath);
    
    // Log the deletion
    await logActivity('file_delete', {
      filename
    });
    
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file', details: error.message });
  }
});

// Endpoint to split a PDF
app.post('/api/split', async (req, res) => {
  try {
    const { filename, splitPoints, metadata } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }
    
    if (!splitPoints || !Array.isArray(splitPoints) || splitPoints.length === 0) {
      return res.status(400).json({ error: 'Split points array is required' });
    }
    
    // Filename arrives in the body here, so it bypasses the app.param guard.
    const filePath = resolvePdfPath(filename);
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Load the original PDF
    const pdfBytes = await readFileWithTimeout(filePath);
    const sourcePdf = await PDFDocument.load(pdfBytes);
    const totalPages = sourcePdf.getPageCount();
    
    // Validate split points (should be 1-indexed page numbers after which to split)
    const sortedSplitPoints = [...splitPoints].sort((a, b) => a - b);
    if (sortedSplitPoints[0] < 1 || sortedSplitPoints[sortedSplitPoints.length - 1] >= totalPages) {
      return res.status(400).json({ error: 'Split points must be between 1 and totalPages-1' });
    }
    
    // Generate base filename (without extension)
    const baseName = filename.replace(/\.pdf$/i, '');
    
    // Create split ranges: [startPage, endPage] for each split (1-indexed)
    const ranges = [];
    let startPage = 1;
    for (const splitPoint of sortedSplitPoints) {
      ranges.push([startPage, splitPoint]);
      startPage = splitPoint + 1;
    }
    // Add final range
    ranges.push([startPage, totalPages]);
    
    const createdFiles = [];
    
    // Create each split PDF
    for (let i = 0; i < ranges.length; i++) {
      const [startPage, endPage] = ranges[i];
      const pageCount = endPage - startPage + 1;
      
      // Create new PDF document
      const newPdf = await PDFDocument.create();
      
      // Copy pages from source PDF (pdf-lib uses 0-indexed pages)
      const pages = await newPdf.copyPages(sourcePdf, 
        Array.from({ length: pageCount }, (_, idx) => startPage - 1 + idx)
      );
      
      pages.forEach(page => newPdf.addPage(page));
      
      // Preserve metadata
      let keywordsArray = [];
      if (metadata && metadata.keywords) {
        // Use provided keywords
        keywordsArray = typeof metadata.keywords === 'string'
          ? metadata.keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
          : (Array.isArray(metadata.keywords) ? metadata.keywords : []);
      } else {
        // Preserve original keywords from source PDF
        const sourceKeywords = sourcePdf.getKeywords() || [];
        if (Array.isArray(sourceKeywords)) {
          keywordsArray = [...sourceKeywords];
        } else if (typeof sourceKeywords === 'string') {
          keywordsArray = sourceKeywords.includes(',')
            ? parseCommaDelimitedString(sourceKeywords)
            : sourceKeywords.split(/\s+/).filter(k => k.trim().length > 0);
        }
      }
      
      // Add 'from-split' tag to split files (if not already present)
      if (!keywordsArray.includes('from-split')) {
        keywordsArray.push('from-split');
      }
      
      if (metadata) {
        if (metadata.title) newPdf.setTitle(metadata.title);
        if (metadata.subject) newPdf.setSubject(metadata.subject);
        if (metadata.author) newPdf.setAuthor(metadata.author);
      } else {
        // Preserve original metadata if not provided
        const sourceTitle = sourcePdf.getTitle();
        const sourceSubject = sourcePdf.getSubject();
        const sourceAuthor = sourcePdf.getAuthor();
        if (sourceTitle) newPdf.setTitle(sourceTitle);
        if (sourceSubject) newPdf.setSubject(sourceSubject);
        if (sourceAuthor) newPdf.setAuthor(sourceAuthor);
      }
      
      // Always set keywords (includes from-split tag)
      if (keywordsArray.length > 0) {
        newPdf.setKeywords(keywordsArray);
      }
      
      // Preserve creator and producer from source
      const sourceCreator = sourcePdf.getCreator();
      const sourceProducer = sourcePdf.getProducer();
      if (sourceCreator) newPdf.setCreator(sourceCreator);
      if (sourceProducer) newPdf.setProducer(sourceProducer);
      
      // Generate filename with auto-numbering (001, 002, etc.)
      const fileNumber = String(i + 1).padStart(3, '0');
      let newFilename = `${baseName}-${fileNumber}.pdf`;
      let newFilePath = join(PDFS_DIR, newFilename);
      
      // Check if file already exists
      if (existsSync(newFilePath)) {
        // Try alternative numbering
        let altNumber = 1;
        do {
          newFilename = `${baseName}-${fileNumber}-${altNumber}.pdf`;
          newFilePath = join(PDFS_DIR, newFilename);
          altNumber++;
        } while (existsSync(newFilePath));
      }
      
      // Save the split PDF
      const newPdfBytes = await newPdf.save();
      await writeFile(newFilePath, newPdfBytes);
      
      createdFiles.push(newFilename);
    }
    
    // Tag the original file with 'already-split' and 'needs-deleting'
    try {
      const originalPdfBytes = await readFileWithTimeout(filePath);
      const originalPdf = await PDFDocument.load(originalPdfBytes);
      
      // Get existing keywords
      let originalKeywords = originalPdf.getKeywords() || [];
      let originalKeywordsArray = [];
      if (Array.isArray(originalKeywords)) {
        originalKeywordsArray = [...originalKeywords];
      } else if (typeof originalKeywords === 'string') {
        originalKeywordsArray = originalKeywords.includes(',')
          ? parseCommaDelimitedString(originalKeywords)
          : originalKeywords.split(/\s+/).filter(k => k.trim().length > 0);
      }
      
      // Add 'already-split' and 'needs-deleting' tags if not already present
      let needsUpdate = false;
      if (!originalKeywordsArray.includes('already-split')) {
        originalKeywordsArray.push('already-split');
        needsUpdate = true;
      }
      if (!originalKeywordsArray.includes('needs-deleting')) {
        originalKeywordsArray.push('needs-deleting');
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        originalPdf.setKeywords(originalKeywordsArray);
        
        // Save the updated original PDF
        const updatedOriginalBytes = await originalPdf.save();
        await writeFile(filePath, updatedOriginalBytes);
      }
    } catch (error) {
      console.warn('Could not tag original file with already-split:', error.message);
      // Continue even if tagging fails
    }
    
    // Log the activity
    await logActivity('pdf_split', {
      originalFilename: filename,
      splitPoints: splitPoints,
      createdFiles: createdFiles,
      totalPages: totalPages
    });
    
    res.json({ 
      success: true, 
      message: `PDF split into ${createdFiles.length} file(s)`,
      files: createdFiles 
    });
  } catch (error) {
    if (error instanceof PathValidationError) {
      return res.status(400).json({ error: 'Invalid filename', details: error.message });
    }
    console.error('Error splitting PDF:', error);
    res.status(500).json({ error: 'Failed to split PDF', details: error.message });
  }
});

// Get AI suggestions for PDF metadata
app.post('/api/ai-suggestions/:filename', async (req, res) => {
  try {
    const filename = req.pdfFilename;
    const filePath = req.pdfPath;
    
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }
    
    // Get images from request body (sent from frontend)
    const { images: pageImages } = req.body;
    
    if (!pageImages || !Array.isArray(pageImages) || pageImages.length === 0) {
      return res.status(400).json({ error: 'No images provided. Please ensure the PDF preview is loaded.' });
    }
    
    // Extract date from filename if present (YYYY-MM-DD format)
    let filenameDate = '';
    const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      filenameDate = dateMatch[1];
    }
    
    // Get current metadata for context
    const pdfBytes = await readFileWithTimeout(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const currentTitle = pdfDoc.getTitle() || '';
    const currentSubject = pdfDoc.getSubject() || '';
    const currentKeywords = pdfDoc.getKeywords() || [];
    const currentKeywordsStr = Array.isArray(currentKeywords) ? currentKeywords.join(', ') : String(currentKeywords);
    
    // Get creation date and format it
    const creationDate = pdfDoc.getCreationDate();
    let currentCreationDate = '';
    if (creationDate) {
      // Format as YYYY-MM-DD
      const date = new Date(creationDate);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        currentCreationDate = `${year}-${month}-${day}`;
      }
    }
    
    // Load taxonomy
    const taxonomy = await loadTaxonomy();
    
    // Build taxonomy reference text
    const taxonomyText = `
TAGGING TAXONOMY - You MUST use these exact tag slugs:

DOCUMENT TYPES (use 1-2): ${taxonomy.documentTypes.slice(0, 20).join(', ')}${taxonomy.documentTypes.length > 20 ? ' (and more)' : ''}

CATEGORIES (use 1-2): ${taxonomy.categories.join(', ')}

ACTIONS (use if applicable): ${taxonomy.actions.join(', ')}

STATUS (use if applicable): ${taxonomy.statuses.join(', ')}

SPECIAL FLAGS (use if applicable): ${taxonomy.specials.join(', ')}

LOCATIONS (use if applicable): ${taxonomy.locations.join(', ')}

PEOPLE (REQUIRED if person found - match name to slug):
${(taxonomy.peopleWithNames || taxonomy.people.map(s => ({ name: s, slug: s }))).map(p => `  - "${p.name}" → use slug: "${p.slug}"`).join('\n')}

VENDORS (REQUIRED if vendor found - match business name to slug, first 50):
${(taxonomy.vendorsWithNames || taxonomy.vendors.slice(0, 50).map(s => ({ name: s, slug: s }))).map(v => `  - "${v.name}" → use slug: "${v.slug}"`).join('\n')}${taxonomy.vendors.length > 50 ? '\n  ... (and more)' : ''}

CRITICAL RULES FOR ENTITIES:
- If you see a person's name in the document, you MUST:
  1. Find the matching entry in the PEOPLE list above by matching first/last names
  2. Use the EXACT slug shown for that entry, matching on either the full name or an alias
  3. DO NOT use natural names or partial names - ALWAYS use the full slug format
- If you see a vendor/business name in the document, you MUST:
  1. Find the matching entry in the VENDORS list above
  2. Use the EXACT slug shown for that entry, matching on either the full name or an alias
  3. Abbreviations and trading names count as matches when the VENDORS list records them
- If a person or vendor appears in the document but is NOT in the lists above, do NOT include them in keywords

CRITICAL RULES FOR ALL TAGS:
- Use EXACT tag slugs from the lists above - do not create new tags
- Combine multiple tags with commas, no spaces (e.g., "receipt,grocery,paid")
- Include document type, category, vendor (if found), person (if found), and action/status tags
- Add time period tags if date is clear (e.g., "year-2025", "month-03")
`;

    // Load main prompt template from file (or use default)
    let promptText = `Analyze this scanned document image and suggest appropriate metadata values using the predefined tagging taxonomy.

Current filename: ${filename}
${filenameDate ? `- Date found in filename: ${filenameDate} (CRITICAL: Use this date in the suggested filename)` : ''}

Current metadata:
- Title: ${currentTitle || '(empty)'}
- Subject: ${currentSubject || '(empty)'}
- Keywords: ${currentKeywordsStr || '(empty)'}
${currentCreationDate ? `- Creation Date: ${currentCreationDate}` : ''}

${taxonomyText}

Please provide suggestions in JSON format with the following structure:
{
  "filename": "suggested-filename-without-extension",
  "title": "concise descriptive title",
  "subject": "document category or subject",
  "keywords": "keyword1,keyword2,keyword3"
}

Guidelines:
- Filename: Use format YYYY-MM-DD — Type — Subject or Vendor — Person or persons.pdf (use em dashes — to separate sections, regular dashes only between date parts YYYY-MM-DD). Required elements: Date (YYYY-MM-DD) - DATE PRIORITY: ${filenameDate ? `1. USE the date from filename (${filenameDate})` : ''}${filenameDate && currentCreationDate ? ', ' : ''}${currentCreationDate ? `${filenameDate ? '2. ' : '1. '}USE the Creation Date from metadata (${currentCreationDate})` : ''}${(filenameDate || currentCreationDate) ? ', ' : ''}${(filenameDate || currentCreationDate) ? '3. ' : '1. '}Otherwise use date from document image. Document Type (receipt, invoice, bill, etc.), Subject/Vendor (a category like "Grocery", or the vendor's recognizable name in title case as recorded in the VENDORS list), and Person (the person's natural first or full name, if the document relates to a specific person in the PEOPLE list). If no date found, start with Type. No file extension.
- Title: Concise, descriptive title (max 100 characters)
- Subject: Concise summary of the document based on its content (10 words or less, max 50 characters)
- Keywords: 3-10 relevant tags as comma-separated values (NO SPACES), using EXACT slugs from the taxonomy above
- MUST use exact tag slugs - do not invent new tags
- Include: document type, category, vendor (if recognized), person (if found), action/status tags, and time period if date is clear

Return ONLY valid JSON, no other text.`;

    try {
      const templateContent = await readFile(PROMPT_TEMPLATE_FILE, 'utf-8');
      // Extract main prompt template (between "## Main Prompt Template" and "## System Message")
      const promptMatch = templateContent.match(/## Main Prompt Template\s*```\s*([\s\S]*?)\s*```/);
      if (promptMatch) {
        promptText = promptMatch[1].trim();
        // Replace template variables
        promptText = promptText.replace(/\{\{currentFilename\}\}/g, filename);
        promptText = promptText.replace(/\{\{filenameDate\}\}/g, filenameDate || '');
        promptText = promptText.replace(/\{\{currentTitle\}\}/g, currentTitle || '(empty)');
        promptText = promptText.replace(/\{\{currentSubject\}\}/g, currentSubject || '(empty)');
        promptText = promptText.replace(/\{\{currentKeywords\}\}/g, currentKeywordsStr || '(empty)');
        // Replace filename date - if empty, remove conditional block, otherwise insert it
        if (filenameDate) {
          promptText = promptText.replace(/\{\{#if filenameDate\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, content) => {
            return content.replace(/\{\{filenameDate\}\}/g, filenameDate);
          });
        } else {
          promptText = promptText.replace(/\{\{#if filenameDate\}\}([\s\S]*?)\{\{\/if\}\}/g, '');
        }
        
        // Replace creation date - if empty, remove conditional block, otherwise insert it
        if (currentCreationDate) {
          promptText = promptText.replace(/\{\{#if currentCreationDate\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, content) => {
            return content.replace(/\{\{currentCreationDate\}\}/g, currentCreationDate);
          });
        } else {
          promptText = promptText.replace(/\{\{#if currentCreationDate\}\}([\s\S]*?)\{\{\/if\}\}/g, '');
        }
        
        // Clean up any remaining template variables
        promptText = promptText.replace(/\{\{filenameDate\}\}/g, filenameDate || '');
        promptText = promptText.replace(/\{\{currentCreationDate\}\}/g, currentCreationDate || '');
        promptText = promptText.replace(/\{\{taxonomyText\}\}/g, taxonomyText);
      }
    } catch (error) {
      console.warn('Could not load prompt template, using default:', error.message);
      // Use default prompt text already set above
    }

    // Build content array with text prompt and images
    const content = [
      {
        type: 'text',
        text: promptText
      }
    ];
    
    // Add all page images to the content
    pageImages.forEach(imageBase64 => {
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${imageBase64}`
        }
      });
    });
    
    // Load system message from template (or use default)
    let systemMessage = 'You are a helpful assistant that analyzes scanned document images and suggests appropriate metadata. Always respond with valid JSON only.';
    try {
      const templateContent = await readFile(PROMPT_TEMPLATE_FILE, 'utf-8');
      const systemMatch = templateContent.match(/## System Message\s*```\s*([\s\S]*?)\s*```/);
      if (systemMatch) {
        systemMessage = systemMatch[1].trim();
      }
    } catch (error) {
      // Use default system message
    }

    // Call OpenAI Vision API
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemMessage
        },
        {
          role: 'user',
          content: content
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });
    
    const responseText = completion.choices[0].message.content.trim();
    
    // Parse JSON response
    let suggestions;
    try {
      // Remove any markdown code blocks if present
      const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      suggestions = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Response was:', responseText);
      return res.status(500).json({ error: 'Failed to parse AI response', details: parseError.message });
    }
    
    // Validate and format suggestions
    const result = {
      filename: suggestions.filename || filename.replace(/\.pdf$/i, ''),
      title: suggestions.title || '',
      subject: suggestions.subject || '',
      keywords: Array.isArray(suggestions.keywords) 
        ? suggestions.keywords.join(',') 
        : (typeof suggestions.keywords === 'string' ? suggestions.keywords : '')
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error getting AI suggestions:', error);
    res.status(500).json({ error: 'Failed to get AI suggestions', details: error.message });
  }
});

// Error handling middleware - must be last
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`PDF Metadata Viewer running at http://localhost:${PORT}`);
  console.log(`PDFs directory: ${PDFS_DIR}`);
  console.log(`(Set PDFS_DIR environment variable to use a different location)`);
});
