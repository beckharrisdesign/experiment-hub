# PDF Collection Scripts

Utility scripts for managing and analyzing PDF collections.

## screen-collection.js

Screens a collection of PDFs and identifies common issues:

- **Files needing splitting** - Files tagged with `multi-doc`
- **Possible duplicates** - Files tagged with `duplicate` or `possible-duplicate`
- **Files marked for deletion** - Files tagged with `needs-deleting`
- **Original files (already split)** - Files tagged with `already-split`
- **Files from splits** - Files tagged with `from-split`
- **Files missing metadata** - Files without title, subject, or keywords

### Usage

```bash
# Basic screening
npm run screen

# With verbose output (shows detailed info for each file)
npm run screen:verbose

# Custom directory
node scripts/screen-collection.js --dir /path/to/pdfs

# Save results to JSON file
node scripts/screen-collection.js --output results.json

# Combine options
node scripts/screen-collection.js --verbose --output results.json
```

### Options

- `--dir <path>` - PDF directory (default: from .env PDFS_DIR)
- `--output <file>` - Save results to JSON file
- `--verbose` - Show detailed information for each file

### Output

The script prints a summary report with:
- Count of files in each category
- List of files with issues
- Statistics summary

If `--output` is specified, results are saved as JSON with:
- Scan date and directory
- Summary statistics
- Full results for all files
- Categorized lists by issue type

### Example Output

```
📋 Screening PDF collection in: /path/to/pdfs

Found 619 PDF file(s). Screening...

================================================================================
📊 SCREENING RESULTS SUMMARY
================================================================================

Total files scanned: 619
Files with issues: 590
Files with errors: 0

🔀 FILES NEEDING SPLITTING (2):
  • file1.pdf
  • file2.pdf

🔄 POSSIBLE DUPLICATES (5):
  • duplicate1.pdf [duplicate]
  • duplicate2.pdf [possible-duplicate]

🗑️  FILES MARKED FOR DELETION (3):
  • delete1.pdf
  • delete2.pdf
```
