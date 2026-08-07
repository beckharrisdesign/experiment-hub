# AI Prompt Template for Metadata Suggestions

This template is used to generate prompts for OpenAI's Vision API when suggesting PDF metadata.

## Template Variables

The following variables are automatically inserted:
- `{{currentFilename}}` - Current PDF filename
- `{{filenameDate}}` - Date extracted from filename in YYYY-MM-DD format (empty if not found)
- `{{currentTitle}}` - Current PDF title
- `{{currentSubject}}` - Current PDF subject
- `{{currentKeywords}}` - Current PDF keywords
- `{{currentCreationDate}}` - Current PDF creation date in YYYY-MM-DD format (empty if not available)
- `{{taxonomyText}}` - Full taxonomy reference (auto-generated from taxonomy files)

## Main Prompt Template

```
Analyze this scanned document image and suggest appropriate metadata values using the predefined tagging taxonomy.

Current filename: {{currentFilename}}
{{#if filenameDate}}- Date found in filename: {{filenameDate}} (CRITICAL: Use this date in the suggested filename){{/if}}

Current metadata:
- Title: {{currentTitle}}
- Subject: {{currentSubject}}
- Keywords: {{currentKeywords}}
{{#if currentCreationDate}}- Creation Date: {{currentCreationDate}}{{/if}}

{{taxonomyText}}

Please provide suggestions in JSON format with the following structure:
{
  "filename": "suggested-filename-without-extension",
  "title": "concise descriptive title",
  "subject": "document category or subject",
  "keywords": "keyword1,keyword2,keyword3"
}

CRITICAL: The filename field must NOT include ".pdf" extension - it will be added automatically. Do NOT include the extension in your response.

Guidelines:

**Filename Format (CRITICAL - Use em dashes with spaces):**
- Format: `YYYY-MM-DD — Type — Subject or Vendor — Person.pdf`
- Use em dashes (—) WITH SPACES on both sides: " — " (space-em dash-space)
- Regular dashes (-) ONLY between date parts: YYYY-MM-DD
- Use sentence case for each section (capitalize first letter, lowercase for rest, except proper nouns)
- Keep each section concise - Subject/Vendor should be 1-3 words, not the full subject field
- Required elements in order:
  1. Date: YYYY-MM-DD format (regular dashes between date parts)
     - CRITICAL DATE PRIORITY (use in this order):
       1. If a date is found in the current filename above, USE THAT DATE
       2. If Creation Date is provided in metadata above, USE THAT DATE
       3. Only use a date from the document image if neither filename nor metadata date is available
     - Do NOT default to a fixed date like "2024-10-01" - use the actual date from filename, metadata, or document
  2. Type: Document type in sentence case (e.g., "Receipt", "Invoice", "Bill", "Statement")
  3. Subject/Vendor: Either category in sentence case (e.g., "Grocery", "Medical") OR the vendor's recognizable name as a proper noun, exactly as recorded in the VENDORS list. Keep it short (1-3 words max).
  4. Person: Person first name or full name as it appears in the PEOPLE list - NOT the slug format. Use the natural name, never the `fname-m-lname` slug form.
- If no date found, start with Type
- NO file extension (.pdf) in the filename field - the extension is added automatically
- Examples:
  - GOOD: `2025-02-27 — Receipt — Grocery — Vendor Name` (no extension, em dashes with spaces)
  - GOOD: `2025-03-15 — Bill — Medical — Provider Name — Firstname` (no extension, concise subject)
  - GOOD: `2022-02-01 — Statement — 529 Plan — Firstname` (no extension, concise subject)
  - BAD: `2025-02-27-Vendor-Groceries.pdf` (wrong dashes, missing type, has extension)
  - BAD: `2025-02-27 Receipt.pdf` (missing em dashes, missing subject/vendor, has extension)
  - BAD: `2025-02-27 — RECEIPT — GROCERY — VENDOR.pdf` (all caps, has extension)
  - BAD: `2022-02-01—statement—529 Plan Investment Account—firstname-m-lastname.pdf.pdf` (no spaces around dashes, too long subject, slug format for person, double extension)

**Title:**
- Concise, descriptive title (max 100 characters)
- Use sentence case (capitalize first letter of first word, lowercase for rest, except proper nouns)
- Should be specific, not generic (e.g., "Foodmart grocery receipt" not just "Receipt")
- Examples:
  - GOOD: "Foodmart grocery receipt" (sentence case, proper noun "Foodmart" capitalized)
  - GOOD: "AutoDealer appraisal offer for vehicle sale"
  - BAD: "FOODMART GROCERY RECEIPT" (all caps)
  - BAD: "Foodmart Grocery Receipt" (title case, should be sentence case)

**Subject:**
- Concise summary describing what the document is about based on its content
- MUST be 10 words or less
- Should be specific and accurate
- Examples:
  - GOOD: "Foodmart grocery receipt for household items" (7 words)
  - BAD: "Document" (too generic)
  - BAD: "Receipt from Foodmart grocery store for household items and groceries purchased on February 27th" (exceeds 10 words)

**Keywords (CRITICAL FORMATTING RULES):**
- 3-10 relevant tags as comma-separated values
- NO SPACES after commas (e.g., `receipt,grocery,foodmart` NOT `receipt, grocery, foodmart`)
- All lowercase, hyphenated multi-word tags
- MUST use EXACT slugs from the taxonomy above - do NOT invent new tags
- Check for and remove duplicate tags before returning
- Required tags to include:
  - Document type (receipt, invoice, bill, statement, etc.) - REQUIRED
  - Category (grocery, retail, medical, financial, etc.) - REQUIRED
  - Vendor (if recognized - MUST use exact slug from taxonomy) - REQUIRED if vendor visible
  - Person (if found - MUST use exact slug from taxonomy) - REQUIRED if person visible
  - Action/status tags (if applicable: needs-payment, keep-annual, keep-7yr, keep-permanent, etc.)
  - Time period tags (if date is clear: year-YYYY, month-MM format, e.g., "year-2025", "month-02")
  
CRITICAL ENTITY MATCHING RULES:
When you see a person's name in the document:
  1. Look in the PEOPLE list above for a matching full name, partial name, or alias
  2. Use the EXACT slug shown for that entry
  3. DO NOT use natural names or first names - ALWAYS use the full slug format
  4. If the person is not in the list, do NOT include them in keywords

When you see a vendor/business name in the document:
  1. Look in the VENDORS list above for a matching business name or alias
  2. Use the EXACT slug shown for that entry — abbreviations and trading names count as matches when the list records them
  3. DO NOT use business names directly - ALWAYS use the slug format
  4. If the vendor is not in the list, do NOT include them in keywords
- Examples:
  - GOOD: `receipt,grocery,retail,foodmart,firstname-m-lastname,keep-annual,year-2025,month-02`
  - BAD: `Receipt, Grocery, Foodmart, Keep Annual` (spaces, capitalization)
  - BAD: `grocery-receipt,foodmart-store,paid-bill` (invented tags, "paid" not in taxonomy)
  - BAD: `receipt,financial,financial` (duplicate tag)

**Consistency Check:**
- Filename, title, subject, and keywords should all describe the same document
- Vendor names should match across fields (e.g., if filename says "Foodmart", keywords should include "foodmart")
- Document type should be consistent (e.g., if filename says "Receipt", keywords should include "receipt")
- Person names should match if mentioned in multiple fields

Return ONLY valid JSON, no other text.
```

## System Message

```
You are a helpful assistant that analyzes scanned document images and suggests appropriate metadata. Always respond with valid JSON only.
```

## Notes

- Edit this file to iterate on the prompt
- Changes take effect after restarting the server
- The taxonomy section is automatically generated from `tag_entity_database.md`
