# PDF Document Organizer - Product Requirements Document

## Problem Statement
Managing personal and household documents after scanning/photographing is time-consuming. Users need a simple way to organize PDFs and images with consistent metadata tagging without complex workflows.

## Core Workflow
1. Point application at directory of PDFs/images
2. Application loads first document in queue
3. User reviews document preview
4. User either:
   - Manually edits metadata (title, subject, keywords)
   - Requests LLM analysis to suggest metadata values
5. User saves and moves to next document
6. Repeat until queue is processed

## Key Features

### Document Viewing
- Display PDF/image preview
- Show current embedded metadata
- Navigate through document queue with arrow keys/buttons

### Metadata Editing
- Edit title, subject, and keywords fields
- Tag-based keyword editor with add/remove functionality
- Keywords stored as comma-delimited values in PDF metadata

### AI-Assisted Organization
- LLM analyzes document content and structure
- Suggests values for: filename, title, subject, keywords
- Suggests split points for multi-page PDFs (e.g., detect document boundaries)
- User can accept, modify, or reject suggestions

### Tag Taxonomy
- Lightweight database (markdown file) of standardized tag slugs
- People registry: `fname-mname-lname` format
- Vendor/provider registry: categorized by type (retail, medical, financial, etc.)
- Validates suggested keywords against taxonomy

### Activity Log
- Track which documents were updated
- Record metadata changes
- Timestamp of updates

## Technical Constraints
- Simple, open-source solutions preferred
- Minimal dependencies
- Node.js stack
- PDF metadata stored in embedded PDF fields
- Comma-delimited keyword format (no spaces)

## Success Criteria
- User can process a batch of documents efficiently
- Metadata is consistently tagged using taxonomy
- Documents are searchable by embedded metadata
- Workflow is sustainable for quarterly batch processing

## Critical Issues (Must Fix)

### 1. Keywords Not Saving to PDF ⚠️ **CRITICAL - DEAL BREAKER**

**Status:** Verified - Keywords ARE being saved, but `pdf-lib` reads them back in corrupted format  
**Issue:** `pdf-lib`'s `getKeywords()` returns keywords as space-separated characters instead of proper array/string format  
**Impact:** Keywords are saved correctly but cannot be read back properly, breaking the workflow  
**Action Required:**
- Fix keyword reading to handle corrupted format (reconstruction algorithm exists)
- Verify keywords persist when PDF is moved or opened in other applications
- Test with external PDF viewers to confirm keywords are actually embedded
- Consider alternative PDF library or workaround for keyword reading

### 2. Image Files Not Supported

**Issue:** System ignores image files (JPG, PNG, etc.) that are not enclosed in a PDF  
**Impact:** Many scanned documents are saved as image files, not PDFs. These cannot be processed at all  
**Action Required:**
- Add support for converting image files to PDFs before processing
- Or add direct image file support in the viewer
- Consider auto-conversion workflow

## Known Bugs

### 1. Naming Conventions Not Consistently Applied

**Issue:** AI-generated filenames and tagging taxonomy are not consistently following the expected format  
**Examples:**
- Incorrect em dash usage (spaces around dashes)
- Wrong casing (should be sentence case)
- Missing or incorrect date formatting
- Vendor names not matching taxonomy slugs

**Action Required:**
- Review prompt template for clarity
- Add more explicit examples in the prompt
- Consider adding validation/auto-correction for common mistakes

### 2. Tagging Taxonomy Not Fully Enforced

**Issue:** AI is not consistently using the exact tag slugs from the taxonomy  
**Action Required:**
- Strengthen taxonomy enforcement in prompt
- Add post-processing validation to check tag slugs against taxonomy
- Consider auto-correcting common tag mistakes

## Future Enhancements

### High Priority (Core Workflow Support)

**Phase 0: Critical Fixes (Immediate)**
- **Fix keyword reading bug**: Resolve `pdf-lib` keyword corruption issue
- **Image file support**: Add support for JPG, PNG, and other image formats
  - Convert images to PDFs before processing
  - Or add direct image file support in viewer
- **Auto-query AI suggestions**: Automatically query AI when file is opened, allow user to refine
  - Faster workflow, less clicking, more efficient
  - User can still manually trigger if needed

**Phase 1: Essential Metadata Features**
- **Editing additional metadata fields**: Support editing author, creator, producer, and custom fields
- **XMP packet metadata syncing**: Sync metadata in XMP packet format in addition to legacy PDF info dictionary
  - Modern PDFs use XMP (Extensible Metadata Platform) for richer metadata support
  - Sync metadata between XMP packet and legacy PDF info dictionary to ensure compatibility
  - Support XMP-specific fields and namespaces (Dublin Core, PDF, etc.)
  - Future-proof metadata storage while maintaining backward compatibility
