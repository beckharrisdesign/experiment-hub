import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { createPattern } from '@/lib/patterns';
import { analyzeImage } from '@/lib/openai';

// Disable body parsing, we'll handle it manually
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('=== UPLOAD REQUEST START ===');
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    const formData = await request.formData();
    
    console.log('FormData received, checking entries...');
    const allEntries: Array<{key: string, type: string, value: any}> = [];
    for (const [key, value] of formData.entries()) {
      const entryInfo: any = {
        key,
        type: typeof value,
        isFile: value instanceof File,
        isBlob: value instanceof Blob
      };
      if (value instanceof File) {
        entryInfo.name = value.name;
        entryInfo.fileType = value.type;
        entryInfo.size = value.size;
      }
      allEntries.push(entryInfo);
      console.log(`  Entry "${key}":`, entryInfo);
    }
    
    // Get all files with key 'images'
    const files = formData.getAll('images');
    console.log(`\nFiles from getAll("images"): ${files.length} files found`);
    
    if (files.length === 0) {
      console.error('No files found with key "images"');
      console.log('Available keys in FormData:', Array.from(formData.keys()));
      return NextResponse.json({ 
        error: 'No image files provided',
        details: 'No files found with key "images" in FormData',
        availableKeys: Array.from(formData.keys())
      }, { status: 400 });
    }
    
    console.log('Files array details:');
    files.forEach((f: any, i) => {
      const isFile = f instanceof File;
      const isBlob = f instanceof Blob;
      console.log(`  File ${i}:`, {
        isFile,
        isBlob,
        name: isFile ? f.name : (isBlob ? 'blob' : 'unknown'),
        type: isFile ? f.type : (isBlob ? f.type : 'unknown'),
        size: isFile ? f.size : (isBlob ? f.size : 'unknown'),
        constructor: f?.constructor?.name
      });
    });

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'patterns');
    await mkdir(uploadsDir, { recursive: true });

    const createdPatterns = [];

    const validationResults: Array<{
      index: number;
      fileName: string;
      checks: Record<string, { passed: boolean; reason?: string }>;
      finalStatus: 'accepted' | 'rejected';
      rejectionReason?: string;
    }> = [];

    for (let i = 0; i < files.length; i++) {
      let file: File | FormDataEntryValue = files[i];
      let fileAsFile: File | null = null;
      const validation: Record<string, { passed: boolean; reason?: string }> = {};
      let rejectionReason: string | undefined;
      
      try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`FILE ${i + 1} of ${files.length}: VALIDATION START`);
        console.log(`${'='.repeat(60)}`);
        
        const fileAny: any = file;
        const initialInfo = {
          name: fileAny instanceof File ? fileAny.name : 'unknown',
          type: fileAny instanceof File ? fileAny.type : 'unknown',
          size: fileAny instanceof File ? fileAny.size : 'unknown',
          isFile: fileAny instanceof File,
          isBlob: fileAny instanceof Blob,
          constructor: fileAny?.constructor?.name,
        };
        console.log('Initial file info:', initialInfo);

        // CHECK 1: Is it a File object?
        console.log(`\n[CHECK 1] Is File object?`);
        if (!(fileAny instanceof File)) {
          validation['isFileObject'] = { 
            passed: false, 
            reason: `Not a File instance. Type: ${typeof fileAny}, Constructor: ${fileAny?.constructor?.name}` 
          };
          console.log(`  ❌ FAILED: ${validation['isFileObject'].reason}`);
          
          // Try to convert if it's a Blob
          if (fileAny instanceof Blob) {
            console.log(`  ⚠️  Attempting to convert Blob to File...`);
            const fileName = `image-${i}.${fileAny.type.split('/')[1] || 'png'}`;
            file = new File([fileAny], fileName, { type: fileAny.type });
            validation['isFileObject'] = { 
              passed: true, 
              reason: 'Converted from Blob to File' 
            };
            console.log(`  ✅ Converted successfully`);
          } else {
            validation['isFileObject'] = { 
              passed: false, 
              reason: 'Cannot convert to File - not a Blob either' 
            };
            console.log(`  ❌ Cannot convert`);
            rejectionReason = validation['isFileObject'].reason;
            validationResults.push({
              index: i,
              fileName: initialInfo.name,
              checks: validation,
              finalStatus: 'rejected',
              rejectionReason
            });
            continue;
          }
        } else {
          validation['isFileObject'] = { passed: true };
          console.log(`  ✅ PASSED: Is a File object`);
        }

        // At this point, file should be a File - ensure fileAsFile is set
        if (!fileAsFile) {
          fileAsFile = file as File;
        }

        // CHECK 2: File has a name
        console.log(`\n[CHECK 2] Has file name?`);
        if (!fileAsFile.name || fileAsFile.name.trim() === '') {
          validation['hasFileName'] = { 
            passed: false, 
            reason: 'File has no name or empty name' 
          };
          console.log(`  ❌ FAILED: ${validation['hasFileName'].reason}`);
          rejectionReason = validation['hasFileName'].reason;
          validationResults.push({
            index: i,
            fileName: 'unnamed',
            checks: validation,
            finalStatus: 'rejected',
            rejectionReason
          });
          continue;
        } else {
          validation['hasFileName'] = { passed: true };
          console.log(`  ✅ PASSED: File name is "${fileAsFile.name}"`);
        }

        // CHECK 3: File has size > 0
        console.log(`\n[CHECK 3] Has file size > 0?`);
        if (fileAsFile.size === 0) {
          validation['hasSize'] = { 
            passed: false, 
            reason: `File size is 0 bytes` 
          };
          console.log(`  ❌ FAILED: ${validation['hasSize'].reason}`);
          rejectionReason = validation['hasSize'].reason;
          validationResults.push({
            index: i,
            fileName: fileAsFile.name,
            checks: validation,
            finalStatus: 'rejected',
            rejectionReason
          });
          continue;
        } else {
          validation['hasSize'] = { passed: true, reason: `File size is ${fileAsFile.size} bytes` };
          console.log(`  ✅ PASSED: ${validation['hasSize'].reason}`);
        }

        // CHECK 4: Has image MIME type
        console.log(`\n[CHECK 4] Has image MIME type?`);
        const hasImageType = fileAsFile.type && fileAsFile.type.startsWith('image/');
        if (hasImageType) {
          validation['hasImageType'] = { passed: true, reason: `MIME type is "${fileAsFile.type}"` };
          console.log(`  ✅ PASSED: ${validation['hasImageType'].reason}`);
        } else {
          validation['hasImageType'] = { 
            passed: false, 
            reason: fileAsFile.type ? `MIME type is "${fileAsFile.type}" (not image/*)` : 'No MIME type set' 
          };
          console.log(`  ❌ FAILED: ${validation['hasImageType'].reason}`);
        }

        // CHECK 5: Has image file extension
        console.log(`\n[CHECK 5] Has image file extension?`);
        const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff|tif|heic|heif)$/i;
        const hasImageExtension = fileAsFile.name && imageExtensions.test(fileAsFile.name);
        if (hasImageExtension) {
          const match = fileAsFile.name.match(imageExtensions);
          validation['hasImageExtension'] = { 
            passed: true, 
            reason: `File extension "${match?.[0]}" is a recognized image format` 
          };
          console.log(`  ✅ PASSED: ${validation['hasImageExtension'].reason}`);
        } else {
          const ext = fileAsFile.name.split('.').pop() || 'none';
          validation['hasImageExtension'] = { 
            passed: false, 
            reason: `File extension ".${ext}" is not a recognized image format` 
          };
          console.log(`  ❌ FAILED: ${validation['hasImageExtension'].reason}`);
        }

        // CHECK 6: Overall validation - accept if has type OR extension OR just has content
        console.log(`\n[CHECK 6] Overall validation decision`);
        const willAccept = hasImageType || hasImageExtension || (fileAsFile.name && fileAsFile.size > 0);
        
        if (!willAccept) {
          validation['overallValidation'] = { 
            passed: false, 
            reason: 'File has no image type, no image extension, and no valid content' 
          };
          console.log(`  ❌ FAILED: ${validation['overallValidation'].reason}`);
          rejectionReason = validation['overallValidation'].reason;
          validationResults.push({
            index: i,
            fileName: fileAsFile.name,
            checks: validation,
            finalStatus: 'rejected',
            rejectionReason
          });
          continue;
        } else {
          let acceptReason = '';
          if (hasImageType && hasImageExtension) {
            acceptReason = 'Has both image MIME type and image extension';
          } else if (hasImageType) {
            acceptReason = 'Has image MIME type';
          } else if (hasImageExtension) {
            acceptReason = 'Has image file extension';
          } else {
            acceptReason = 'Accepted as fallback (has name and size > 0)';
          }
          validation['overallValidation'] = { passed: true, reason: acceptReason };
          console.log(`  ✅ PASSED: ${acceptReason}`);
        }

        console.log(`\n✅ FILE ${i + 1} PASSED ALL VALIDATION CHECKS`);
        console.log(`   Proceeding to process: ${fileAsFile.name}`);

        // Generate unique filename
        const fileExtension = fileAsFile.name.split('.').pop() || 'png';
        const patternId = randomUUID();
        const fileName = `${patternId}-${randomUUID()}.${fileExtension}`;
        const filePath = path.join(uploadsDir, fileName);

        console.log(`  Saving file to: ${filePath}`);
        
        // Convert file to buffer and save
        console.log(`  Reading file bytes...`);
        const bytes = await fileAsFile.arrayBuffer();
        console.log(`  File bytes read: ${bytes.byteLength} bytes`);
        const buffer = Buffer.from(bytes);
        console.log(`  Buffer created: ${buffer.length} bytes`);
        
        await writeFile(filePath, buffer);
        console.log(`  ✓ File saved successfully to: ${filePath}`);
        
        // Verify file was written
        const fs = require('fs');
        const stats = fs.statSync(filePath);
        console.log(`  File verification: ${stats.size} bytes on disk`);

        // Generate pattern name from filename (remove extension)
        const baseName = fileAsFile.name.replace(/\.[^/.]+$/, '');
        const patternName = baseName || `Pattern ${new Date().toLocaleDateString()}`;
        const imageUrl = `/uploads/patterns/${fileName}`;

        // Analyze image using listing agent to generate description
        let generatedNotes: string | undefined;
        try {
          console.log(`  Analyzing image with listing agent...`);
          generatedNotes = await analyzeImage(filePath);
          console.log(`  ✓ Image analyzed, description generated (${generatedNotes.length} chars)`);
        } catch (analysisError) {
          console.warn(`  ⚠️  Image analysis failed:`, analysisError);
          // Continue without description if analysis fails
          generatedNotes = undefined;
        }

        // Create pattern with image analysis description
        const pattern = createPattern({
          name: patternName,
          imageUrl: imageUrl,
          notes: generatedNotes,
        });

        console.log('Pattern created:', pattern.id, pattern.name);
        createdPatterns.push(pattern);
        console.log(`\n✅✅✅ FILE ${i + 1} SUCCESSFULLY PROCESSED ✅✅✅`);
        console.log(`   Pattern ID: ${pattern.id}`);
        console.log(`   Pattern Name: ${pattern.name}`);
        console.log(`   Image URL: ${imageUrl}`);
        
        validationResults.push({
          index: i,
          fileName: fileAsFile.name,
          checks: validation,
          finalStatus: 'accepted'
        });
      } catch (fileError) {
        console.error(`\n❌❌❌ ERROR PROCESSING FILE ${i + 1} ❌❌❌`);
        console.error(`   File: ${fileAsFile?.name || 'unknown'}`);
        console.error(`   Error:`, fileError);
        if (fileError instanceof Error) {
          console.error(`   Error message: ${fileError.message}`);
          console.error(`   Error stack:`, fileError.stack);
        }
        
        validationResults.push({
          index: i,
          fileName: fileAsFile?.name || (file as any)?.name || 'unknown',
          checks: validation,
          finalStatus: 'rejected',
          rejectionReason: fileError instanceof Error ? fileError.message : 'Unknown error during processing'
        });
        // Continue with other files even if one fails
      }
      console.log(`${'='.repeat(60)}\n`);
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`=== PROCESSING SUMMARY ===`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total files received: ${files.length}`);
    console.log(`Patterns successfully created: ${createdPatterns.length}`);
    console.log(`Files rejected: ${validationResults.filter(r => r.finalStatus === 'rejected').length}`);
    console.log(`Files accepted: ${validationResults.filter(r => r.finalStatus === 'accepted').length}`);
    
    console.log(`\n--- DETAILED VALIDATION RESULTS ---`);
    validationResults.forEach((result, idx) => {
      console.log(`\nFile ${result.index + 1}: ${result.fileName}`);
      console.log(`  Status: ${result.finalStatus === 'accepted' ? '✅ ACCEPTED' : '❌ REJECTED'}`);
      if (result.rejectionReason) {
        console.log(`  Rejection Reason: ${result.rejectionReason}`);
      }
      console.log(`  Validation Checks:`);
      Object.entries(result.checks).forEach(([checkName, checkResult]) => {
        const icon = checkResult.passed ? '✅' : '❌';
        console.log(`    ${icon} ${checkName}: ${checkResult.passed ? 'PASSED' : 'FAILED'}`);
        if (checkResult.reason) {
          console.log(`       Reason: ${checkResult.reason}`);
        }
      });
    });
    
    if (createdPatterns.length === 0 && files.length > 0) {
      console.error(`\n⚠️  WARNING: Files were received but no patterns were created!`);
      console.error(`   Check the validation results above to see why files were rejected.`);
    }

    if (createdPatterns.length === 0) {
      console.error('No patterns were created. Summary:');
      console.error(`  - Total files received: ${files.length}`);
      console.error(`  - Files processed: ${files.length}`);
      console.error(`  - Patterns created: ${createdPatterns.length}`);
      return NextResponse.json({ 
        error: 'No valid image files provided',
        details: `Received ${files.length} file(s) but none passed validation or could be processed`,
        filesReceived: files.length
      }, { status: 400 });
    }

    return NextResponse.json({ 
      patterns: createdPatterns,
      count: createdPatterns.length 
    });
  } catch (error) {
    console.error('Error uploading images and creating patterns:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to upload images and create patterns',
      details: errorMessage 
    }, { status: 500 });
  }
}

