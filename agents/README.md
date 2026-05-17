# Experiment Workflow

The main workflow skills live in `skills/` and are invocable from any tool:

| Skill                  | What it does                                                           | Invocation                                                   |
| ---------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| `experiment-creator`   | Refines idea → creates directory + metadata                            | `/experiment-creator` or `@skills/experiment-creator.md`     |
| `market-research`      | TAM/SAM/SOM analysis, scoring, go/no-go                                | `/market-research` or `@skills/market-research.md`           |
| `business-case-writer` | Honest business case, interview + live rubric, `docs/business-case.md` | `/business-case-writer` or `@skills/business-case-writer.md` |
| `prd-writer`           | Lean PRD (outcomes + failing tests), design-advisor if UI              | `/prd-writer` or `@skills/prd-writer.md`                     |
| `prototype-builder`    | Proposes stack → generates code, invokes design-advisor                | `/prototype-builder` or `@skills/prototype-builder.md`       |
| `design-advisor`       | Design review of PRD, code, or live URL                                | `/design-advisor` or `@skills/design-advisor.md`             |

## Standard flow

```
experiment-creator → market-research → prd-writer → prototype-builder
                            | optional        ↑            ↑
                            v            design-advisor  design-advisor
                   business-case-writer    (PRD, code, or live URL)
```

Use **`business-case-writer`** when you want a full narrative business case (GO/NO-GO, hub Business Case tab). It pairs well **after** market research so numbers and competition are already scoped; the skill still re-verifies with web search and the live scoring page.

Each step requires explicit user approval before proceeding. Agents present proposals and wait — they don't auto-chain.

### Unified spike path (skills + OpenSpec lite)

You do not choose “agents first” vs “opsx first” for spikes:

1. **`experiment-creator`** (or founder paste) → Human anchor prose (also `experiments/<slug>/docs/intent.md` if you want).
2. **`/opsx:propose`** with default schema **`experiment-hub-lite`** → proposal → specs → design → tasks (one artifact per approval).
3. **`/opsx:apply`** → prototype under `experiments/<slug>/prototype/` (prototype-builder voice via schema apply instructions).

Optional: run **`prd-writer`** before opsx if you want a full `docs/PRD.md`; lite proposal links it under Optional links.

## OpenSpec (hub platform specs)

Use [OpenSpec](https://openspec.dev/) for living requirements beside code (`openspec/specs/<capability>/spec.md`), reviewable deltas, and change packages (`proposal.md`, `design.md`, `tasks.md`).

- **Default workflow schema:** [`openspec/config.yaml`](openspec/config.yaml) uses **`experiment-hub-lite`** (intent-first spikes). Override per change: `schema: experiment-hub` (sponsor ladder), `schema: quickstart` (vanilla).

- **Cursor / Claude Code:** `/opsx:propose`, `/opsx:apply`, `/opsx:archive`, `/opsx:explore` — stubs in `.cursor/commands/` and `.claude/commands/opsx/`; **edit workflow only in** `skills/openspec-*.md` (see `.cursor/rules/openspec-workflow.mdc`).
- **Details:** `openspec/README.md`, `.cursor/rules/openspec-workflow.mdc`, and Figma linkage rules in `.cursor/rules/figma.mdc` (OpenSpec `design.md` section).

Branch and PR expectations follow [`.cursor/rules/github-workflow.mdc`](../.cursor/rules/github-workflow.mdc) (e.g. `cursor/<short-descriptor>`, one PR per unit, no agent merge).

## Experiment-specific agents

Individual experiments may have their own agents in `experiments/{slug}/agents/`. These are scoped to that experiment only.
