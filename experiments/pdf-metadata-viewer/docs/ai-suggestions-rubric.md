# AI Suggestions Scoring Rubric

Use this rubric to evaluate the quality of AI-generated metadata suggestions. Score each suggestion on a scale of 0-5 for each criterion, then calculate an overall score.

## Scoring Criteria

### 1. Filename Quality (0-5 points)
A good filename should include (in order): Date, Type, Subject/Vendor, Person (if applicable)

Format: `YYYY-MM-DD — Type — Subject or Vendor — Person or persons.pdf`

- **5**: Perfect format (YYYY-MM-DD — Type — Subject/Vendor — Person.pdf), includes all required elements, uses em dashes (—) to separate sections
- **4**: Correct format, includes date + type + subject/vendor, minor missing elements or format issues
- **3**: Includes date and type, but missing subject/vendor or person when applicable
- **2**: Missing multiple required elements (e.g., no date, no type, or no subject/vendor)
- **1**: Major format problems or missing critical elements
- **0**: Completely wrong format or unreadable

**Required Elements:**
- Date: YYYY-MM-DD format (regular dashes between date parts)
- Type: Document type (receipt, invoice, bill, etc.)
- Subject/Vendor: Either the category/subject (e.g., "Grocery", "Medical") OR the vendor name in title case (e.g., "Foodmart", "CityClinic", "FirstBank") - use recognizable vendor name from taxonomy
- Person: Person name if document is related to a specific person (e.g., "Firstname" or "Firstname")

**Example Good**: 
- `2025-02-27 — Receipt — Grocery — Foodmart.pdf` (date, type, subject, vendor in title case)
- `2025-03-15 — Bill — Medical — CityClinic — Firstname.pdf` (date, type, subject, vendor in title case, person)
- `2025-01-10 — Report Card — School — UnifiedSD — Firstname.pdf` (date, type, subject, vendor in title case, person)
- `2025-02-27 — Receipt — Foodmart.pdf` (date, type, vendor in title case - subject can be omitted if vendor is clear)

**Example Bad**: 
- `2025-02-27-Foodmart-Groceries.pdf` (regular dashes instead of em dashes, missing type)
- `Foodmart Receipt.pdf` (missing date, no em dashes)
- `2025-02-27 Receipt.pdf` (missing subject/vendor, no em dashes)

### 2. Title Quality (0-5 points)
- **5**: Concise, descriptive, captures document essence perfectly
- **4**: Good description, minor improvements possible
- **3**: Adequate but generic or could be more specific
- **2**: Vague or too generic
- **1**: Poor description, doesn't match document
- **0**: Completely wrong or missing

**Example Good**: "Foodmart Grocery Receipt"
**Example Bad**: "Receipt" (too generic)

### 3. Subject Quality (0-5 points)
Subject should be a concise summary (10 words or less) describing what the document is about based on its content.

- **5**: Perfect summary, captures document essence in 10 words or less, specific and accurate
- **4**: Good summary, minor improvements possible, within word limit
- **3**: Adequate summary but could be more specific or concise
- **2**: Vague summary or exceeds word limit
- **1**: Poor summary, doesn't match document
- **0**: Missing or completely wrong

**Example Good**: "Foodmart grocery receipt for household items" (7 words)
**Example Bad**: "Document" (too generic) or "Receipt from Foodmart grocery store for household items and groceries purchased on February 27th" (too long, exceeds 10 words)

### 4. Keywords - Taxonomy Compliance (0-5 points)
- **5**: All tags use exact slugs from taxonomy, no invented tags
- **4**: Mostly correct, 1-2 minor issues
- **3**: Some correct tags but includes non-taxonomy tags
- **2**: Many non-taxonomy tags or wrong format
- **1**: Mostly wrong tags
- **0**: No taxonomy compliance

**Example Good**: `receipt,grocery,retail,foodmart,firstname-m-lastname,keep-annual,year-2025,month-02`
**Example Bad**: `grocery-receipt,foodmart-store,paid-bill` (invented tags, "paid" not in taxonomy)

### 5. Keywords - Completeness (0-5 points)
- **5**: Includes all relevant tags: document type, category, vendor, person (if applicable), action/status tags (like needs-payment, keep-7yr, keep-permanent), time period
- **4**: Missing 1 relevant tag
- **3**: Missing 2-3 relevant tags
- **2**: Missing many relevant tags
- **1**: Only 1-2 tags, missing most relevant ones
- **0**: No keywords or completely wrong

**Example Good**: `receipt,grocery,retail,foodmart,firstname-m-lastname,keep-annual,year-2025,month-02`
**Example Bad**: `receipt` (only document type)

