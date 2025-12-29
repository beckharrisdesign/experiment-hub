# Agent Architecture

> **⚠️ IMPORTANT**: This is a **supplementary document** for architectural decisions. **Core workflow and usage instructions are in [`/agents/README.md`](./agents/README.md)**. Always check the README first for how to use agents. This document is only for understanding when/why to create new agents or extend the system.

## Overview

The Experiment Hub uses a **layered agent architecture** that separates cross-cutting workflow agents from domain-specific experiment agents. This design enables:
- **Centralized standards** for workflow and quality
- **Domain-specific intelligence** for individual experiments
- **Agent composition** where agents can invoke others
- **Clear extension points** for experiments to customize behavior

## Current Structure

Your existing structure already follows this architecture:

```
/agents/                              # Central agents (flat structure)
├── README.md                        # Workflow and usage documentation
├── experiment-creator.md
├── market-research.md
├── prd-writer.md
├── prototype-builder.md
├── design-advisor.md
├── design-guidelines.md
├── commit-message.md
└── scoring-criteria.md

/experiments/{slug}/agents/           # Experiment-specific agents
├── README.md                        # Experiment agent overview
└── {domain-specific-agents}.md
```

**Current Status**: ✅ Architecture is already implemented correctly!

### How This Document Relates to Existing Files

| File | Purpose | When to Use |
|------|---------|-------------|
| `/agents/README.md` | **How to use agents** - Workflow steps, usage instructions, agent overview | When you want to use an existing agent or understand the workflow |
| `AGENT_ARCHITECTURE.md` (this file) | **When/why to create agents** - Architectural patterns, decision frameworks | When deciding whether to create a new agent, or how to structure agent composition |
| Individual agent files (`.md`) | **Agent instructions** - Detailed instructions for each agent | When using or implementing a specific agent |

**Example**: 
- Want to create a PRD? → Read `/agents/README.md` for workflow, then use `@prd-writer`
- Want to create a new agent? → Read `AGENT_ARCHITECTURE.md` to decide central vs experiment-specific
- Want to extend an agent? → Read `AGENT_ARCHITECTURE.md` for extension patterns, then modify the agent file

## Architecture Layers

### Layer 1: Central Agents (Hub-Level)
**Location**: `/agents/`

Central agents provide cross-cutting functionality used across all experiments:

#### Workflow Agents
- **experiment-creator** - Creates new experiments from ideas
- **market-research** - Conducts market analysis and TAM/SAM/SOM
- **prd-writer** - Generates Product Requirements Documents
- **prototype-builder** - Builds prototype code structure

#### Quality & Guidelines Agents
- **design-advisor** - Active design review and UX guidance
- **design-guidelines** - Design system and UX principles (reference)
- **commit-message** - Commit message standards
- **scoring-criteria** - Experiment scoring methodology (reference)

**Characteristics**:
- ✅ Used across all experiments
- ✅ Define workflow standards
- ✅ Provide quality gates
- ✅ Can be invoked by other agents
- ✅ Can invoke other central agents

### Layer 2: Experiment-Specific Agents
**Location**: `/experiments/{slug}/agents/`

Domain-specific agents that provide specialized intelligence for individual experiments:

**Example**: `experiments/etsy-listing-manager/agents/`
- **listing-generator** - Etsy SEO-optimized listing generation
- **retail-advisor** - Seasonal pattern suggestions
- **test-generator** - Playwright test generation for this prototype

**Characteristics**:
- ✅ Domain-specific to one experiment
- ✅ Can reference central agents
- ✅ Can extend central agent behavior
- ✅ Not shared across experiments
- ✅ Optional (experiments may have zero or many)

## Agent Composition Patterns

### Pattern 1: Central Agent Invokes Central Agent
**Example**: `prd-writer` → `design-advisor`

```markdown
# In prd-writer.md
## Step 4: Design Review
After generating the PRD draft:
1. **Invoke @design-advisor** to review UI/UX sections
2. Incorporate design feedback
3. Finalize PRD
```

**Use Case**: Quality gates, cross-cutting concerns

### Pattern 2: Experiment Agent References Central Agent
**Example**: `listing-generator` → `design-guidelines`

```markdown
# In experiments/etsy-listing-manager/agents/listing-generator.md
## Brand Tone Application
Follow @design-guidelines for consistent tone:
- Apply brand voice from design system
- Use guidelines for accessibility
```

**Use Case**: Experiment agents leverage central standards

### Pattern 3: Experiment Agent Extends Central Agent
**Example**: Custom `prototype-builder` extension

```markdown
# In experiments/etsy-listing-manager/agents/prototype-builder-extensions.md
## Additional Instructions
When @prototype-builder creates this prototype:
1. Follow standard prototype-builder workflow
2. **Additionally**: Set up Etsy API integration
3. **Additionally**: Configure Playwright testing
```

**Use Case**: Experiment-specific requirements on top of standard workflow

### Pattern 4: Experiment Agent Composes Multiple Agents
**Example**: Custom workflow combining agents

