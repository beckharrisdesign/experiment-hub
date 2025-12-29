# Testing the Listing Generation Agent

This guide shows how to test the new agent-based listing generation that connects patterns, templates, and brand identity.

## Prerequisites

1. **Server Running**: Etsy prototype server on port 3001
   ```bash
   cd experiments/etsy-embroidery-pattern-manager/prototype
   npm run dev
   ```

2. **OpenAI API Key**: Set in `.env.local`
   ```bash
   OPENAI_API_KEY=your_key_here
   ```

3. **Brand Identity**: Must be set up first
   - Navigate to `/brand-identity`
   - Complete the 3-step wizard (store name, brand tone, creative direction)
   - This is required - listings won't generate without it

4. **Patterns Created**: At least one pattern in the system
   - Navigate to `/patterns`
   - Create patterns manually or upload images
   - Patterns should have: name, category, difficulty, style, notes (optional)

5. **Product Template Created**: At least one template
   - Navigate to `/product-templates`
   - Create a template (e.g., "Single Digital Download")
   - Set types (digital/physical), numberOfItems (single/three/five)

## Testing Methods

### Method 1: Via UI (Recommended)

#### Test Single Pattern Listing

1. **Navigate to Listings Page**
   ```
   http://localhost:3001/listings
   ```

2. **Click "Create New Listing"**

3. **Step 1: Select Template**
   - Choose a template (e.g., "Single Digital Download")
   - Click on the template card

4. **Step 2: Select Pattern**
   - Select exactly 1 pattern (for single template)
   - Pattern cards should show images if available
   - Click to select/deselect

5. **Step 3: Generate Listing**
   - Click "Generate Listing" button
   - Watch for loading spinner
   - Should transition to edit step

6. **Step 4: Review Generated Content**
   - **Title**: Should be SEO-optimized, max 140 chars, include pattern name
   - **Description**: Should use brand tone, include structure (What's Included, Pattern Details, How to Use)
   - **Tags**: Should have exactly 13 tags, relevant to pattern
   - **Category**: Should suggest appropriate Etsy category
   - **Price**: Should be reasonable for product type

7. **Verify Brand Consistency**
   - Description tone should match selected brand tone
   - Store name may be included naturally
   - Visual style should influence language

8. **Save Listing**
   - Make any edits if needed
   - Click "Save Listing"
   - Should redirect to listings page

#### Test Bundle Listing (3 or 5 patterns)

1. **Create/Select Template**
   - Use a template with `numberOfItems: 'three'` or `'five'`

2. **Select Multiple Patterns**
   - Select exactly 3 or 5 patterns (matching template requirement)
   - System validates count

3. **Generate Listing**
   - Should generate bundle-specific content
   - Title should indicate bundle
   - Description should mention all patterns
   - Price should reflect bundle discount (20-30% off)

### Method 2: Via API (Direct Testing)

#### Test with curl

```bash
# Generate listing for single pattern
curl -X POST http://localhost:3001/api/listings/generate \
  -H "Content-Type: application/json" \
  -d '{
    "productTemplateId": "your-template-id",
    "patternIds": ["your-pattern-id"]
  }'
```

#### Test with Node.js script

Create `test-listing-agent.js`:

```javascript
const fetch = require('node-fetch');

async function testListingGeneration() {
  const baseUrl = 'http://localhost:3001';
  
  // 1. Check brand identity
  const brandResponse = await fetch(`${baseUrl}/api/brand-identity`);
  const brand = await brandResponse.json();
  console.log('Brand Identity:', brand?.storeName || 'NOT SET');
  
  if (!brand) {
    console.error('❌ Brand identity not set! Set it first at /brand-identity');
    return;
  }
  
  // 2. Get patterns
  const patternsResponse = await fetch(`${baseUrl}/api/patterns`);
  const patterns = await patternsResponse.json();
  console.log(`\nFound ${patterns.length} patterns`);
  
  if (patterns.length === 0) {
    console.error('❌ No patterns found! Create patterns first.');
    return;
  }
  
  // 3. Get templates
  const templatesResponse = await fetch(`${baseUrl}/api/product-templates`);
  const templates = await templatesResponse.json();
  console.log(`Found ${templates.length} templates`);
  
  if (templates.length === 0) {
    console.error('❌ No templates found! Create templates first.');
    return;
  }
  
  // 4. Generate listing
  const template = templates.find(t => t.numberOfItems === 'single') || templates[0];
  const pattern = patterns[0];
  
  console.log(`\n🧪 Testing listing generation:`);
  console.log(`   Template: ${template.name}`);
  console.log(`   Pattern: ${pattern.name}`);
  console.log(`   Brand Tone: ${brand.brandTone}`);
  
  const generateResponse = await fetch(`${baseUrl}/api/listings/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productTemplateId: template.id,
      patternIds: [pattern.id]
    })
  });
  
  if (!generateResponse.ok) {
    const error = await generateResponse.json();
    console.error('❌ Generation failed:', error);
    return;
  }
  
  const listing = await generateResponse.json();
  
  console.log('\n✅ Generated Listing:');
  console.log(`   Title: ${listing.title}`);
  console.log(`   Title Length: ${listing.title.length}/140`);
  console.log(`   Tags: ${listing.tags.length} tags`);
  console.log(`   Category: ${listing.category || 'N/A'}`);
  console.log(`   Price: $${listing.price || 'N/A'}`);
  console.log(`   SEO Score: ${listing.seoScore || 'N/A'}`);
  console.log(`\n   Description Preview:`);
  console.log(`   ${listing.description.substring(0, 200)}...`);
}

