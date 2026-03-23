# User Communication Review

Audit user-facing text in a frontend codebase against basic content design standards. Covers errors, labels, empty states, confirmations, and general microcopy.

Draws from Mailchimp's Content Style Guide, Apple HIG, Material Design writing guidelines, and Shopify Polaris.

---

## What to scan

Search for user-facing strings in:
- Toast / snackbar / notification calls (`toast(`, `toast.error(`, `showNotification(`, `alert(`)
- Error state renders (`<ErrorMessage`, `setError(`, `errorText`, `helperText`)
- Button and CTA labels (`<Button`, `<a `, `label=`, `aria-label=`)
- Empty state copy (`isEmpty`, `length === 0`, "No results", "Nothing here")
- Loading and progress text ("Loading", "Please wait", `isLoading`)
- Placeholder text (`placeholder=`)
- Modal / dialog copy (titles, body, confirm/cancel labels)
- Form field labels and validation messages

---

## Standards to apply

### 1. Never surface technical internals
User-facing text must never contain:
- Raw server or API error messages (`json.message ||` is a red flag — drop the passthrough)
- HTTP status codes, stack traces, model IDs, org slugs, quota numbers
- Internal variable names, endpoint paths, or system identifiers

Every error should tell the user **what to do next**, not what failed internally.

**Before:** `"Error: 429 Too Many Requests – rate limit exceeded for org-abc123"`
**After:** `"I'm having trouble reaching AI right now. Try again in a few minutes."`

---

### 2. Use sentence case
UI labels, buttons, headings, and error messages use sentence case — not Title Case.

**Before:** `"Add New Payment Method"` / `"Something Went Wrong"`
**After:** `"Add new payment method"` / `"Something went wrong"`

Exceptions: proper nouns, product names, acronyms.

---

### 3. Button and CTA labels start with a verb, and are specific
Labels should describe the action, not just confirm it exists.

**Before:** `"Yes"` / `"OK"` / `"Submit"` / `"Click here"`
**After:** `"Save changes"` / `"Delete account"` / `"Send invite"` / `"Try again"`

Destructive actions should name what they destroy: `"Delete photo"` not `"Delete"`.

---

### 4. Error messages explain what happened and what to do
Structure: **What went wrong** (briefly, no blame) + **what the user can do**.

**Before:** `"An error occurred."`
**After:** `"We couldn't save your changes. Check your connection and try again."`

Avoid blaming the user ("you entered an invalid..."). Prefer neutral framing ("That email isn't valid — try a different format.").

---

### 5. Empty states are helpful, not just absent
Don't just say nothing is there. Tell users why, or what they can do.

**Before:** `"No results."` / `"Nothing here yet."`
**After:** `"No photos yet. Add one to get started."` / `"No matches — try a different search."`

---

### 6. Loading and progress copy is reassuring
Avoid bare "Loading..." where something more specific fits.

**Before:** `"Loading..."` / `"Please wait."`
**After:** `"Fetching your photos…"` / `"Saving…"` / `"Almost there…"`

Don't overpromise ("This will only take a second") — just be present.

---

### 7. Placeholder text gives an example, not a label
Placeholders disappear on focus and shouldn't double as field labels. They should show an example value or hint.

**Before:** `placeholder="Email address"` (same as the label)
**After:** `placeholder="you@example.com"`

---

### 8. Punctuation is calm and consistent
- End-of-sentence periods in multi-sentence messages, not single-line labels
- Avoid exclamation marks in errors or confirmations — reserve for genuine celebrations
- Ellipsis (`…`) for in-progress states only, not decoration
- No ALL CAPS for emphasis (use bold or phrasing instead)

---

### 9. Confirmation dialogs are unambiguous
The title states what's about to happen. The body explains consequences. The buttons match the action.

**Before:**
> Title: "Are you sure?"
> Buttons: "Yes" / "No"

**After:**
> Title: "Delete this photo?"
> Body: "It'll be gone for good."
> Buttons: "Delete photo" / "Keep it"

---

### 10. Tone is human, direct, and calm
Write like a helpful person, not a legal document or a hype machine.
- Short sentences. Plain words.
- No "Please be advised", "utilize", "leverage", or "seamlessly"
- No excessive reassurance ("Don't worry!", "No problem!")
- Match the emotional weight of the moment — errors shouldn't be chipper, successes can be warm

---

## How to report findings

For each issue found, note:
1. **File and line** where the string appears
2. **The current text**
3. **Which standard it violates**
4. **Suggested replacement**

Then make the fixes directly, commit, and push.
