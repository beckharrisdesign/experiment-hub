# Experiment Hub Agent Framework

This directory contains agent instructions and guidelines for the Experiment Hub workflow.

## Agent Overview

### Workflow Agents

1. **experiment-creator.md** - Creates experiments from initial ideas
   - **Role**: Product Strategist / Innovation Consultant
   - Input: Raw experiment idea
   - Output: Structured experiment with directory and metadata
   - Use: `@experiment-creator`

2. **market-research.md** - Conducts market research and business opportunity analysis
   - **Role**: Entrepreneurship Mentor
   - Input: Product concept and target market
   - Output: Market research report with TAM/SAM/SOM estimates
   - Use: `@market-research`

3. **prd-writer.md** - Generates PRDs from experiments
   - **Role**: Product Management Leader
   - Input: Experiment statement and context
   - Output: Comprehensive PRD document
   - Use: `@prd-writer`

4. **prototype-builder.md** - Builds prototypes from PRDs
   - **Role**: Senior Engineering Lead / Tech Lead
   - Input: PRD and technical requirements
   - Output: Prototype code structure and initial implementation
   - Use: `@prototype-builder`

### Quality & Guidelines Agents

5. **design-advisor.md** - Active design review and guidance
   - **Testing**: Run `scripts/test-site.sh <URL>` first (accessible, resolves, <1s). Test-first: if tests fail, fix before proceeding.
   - **Role**: Design Lead / UX Director
   - **Input**: PRD documents, prototype code, or live deployed URL
   - **Output**: Design review reports, heuristic evaluations, recommendations, compliance checks
   - **Use**: `@design-advisor`
   - **Integration**: Automatically invoked by PRD Writer and Prototype Builder
   - **Core strategy**: Both code review and live browser evaluation are essential—use both for a complete design strategy
   - Provides: Code-level design review, live heuristic evaluation (via browser), UI/UX feedback, accessibility audits, component suggestions

6. **commit-message.md** - Guidelines for well-formed commit messages
   - **Role**: Senior Developer / Engineering Manager
   - Use: Before committing code
   - Provides: Format, examples, validation checklist

7. **design-guidelines.md** - Design and UX principles reference
   - **Role**: Design Lead / UX Director (reference document)
   - Use: Reference document for design standards
   - Provides: Design system, UX patterns, quality checklist (used by Design Advisor)

## Workflow

### Standard Experiment Flow

```
1. User has experiment idea
   ↓
2. @experiment-creator refines idea and creates experiment
   - Refines concept (⚠️ requires approval)
   - Generates statement and tags (⚠️ requires approval)
   - Creates directory structure
   - Generates metadata (NO scores - scores generated after market research)
   - Links Documentation and Prototype
   ⚠️ Stops here - waits for explicit user request to proceed
   ↓
3. @market-research analyzes business opportunity (optional, user must explicitly request)
   - Analyzes product concept (⚠️ requires approval)
   - Researches market size and trends
   - Calculates TAM/SAM/SOM estimates (⚠️ requires approval)
   - Generates market research report
   - Generates experiment scores based on market analysis (⚠️ requires approval)
   - Saves to docs/market-research.md
   - Updates experiment metadata with scores
   ⚠️ Stops here - can inform PRD but waits for explicit user request
   ↓
4. @prd-writer creates PRD (user must explicitly request)
   - Analyzes experiment (⚠️ requires approval)
   - Incorporates market research insights (if available)
   - Generates structured PRD
   - **Invokes @design-advisor** for UI/UX review (⚠️ requires approval)
   - Incorporates design feedback
   - Final PRD (⚠️ requires approval before saving)
   - Saves to docs/PRD.md
   ⚠️ Stops here - waits for explicit user request to proceed
   ↓
5. @prototype-builder generates prototype (user must explicitly request)
   - Analyzes PRD (⚠️ requires approval)
   - Proposes structure and tech stack (⚠️ requires approval)
   - Creates code structure
   - Generates initial implementation
   - **Invokes @design-advisor** for design compliance review (⚠️ requires approval)
   - Incorporates design improvements
   - Final prototype structure (⚠️ requires approval)
   ⚠️ Stops here - provides guidance but waits for user direction
   ↓
6. Developer implements and iterates
   - Uses commit-message guidelines
   - References design-guidelines (or calls @design-advisor for reviews)
   - Builds prototype in experiment directory
```

### ⚠️ Approval Checkpoints

**Important**: All workflow agents include explicit approval checkpoints. Agents will:
- Present proposals before taking action
- Wait for explicit user approval before creating files or directories
- Not automatically proceed to the next step in the workflow
- Require explicit user requests to move between agents (experiment → PRD → prototype)

## Usage

### In Cursor/IDE

Reference agents using `@` syntax:
- `@experiment-creator` - Create new experiment
- `@market-research` - Conduct market research and TAM analysis
- `@prd-writer` - Generate PRD for experiment
- `@prototype-builder` - Build prototype from PRD
- `@design-advisor` - Review PRD, prototype code, or live site for design compliance (also auto-invoked by PRD Writer and Prototype Builder). Use browser to evaluate deployed URLs.
- `@commit-message` - Get commit message guidance
- `@design-guidelines` - Reference design standards (reference document)

### Agent Instructions

Each agent file contains:
- **Purpose**: What the agent does
- **Workflow**: Step-by-step process
- **Input**: Required inputs
- **Output**: Expected outputs
- **Instructions**: Detailed agent instructions
- **Examples**: Example interactions
- **Validation**: Rules and error handling

## Integration

These agents are designed to work with:
- Cursor AI assistant
- CLI tools (future)
- Automated workflows (future)
- Manual reference during development

## Agent Architecture

For architectural decisions about creating new agents, extending existing agents, or understanding agent composition patterns, see [`AGENT_ARCHITECTURE.md`](../AGENT_ARCHITECTURE.md).

**Important**: This README contains the **core workflow and usage instructions**. The architecture document provides supplementary guidance for extending the system.

## Maintenance

- Update agents as workflow evolves
- Add examples from real experiments
- Refine guidelines based on experience
- Document edge cases and solutions
- Keep core decisions in this README

