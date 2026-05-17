---
name: openspec-propose
description: Propose a new change with all artifacts generated in one step. Use when the user wants to quickly describe what they want to build and get a complete proposal with design, specs, and tasks ready for implementation.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.3.1"
---

Propose a new change — create the change and generate artifacts (mode depends on schema).

**`experiment-hub-lite` (default):** one artifact per approval turn — proposal → specs → design → tasks. Human anchor required before proposal.

**Other schemas:** may batch all artifacts in one step unless instructions say otherwise.

When ready to implement, run /opsx:apply

---

**Input**: The user's request should include a change name (kebab-case) OR a description of what they want to build.

**Steps**

1. **If no clear input provided, ask what they want to build**

   Use the **AskUserQuestion tool** (open-ended, no preset options) to ask:

   > "What change do you want to work on? Describe what you want to build or fix."

   From their description, derive a kebab-case name (e.g., "add user authentication" → `add-user-auth`).

   **IMPORTANT**: Do NOT proceed without understanding what the user wants to build.

2. **Create the change directory**

   ```bash
   openspec new change "<name>"
   ```

   This creates a scaffolded change at `openspec/changes/<name>/` with `.openspec.yaml` using the **default schema** from `openspec/config.yaml` (currently **`experiment-hub-lite`**). Override: `--schema experiment-hub` (sponsor ladder), `--schema quickstart` (vanilla), or `schema: spec-driven` in `.openspec.yaml`.

3. **Get the artifact build order**

   ```bash
   openspec status --change "<name>" --json
   ```

   Parse the JSON to get:
   - `applyRequires`: array of artifact IDs needed before implementation (e.g., `["tasks"]`)
   - `artifacts`: list of all artifacts with their status and dependencies

4. **Lite schema gate (when `schemaName` is `experiment-hub-lite`)**

   Before creating `proposal`:
   - Require **Human anchor** — founder quote verbatim (paste or `experiments/<slug>/docs/intent.md`). If missing, use **AskUserQuestion** to collect it; do not invent anchor-only prose.
   - **One artifact per user turn:** create only the next `ready` artifact, show it, **stop and wait for approval** before the next (do not batch proposal + specs + design + tasks in one response).

5. **Create artifacts in sequence until apply-ready**

   Use the **TodoWrite tool** to track progress through the artifacts.

   **Lite:** stop after each artifact (step 4). **Other schemas:** loop until all `applyRequires` artifacts are done.

   Loop through artifacts in dependency order (artifacts with no pending dependencies first):

   a. **For each artifact that is `ready` (dependencies satisfied)**:
   - Get instructions:
     ```bash
     openspec instructions <artifact-id> --change "<name>" --json
     ```
   - The instructions JSON includes:
     - `context`: Project background (constraints for you - do NOT include in output)
     - `rules`: Artifact-specific rules (constraints for you - do NOT include in output)
     - `template`: The structure to use for your output file
     - `instruction`: Schema-specific guidance for this artifact type
     - `outputPath`: Where to write the artifact
     - `dependencies`: Completed artifacts to read for context
   - Read any completed dependency files for context
   - Create the artifact file using `template` as the structure
   - Apply `context` and `rules` as constraints - but do NOT copy them into the file
   - Show brief progress: "Created <artifact-id>"

   b. **Continue until all `applyRequires` artifacts are complete**
   - After creating each artifact, re-run `openspec status --change "<name>" --json`
   - Check if every artifact ID in `applyRequires` has `status: "done"` in the artifacts array
   - Stop when all `applyRequires` artifacts are done

   c. **If an artifact requires user input** (unclear context):
   - Use **AskUserQuestion tool** to clarify
   - Then continue with creation

6. **Show final status**
   ```bash
   openspec status --change "<name>"
   ```

**Output**

After completing all artifacts, summarize:

- Change name and location
- List of artifacts created with brief descriptions
- What's ready: "All artifacts created! Ready for implementation."
- Prompt: "Run `/opsx:apply` or ask me to implement to start working on the tasks."

**Artifact Creation Guidelines**

- Follow the `instruction` field from `openspec instructions` for each artifact type
- The schema defines what each artifact should contain - follow it
- Read dependency artifacts for context before creating new ones
- Use `template` as the structure for your output file - fill in its sections
- **IMPORTANT**: `context` and `rules` are constraints for YOU, not content for the file
  - Do NOT copy `<context>`, `<rules>`, `<project_context>` blocks into the artifact
  - These guide what you write, but should never appear in the output

**Guardrails**

- **experiment-hub-lite:** Human anchor non-empty; max 2 capabilities in proposal; max 5 requirements in specs; one artifact per approval; load `skills/<skill>.md` per schema `instruction` in `openspec instructions` JSON
- Create ALL artifacts needed for implementation (as defined by schema's `apply.requires`)
- Always read dependency artifacts before creating a new one
- If context is critically unclear, ask the user - but prefer making reasonable decisions to keep momentum
- If a change with that name already exists, ask if user wants to continue it or create a new one
- Verify each artifact file exists after writing before proceeding to next