```markdown
# In experiments/etsy-listing-manager/agents/listing-workflow.md
## Workflow
1. Use @retail-advisor to suggest patterns
2. Use @listing-generator to create listings
3. Use @design-advisor to review listing design
```

**Use Case**: Complex domain-specific workflows

## Agent Discovery & Resolution

### Resolution Order
When an agent is referenced (e.g., `@agent-name`), resolve in this order:

1. **Experiment-specific agent** (if in experiment context)
   - Check `/experiments/{current-experiment}/agents/agent-name.md`
2. **Central agent**
   - Check `/agents/agent-name.md`
3. **Not found** - Error with suggestions

### Context Awareness
- **Hub context**: Only central agents available
- **Experiment context**: Both experiment-specific and central agents available
- **Prototype context**: Inherits experiment context

## Agent Metadata & Registry

### Agent Manifest Structure
Each agent should include metadata (in comments or frontmatter):

```markdown
---
name: listing-generator
type: experiment-specific
experiment: etsy-listing-manager
version: 1.0.0
dependencies:
  - design-guidelines
invokes:
  - design-advisor (optional)
---
```

### Central Agent Registry
**File**: `/agents/registry.json` (optional, for tooling)

```json
{
  "workflow": [
    { "name": "experiment-creator", "type": "workflow" },
    { "name": "market-research", "type": "workflow" },
    { "name": "prd-writer", "type": "workflow" },
    { "name": "prototype-builder", "type": "workflow" }
  ],
  "quality": [
    { "name": "design-advisor", "type": "active" },
    { "name": "design-guidelines", "type": "reference" },
    { "name": "commit-message", "type": "reference" },
    { "name": "scoring-criteria", "type": "reference" }
  ]
}
```

## Decision Framework: Central vs Experiment-Specific

### Create Central Agent When:
- ✅ Used by 2+ experiments
- ✅ Defines workflow standards
- ✅ Provides quality gates
- ✅ Cross-cutting concern (design, testing, deployment)
- ✅ Part of core Experiment Hub workflow

### Create Experiment-Specific Agent When:
- ✅ Domain-specific to one experiment
- ✅ Uses experiment-specific data/models
- ✅ Customizes central agent behavior
- ✅ Provides specialized intelligence
- ✅ Not reusable across experiments

### Examples

**Central**: `design-advisor`
- Used by all prototypes
- Provides universal UX standards
- Invoked by `prd-writer` and `prototype-builder`

**Experiment-Specific**: `listing-generator`
- Only relevant for Etsy store management
- Uses Etsy-specific SEO knowledge
- Not applicable to other experiments

**Central**: `prototype-builder`
- Used by all experiments
- Provides standard prototype structure
- Can be extended by experiment-specific agents

## Agent Extension Points

### Extension Point 1: Workflow Hooks
Experiment agents can hook into central workflow:

```markdown
# experiments/{slug}/agents/prototype-builder-hooks.md
## Additional Steps for This Experiment
After @prototype-builder completes:
1. Add experiment-specific dependencies
2. Configure domain-specific services
3. Set up custom testing framework
```

### Extension Point 2: Override Behavior
Experiment agents can override central agent behavior:

```markdown
# experiments/{slug}/agents/custom-prd-format.md
## Custom PRD Format
For this experiment, PRDs should:
1. Follow standard @prd-writer structure
2. **Additionally**: Include Etsy-specific sections
3. **Override**: Use custom validation plan format
```

### Extension Point 3: Composition
Experiment agents can compose multiple agents:

```markdown
# experiments/{slug}/agents/validation-workflow.md
## Validation Workflow
1. Use @market-research for market analysis
2. Use @prd-writer for requirements
3. Use custom @validation-advisor for this domain
4. Use @prototype-builder for landing page
```

## Agent Versioning & Evolution

### Versioning Strategy
- **Central agents**: Version in agent file (frontmatter or comments)
- **Breaking changes**: Create new agent version or migration guide
- **Experiment agents**: Version independently per experiment

### Evolution Path
1. **Start experiment-specific**: Create in experiment directory
2. **Identify patterns**: Notice reuse across experiments
3. **Promote to central**: Move to `/agents/` when 2+ experiments use it
4. **Maintain backward compatibility**: Keep experiment-specific versions if needed

## File Structure

**Current Implementation** (recommended to keep):

```
experiment-hub/
├── agents/                          # Central agents (flat structure)
│   ├── README.md                    # Workflow and usage docs (existing)
│   ├── experiment-creator.md
│   ├── market-research.md
│   ├── prd-writer.md
│   ├── prototype-builder.md
│   ├── design-advisor.md
│   ├── design-guidelines.md
│   ├── commit-message.md
│   └── scoring-criteria.md
│
└── experiments/
    └── {slug}/
        └── agents/                  # Experiment-specific agents
            ├── README.md            # Experiment agent overview
            ├── {domain-agent-1}.md
            └── {domain-agent-2}.md
```

**Note**: The flat structure in `/agents/` is the recommended approach. It's simpler, easier to discover, and works well with the `@agent-name` syntax. Subdirectories would only add complexity without clear benefit.

## Agent Invocation Patterns