testListingGeneration().catch(console.error);
```

Run:
```bash
node test-listing-agent.js
```

### Method 3: Check Server Logs

Watch the server console for detailed logging:

```bash
# In terminal where server is running
# Look for these log messages:

[generateListing] Starting listing generation
[generateListing] Brand identity found: Your Store Name
[generateListing] Product template found: Single Digital Download
[generateListing] Patterns loaded: ['Pattern Name']
[generateListing] Is bundle: false
[generateListing] OpenAI available: true
[generateListing] Attempting agent-based generation...
[generateListing] Agent response received: { title: '...', tagsCount: 13, hasPrice: true }
[generateListing] Final listing data: { ... }
[generateListing] Listing inserted into database
```

## What to Verify

### ✅ Success Indicators

1. **Agent Response**
   - Logs show "Agent response received"
   - No fallback warnings
   - Response includes all fields

2. **Content Quality**
   - Title is SEO-optimized (not just "Pattern Name - Embroidery Pattern")
   - Description uses brand tone consistently
   - Description has structure (sections, formatting)
   - Exactly 13 tags (no more, no less)
   - Tags are relevant and varied
   - Price is reasonable

3. **Brand Integration**
   - Description tone matches brand tone setting
   - Store name may appear naturally
   - Visual style influences language choices

4. **Pattern Context**
   - Description mentions pattern details (category, difficulty, style)
   - Tags include pattern-specific keywords
   - Content reflects pattern notes if provided

5. **Template Context**
   - Description mentions what's included (from template types)
   - Common instructions appear if template has them
   - Product type is clear (digital/physical)

### ❌ Failure Indicators

1. **Fallback Used**
   - Logs show "Using fallback listing data"
   - Generic title/description
   - Basic tags only

2. **Missing Context**
   - Description doesn't use brand tone
   - Pattern details not mentioned
   - Template info missing

3. **Validation Errors**
   - Wrong number of tags (not 13)
   - Title too long (>140 chars)
   - Missing required fields

## Debugging

### If Agent Fails

1. **Check OpenAI API Key**
   ```bash
   # In .env.local
   OPENAI_API_KEY=sk-...
   ```

2. **Check API Response**
   - Look for JSON parsing errors in logs
   - Check if response format is correct
   - Verify JSON mode is working

3. **Check Pattern Data**
   - Ensure patterns have complete information
   - Check pattern notes, category, difficulty

4. **Check Template Data**
   - Verify template types are set
   - Check commonInstructions if applicable

### Common Issues

**Issue**: "Brand identity must be set"
- **Fix**: Go to `/brand-identity` and complete setup

**Issue**: "Pattern not found"
- **Fix**: Ensure pattern IDs are correct, patterns exist

**Issue**: "Template not found"
- **Fix**: Verify template ID, template exists

**Issue**: "Agent returned X tags, expected exactly 13"
- **Fix**: This is a validation error - agent didn't follow instructions
- Check logs for full response
- May need to adjust prompt or retry

**Issue**: Fallback always used
- **Fix**: Check OpenAI API key, network connection
- Verify API key has credits
- Check server logs for error messages

## Expected Output Examples

### Friendly Brand Tone
```
Title: "Floral Garden Embroidery Pattern PDF - Botanical Design - Instant Download - Stitch & Bloom"

Description: "You'll love creating this beautiful botanical garden! ✨

✨ What's Included:
- High-resolution PDF pattern file
- Instant digital download
- Print-ready format

📐 Pattern Details:
This beginner-friendly pattern features elegant floral elements perfect for adding a touch of nature to your projects. The design includes clear stitch guides and works beautifully on hoops, tote bags, or framed artwork.

🎨 How to Use:
1. Download your PDF file instantly after purchase
2. Print the pattern at your desired size
3. Transfer to your fabric using your preferred method
4. Follow the included stitch guide to create your masterpiece!

Perfect for embroidery enthusiasts of all skill levels. Start stitching your garden today!"
```

### Professional Brand Tone
```
Title: "Professional Floral Embroidery Pattern - Digital PDF Download - Botanical Design"

Description: "This professional-grade embroidery pattern provides a comprehensive botanical design suitable for commercial and personal use.

What's Included:
- High-resolution PDF pattern file
- Instant digital download
- Print-ready format

Pattern Specifications:
This intermediate-level pattern features detailed floral elements designed for quality embroidery work. The pattern includes technical specifications and stitch guides.

Usage Instructions:
1. Download the PDF file immediately after purchase
2. Print at your preferred scale
3. Transfer to fabric using your standard method
4. Follow the provided stitch guide for optimal results

This pattern is designed for embroidery professionals and serious crafters seeking high-quality designs."
```

## Next Steps

After testing:
1. Verify listings appear in `/listings` page
2. Test editing generated listings
3. Test bulk generation (if applicable)
4. Test with different brand tones
5. Test bundle listings (3 or 5 patterns)
6. Verify SEO scores are calculated
7. Test export functionality

