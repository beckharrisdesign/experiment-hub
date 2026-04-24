# Experiment Workflow

The main workflow skills live in `skills/` and are invocable from any tool:

| Skill                  | What it does                                                           | Invocation                                                   |
| ---------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| `experiment-creator`   | Refines idea → creates directory + metadata                            | `/experiment-creator` or `@skills/experiment-creator.md`     |
| `market-research`      | TAM/SAM/SOM analysis, scoring, go/no-go                                | `/market-research` or `@skills/market-research.md`           |
| `business-case-writer` | Honest business case, interview + live rubric, `docs/business-case.md` | `/business-case-writer` or `@skills/business-case-writer.md` |
| `prd-writer`           | Generates PRD, invokes design-advisor                                  | `/prd-writer` or `@skills/prd-writer.md`                     |
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

## Experiment-specific agents

Individual experiments may have their own agents in `experiments/{slug}/agents/`. These are scoped to that experiment only.