### Pattern 1: Direct Reference (Current)
User or AI assistant references agent directly:
```
@experiment-creator create a new experiment for...
```

### Pattern 2: Agent-to-Agent (Current)
Agent instructions reference other agents:
```markdown
# In prd-writer.md
After generating PRD, invoke @design-advisor for review
```

### Pattern 3: Programmatic (Future)
Code can discover and invoke agents:
```typescript
// Future: lib/agents/resolver.ts
export function resolveAgent(name: string, context: ExperimentContext): Agent {
  // Check experiment-specific first, then central
}
```

## Best Practices

### For Central Agents
1. **Keep generic**: Avoid experiment-specific assumptions
2. **Document dependencies**: List which agents you invoke
3. **Version changes**: Note breaking changes
4. **Provide extension points**: Allow experiments to customize

### For Experiment Agents
1. **Reference central agents**: Don't duplicate central functionality
2. **Document domain context**: Explain experiment-specific requirements
3. **Keep focused**: One agent, one domain concern
4. **Follow naming**: Use descriptive, domain-specific names

### For Agent Composition
1. **Document invocations**: List which agents you invoke
2. **Handle missing agents**: Provide fallbacks or clear errors
3. **Avoid circular dependencies**: Don't create agent invocation loops
4. **Respect approval checkpoints**: Don't bypass user approval requirements

## Migration Guide

### Moving Agent from Experiment to Central

1. **Verify reuse**: Confirm 2+ experiments would benefit
2. **Generalize**: Remove experiment-specific assumptions
3. **Move file**: `experiments/{slug}/agents/{agent}.md` → `agents/{agent}.md`
4. **Update references**: Update any `@agent-name` references
5. **Update registry**: Add to central agent registry if using one
6. **Document**: Update agent README

### Creating Experiment-Specific Extension

1. **Identify need**: Determine what central agent doesn't cover
2. **Create extension**: `experiments/{slug}/agents/{agent}-extensions.md`
3. **Reference central**: Document how it extends central agent
4. **Document usage**: Explain when to use extension vs central

## Examples

### Example 1: Central Workflow Agent
**File**: `/agents/prd-writer.md`
- Used by all experiments
- Invokes `@design-advisor`
- References `@design-guidelines`
- Generic PRD structure

### Example 2: Experiment Domain Agent
**File**: `/experiments/etsy-listing-manager/agents/listing-generator.md`
- Only for Etsy store management
- References `@design-guidelines` for tone
- Uses Etsy-specific SEO knowledge
- Not applicable to other experiments

### Example 3: Experiment Extension
**File**: `/experiments/etsy-listing-manager/agents/prototype-builder-extensions.md`
- Extends `@prototype-builder`
- Adds Etsy API setup
- Adds Playwright configuration
- Keeps standard prototype structure

## Future Enhancements

### Agent Registry API
```typescript
// lib/agents/registry.ts
export function listAgents(context?: ExperimentContext): Agent[]
export function resolveAgent(name: string, context?: ExperimentContext): Agent
export function getAgentDependencies(agent: Agent): Agent[]
```

### Agent Validation
- Validate agent structure
- Check for circular dependencies
- Verify required metadata
- Validate invocation references

### Agent Composition Engine
- Automatic agent discovery
- Dependency resolution
- Execution orchestration
- Error handling and fallbacks

## Relationship to Existing Documentation

### `/agents/README.md` (Primary Source of Truth)
- **Purpose**: **Core workflow and usage instructions** - this is the primary documentation
- **Content**: How to use agents, workflow steps, approval checkpoints, agent overview
- **Audience**: Users, AI assistants, and agents themselves
- **Status**: ✅ **All agents reference this for core workflow decisions**

### `AGENT_ARCHITECTURE.md` (This Document - Supplementary)
- **Purpose**: Architectural patterns, decision frameworks, extension strategies
- **Content**: When to create agents, composition patterns, extension points
- **Audience**: Developers extending the system, making architectural decisions
- **Status**: Referenced from README, but README is source of truth

**Important**: 
- ✅ **Core decisions stay in README**
- ✅ **All agents check README first**
- ✅ **This document is supplementary only** - referenced when needed for architectural decisions

## Summary

**Central Agents**: Cross-cutting workflow and quality standards
- Location: `/agents/` (flat structure)
- Scope: All experiments
- Purpose: Workflow orchestration, quality gates
- Documentation: See `/agents/README.md` for workflow details

**Experiment Agents**: Domain-specific intelligence
- Location: `/experiments/{slug}/agents/`
- Scope: Single experiment
- Purpose: Specialized functionality, extensions
- Documentation: Each experiment's `agents/README.md`

**Composition**: Agents can invoke and extend each other
- Central → Central: Quality gates, workflow steps (already happening: `prd-writer` → `design-advisor`)
- Experiment → Central: Leverage standards (already happening: `listing-generator` references `design-guidelines`)
- Experiment → Experiment: Domain workflows

**Current Status**: ✅ Your architecture is already correctly implemented. This document formalizes patterns you're already using and provides guidance for future extensions.