### 6. Keywords - Format (0-5 points)
- **5**: Perfect format - comma-separated, no spaces, lowercase, hyphenated multi-word tags
- **4**: Minor format issues (1-2 spaces or capitalization errors)
- **3**: Some format issues (multiple spaces, mixed case)
- **2**: Many format issues
- **1**: Major format problems
- **0**: Completely wrong format

**Example Good**: `receipt,grocery,retail,foodmart,keep-annual`
**Example Bad**: `Receipt, Grocery, Foodmart, Keep Annual` (spaces and capitalization)

### 7. Overall Accuracy (0-5 points)
- **5**: All suggestions accurately reflect document content AND are consistent with each other (filename, title, subject, and keywords all describe the same document coherently)
- **4**: Mostly accurate and consistent, minor discrepancies between fields
- **3**: Generally accurate but some inconsistencies between fields (e.g., filename mentions one vendor but keywords mention different vendor)
- **2**: Several inaccuracies or major inconsistencies (fields contradict each other)
- **1**: Mostly inaccurate or fields don't align with each other
- **0**: Completely wrong or completely inconsistent

**Consistency Check:**
- Filename, title, subject, and keywords should all describe the same document
- Vendor names should match across fields (e.g., if filename says "Foodmart", keywords should include "foodmart")
- Document type should be consistent (e.g., if filename says "Receipt", keywords should include "receipt")
- Person names should match if mentioned in multiple fields
- Subject summary should align with keywords and title

**Example Good (Consistent):**
- Filename: `2025-02-27 — Receipt — Grocery — Foodmart.pdf`
- Title: "Foodmart Grocery Receipt"
- Subject: "Foodmart grocery receipt for household items"
- Keywords: `receipt,grocery,retail,foodmart,firstname-m-lastname,keep-annual,year-2025,month-02`
All fields consistently describe an Foodmart grocery receipt.

**Example Bad (Inconsistent):**
- Filename: `2025-02-27 — Receipt — Grocery — Foodmart.pdf`
- Title: "CityClinic Medical Bill"
- Subject: "Medical bill from City Clinic"
- Keywords: `bill,medical,cityclinic,child-b-lastname,needs-payment`
Filename says Foodmart receipt, but everything else says CityClinic medical bill - completely inconsistent.
### 8. Practical Usability (0-5 points)
- **5**: Suggestions are immediately usable without modification
- **4**: Minor tweaks needed
- **3**: Some modifications needed
- **2**: Significant modifications needed
- **1**: Major changes required
- **0**: Not usable

## Scoring Method

1. Score each criterion (0-5 points)
2. Calculate total score: Sum of all 8 criteria (max 40 points)
3. Calculate percentage: (Total Score / 40) × 100
4. Note any specific issues or patterns

## Test Results Template

```
Test #: [1/2/3]
PDF File: [filename]
Date Tested: [date]

Scores:
1. Filename Quality: ___/5
2. Title Quality: ___/5
3. Subject Quality: ___/5
4. Keywords - Taxonomy Compliance: ___/5
5. Keywords - Completeness: ___/5
6. Keywords - Format: ___/5
7. Overall Accuracy: ___/5
8. Practical Usability: ___/5

Total Score: ___/40 (___%)

AI Suggestions:
- Filename: [suggested filename]
- Title: [suggested title]
- Subject: [suggested subject]
- Keywords: [suggested keywords]

Issues/Notes:
[Any specific problems or observations]

---
```

## Target Scores

- **Excellent**: 35-40 points (87.5-100%)
- **Good**: 28-34 points (70-87.4%)
- **Acceptable**: 20-27 points (50-69.9%)
- **Needs Improvement**: <20 points (<50%)

## Common Issues to Watch For

1. **Wrong dashes in filename** - Should use em dashes (—) to separate sections, not regular dashes or spaces
2. **Invented tags** - Must use exact taxonomy slugs (e.g., use "keep-annual" not "paid", use "keep-7yr" not "scan-only")
3. **Missing vendor tags** - Should identify vendors when present (use exact slugs like "foodmart", "cityclinic", "firstbank")
4. **Missing person tags** - Should identify people when present (use exact slugs like "firstname-m-lastname", "child-a-lastname")
5. **Wrong date format** - Should be YYYY-MM-DD
6. **Spaces in keywords** - Should be comma-separated with no spaces (e.g., "receipt,grocery,foodmart" not "receipt, grocery, foodmart")
7. **Generic titles/subjects** - Should be specific to document
8. **Using removed tags** - Do not use "paid" or "scan-only" - use action tags like "needs-payment", "keep-annual", "keep-7yr", "keep-permanent" instead