---
name: theme-proposals
description: >-
  Find themes on Katy's Idea Lineage graph that are missing, too broad, or
  wrong, and write each fix as a proposal she accepts or declines inside the
  graph. A fix can be a new theme, a split of an overloaded one (e.g. physical
  making vs. tooling for design teams), or moving nodes between themes. Never
  edits nodes or themes directly. Use when the user says a theme is "one giant
  blob", asks for more precise themes, or wants the themes checked against
  what the work was actually for. Trigger phrases: "propose themes", "find
  better themes", "this theme is too broad", "split this theme", "check the
  themes", "what themes am I missing".
---

# Theme proposals

Themes are the colored blobs on the Idea Lineage graph. They answer *who or
what the work was for*. A theme that holds everything says nothing. This skill
reads what each idea and tool was actually for and proposes sharper themes.
**Claude proposes; Katy decides.** Nothing changes until she taps *Yes*.

Companion to `skills/lineage-proposals/SKILL.md`, which covers the links
between nodes. Read its **Sources** section: the same rules apply here
(Notion first, git for dates, never `data/experiments.json`).

## The artifact

- **URL:** `https://claude.ai/artifact/Vk5R8upbve4sWf4SZd3C42`. Read and write
  its database with the **ArtifactData** tool.
- **`nodes`:** each node has `themes[]`. Only `idea` and `tool` nodes carry
  themes; tests, decisions and sunsets inherit them from their family.
- **Built-in themes** (keys): `makers` (Empowering makers), `environment`,
  `parents` (Modern working parents), `neuro` (Supporting neurodiversity),
  `building` (Building products at scale, emptied on purpose because it
  swallowed everything). A theme with no nodes is hidden on the graph.
- **`themes` collection:** every theme beyond the built-in five, as
  `{label, lines: [line1, line2], color: {light, dark}, createdAt}`, keyed by a
  kebab-case id. Never write here directly. Accepting a proposal creates the
  document.
- **`proposals` collection:** the review queue. Theme proposals use two kinds
  of change:

```json
{
  "title": "New theme: Empowering design teams",
  "status": "open",
  "createdAt": "<ISO timestamp>",
  "source": "From node records + Notion",
  "rationale": "What the theme holds today, and the clearer grouping the evidence shows.",
  "evidence": ["Dated, sourced fact, in Katy's words where they exist", "…"],
  "changes": [
    { "addTheme": { "key": "design-teams", "label": "Empowering design teams",
                    "lines": ["Empowering", "design teams"],
                    "color": { "light": "#0e7490", "dark": "#67e8f9" } } },
    { "node": "cisco-hub", "field": "themes", "from": ["makers"], "to": ["design-teams"] }
  ]
}
```

- `from` must equal the node's current `themes` exactly, in any order. The
  page warns when it drifts.
- Keep a node's other themes in both `from` and `to`. Moving one theme must
  not drop the rest (e.g. `["makers","neuro"]` → `["design-teams","neuro"]`).
- Each open proposal adds +1 to the badge of every node it would change.

## What to look for

1. **Overloaded themes.** Count members per theme. A theme holding about 40%
   of themed nodes, or one whose members don't share a *who it's for*, is a
   split candidate. `building` became one giant blob this way.
2. **Two audiences under one label.** Read each member's own words (`why`,
   `need`, `riskiest`) and its Notion row. Your founding example is
   *Empowering makers*:
   - **physical making:** embroidery, Etsy patterns, stitch files, seeds,
     laser and craft work;
   - **tooling for design teams inside companies:** Cisco hub, Figma Grabber,
     Snap Issue, the Webex bot, the mentorship matcher.
3. **Missing themes.** A cluster of nodes that share an audience but no
   theme, or have no theme at all (those show a *Needs review* badge).
4. **Wrong theme.** A node whose own record contradicts its theme.
5. **Katy's lens.** Themes describe *who the work empowers or what it
   protects*, not the tech stack and not whether it was a business. "Uses AI"
   is never a theme.

## Method

1. **Snapshot.** Run ArtifactData `list` on `nodes`, `themes` and `proposals`,
   each with an `out_dir` in the scratchpad. Skip any change already in an open
   proposal. Never re-propose a declined one without new evidence, and say so
   in the rationale.
2. **Table every themed node:** id, kind, current themes, and its own words.
   Pull the Notion BHD Labs row where one exists (type, *Who it's for*, *Why
   this matters*).
3. **Group by audience** in plain words first, then compare with the current
   themes. Propose only where the gap is clear.
4. **Name a new theme in Katy's voice.** Use the existing pattern,
   "Empowering …" / "Supporting …" / "Modern …". `lines` splits the label onto
   two lines of similar length. Give a kebab-case `key`.
5. **Pick a color** that isn't an existing theme or node color. Taken: makers
   pink, environment teal-green, parents olive, neuro purple, building gold;
   node kinds use green, orange, blue and gray. Give a `light` color dark
   enough for text on a pale background and a `dark` color light enough on
   near-black.
6. **Bundle by claim.** One proposal = one idea Katy can say yes or no to:
   - a new theme together with its strong members;
   - a single uncertain node as its own *weaker* proposal, so a doubtful
     member never blocks the theme.
7. **Write** with one ArtifactData `batch` of `set` ops into `proposals`.
   Proposals are new documents, so they need no `if_version`.
8. **Don't touch `nodes` or `themes`.** Accepting in the graph applies the
   change. Undo removes a theme that the proposal created.

## Rating

- *Strong:* the node's own words or its Notion row name the audience.
- *Weaker:* inferred from the kind of work only. Put `· weaker evidence` in
  `source` and say what would settle it.

## Reply to the user

Keep it short and scannable, matching her preferences:

- the theme sizes before and after, in one line;
- a table with one row per proposal: the change, the nodes, its strength and
  the key evidence;
- nodes left as they are, and why;
- anything that needs her call (e.g. a node that fits two audiences) as one
  line each.

End with the artifact link.
