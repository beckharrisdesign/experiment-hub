# Experiment Workflow

The five workflow skills live in `skills/` and are invocable from any tool:

| Skill | What it does | Invocation |
|---|---|---|
| `experiment-creator` | Refines idea → creates directory + metadata | `/experiment-creator` or `@skills/experiment-creator.md` |
| `market-research` | TAM/SAM/SOM analysis, scoring, go/no-go | `/market-research` or `@skills/market-research.md` |
| `prd-writer` | Generates PRD, invokes design-advisor | `/prd-writer` or `@skills/prd-writer.md` |
| `prototype-builder` | Proposes stack → generates code, invokes design-advisor | `/prototype-builder` or `@skills/prototype-builder.md` |
| `design-advisor` | Design review of PRD, code, or live URL | `/design-advisor` or `@skills/design-advisor.md` |

## Standard flow

```
experiment-creator → market-research → prd-writer → prototype-builder
                                                 ↑               ↑
                                          design-advisor   design-advisor
```

Each step requires explicit user approval before proceeding. Agents present proposals and wait — they don't auto-chain.

## Experiment-specific agents

Individual experiments may have their own agents in `experiments/{slug}/agents/`. These are scoped to that experiment only.