- **PDF splitter mode**: Split multi-page PDFs into individual files, preserving metadata
  - **UI Flow**:
    - "Split" button appears in metadata section (only visible when PDF has more than 1 page)
    - Clicking "Split" navigates to splitter view
    - Splitter view displays all pages as thumbnails in a grid
    - User clicks between thumbnails to insert break markers
    - Break markers visually indicate where splits will occur
    - "Split PDF" button executes the split operation
    - Returns to main view after splitting
  - **File Naming**:
    - Auto-naming: Use AI suggestions or pattern-based naming (e.g., original-name-1.pdf, original-name-2.pdf)
    - Auto-numbering: Sequential numbering (e.g., original-name-001.pdf, original-name-002.pdf)
    - User can configure naming pattern before splitting
  - **Metadata Preservation**:
    - Replicate all editable metadata (title, subject, keywords, author) to each split file
    - Preserve system metadata where applicable (creator, producer)
    - Option to customize metadata per split file before execution
  - **Automatic Split Tagging**:
    - Original document tagged with `already-split` after splitting
    - Generated split documents tagged with `from-split`
    - Helps track which documents have been processed and which are originals vs. splits
  - **Future Enhancement**: AI suggests split points based on document structure
- **Processing tracking**: Automatically mark processed documents in file metadata
  - Track processing count: Increment counter stored in metadata (e.g., custom field or tag)
  - Option to append note to subject field (e.g., "Processed 2025-01-10")
  - Option to add processing tag to keywords (e.g., "pdf-processed-20250110" or "pdf-processed-3" for 3rd processing)
  - Store both date and count in metadata so file itself shows processing history
  - Configurable format for date stamps and count display
  - Toggle on/off per processing session
- **Duplicate detection**: Identify duplicate documents based on content or metadata
  - Basic: Compare file hashes and metadata
  - Advanced: Content similarity analysis

**Phase 2: AI & Content Enhancement**
- **AI-assisted organization**: LLM analyzes document content and suggests:
  - Filename suggestions (based on content, dates, document type)
  - Title suggestions (concise, descriptive titles)
  - Subject suggestions (categorization)
  - Keyword/tag suggestions (aligned with taxonomy)
  - Split point suggestions (detect document boundaries in multi-page PDFs)
  - Basic: Single document analysis with all suggestion types
  - Batch: Process multiple documents with progress tracking
- **Teachable AI - Custom Field Locations**:
  - Ability to "teach" AI where to look for specific information on repeated document types
  - User marks date location on Foodmart receipt → system learns: "For Foodmart receipts, date is always in top-right corner"
  - Store document type + field location mappings
  - Use these mappings to guide AI attention
  - Implementation: Allow user to highlight/annotate regions on document
- **OCR text extraction**: Extract text from scanned PDFs for better AI context
  - Basic: Extract text and display in preview
  - Advanced: Use extracted text for AI suggestions (filename, title, tags, split points)
- **AI prompt optimization**: Continuously improve prompts for better suggestions
  - A/B testing framework for prompts
  - User feedback loop for suggestion quality
  - Separate prompt optimization for each suggestion type (filename vs. title vs. tags vs. splits)

### Medium Priority (Workflow Enhancement)

**Phase 3: UX Improvements**
- **Document zoom feature**: Ability to zoom in/out on PDF preview for better readability
  - Use case: Verifying dates, amounts, or other details before accepting AI suggestions
  - Zoom controls in preview pane
- **Rule creation system**: UI to create custom rules for document types
  - Example: "For tax documents, always include these tags: tax-form, financial, keep-7yr"
  - Rules apply to filename format, required tags, etc.
  - Document-type-specific or vendor-specific rules
  - Rule format: `IF document_type == "tax-form" THEN add tags: tax-form, financial, keep-7yr`
- **Additional taxonomy tags**: Support for workflow-specific tags
  - `no-split-needed` - For documents that are legitimately multi-page (not needing splitting)
  - `possible-duplicate` - When user suspects a document might be a duplicate
  - `needs-deleting` - For documents that are mistakes (e.g., duplicate scans)
  - Tags already added to taxonomy, ensure they're available in UI

**Phase 4: Batch Processing**
- **Batch metadata operations**: Apply metadata changes to multiple selected documents
  - Bulk tag addition/removal
  - Bulk title/subject updates
  - Pattern-based renaming
- **Activity log**: Track document updates and metadata changes
  - Basic: Simple log of changes with timestamps
  - Advanced: Export log, filter by date/type, undo support

**Phase 5: Reporting & Analytics**
- **Basic reporting**: Document statistics and metadata completeness
  - Document count, tag usage, metadata coverage
- **Advanced analytics**: Trends, patterns, and insights
  - Tag frequency over time
  - Processing efficiency metrics
  - Export reports (CSV, JSON)

### Lower Priority (Advanced Features)

**Phase 6: Cloud Integration**
- **Cloud directory read access**: Point tool at cloud storage (Google Drive, Dropbox, iCloud)
  - Read-only viewing and metadata editing
  - Sync metadata back to cloud files
- **Cloud directory write access**: Full bidirectional sync
  - Upload processed files
  - Manage cloud file organization

**Phase 7: Automation**
- **Autonomous batch updates**: AI agent processes multiple documents automatically
  - Configurable rules for auto-tagging
  - User review queue for AI suggestions
  - Scheduled batch processing