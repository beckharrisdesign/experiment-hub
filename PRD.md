# Experiment Hub - Product Requirements Document

## Overview

A locally-hosted application to manage product experiments from idea to prototype. Each experiment follows a workflow: refine the idea, create a PRD, then build a prototype. Experiments can evolve into launched products (consumer or B2B). This tool centralizes tracking, organization, and access to all experimental work.

## Problem Statement

Product experiments are scattered across files, notebooks, and browser tabs, making it difficult to:
- Quickly find and reference past experiments
- Track experiment status and outcomes
- Maintain context across work sessions
- Avoid duplicating work
- Identify which experiments are ready to launch

## Goals & Objectives

### Primary Goals
- **Speed**: Find experiments < 10 seconds, create new entry < 30 seconds
- **Focus**: Minimal distractions, clean interface
- **Simplicity**: Straightforward architecture, minimal codebase complexity
- **Product-Ready**: Track experiments that could become launched products

### Success Metrics
- Time to find past experiment < 10 seconds
- Time to create new experiment entry < 30 seconds
- Application starts in < 2 seconds
- Zero external dependencies required
- Code duplication < 20%

## Target User

**Primary User**: Solo entrepreneur building consumer and B2B products
- Technical background (can build prototypes)
- Values efficiency and minimalism
- Manages multiple product experiments simultaneously
- Each experiment could become a launched product

## Core Features

### 1. Content Types

The application manages three types of content with one-to-one-to-one relationships:

#### Experiments
- **Statement**: What you're attempting this time around (short sentence)
- **Directory**: Path to experiment directory (created automatically)
- **PRD**: Product Requirements Document for the experiment (stored in linked Documentation)
- **Prototype**: Links to or embedded prototype iterations (stored in linked Prototype)
- **Documentation ID**: Reference to associated Documentation (one-to-one)
- **Prototype ID**: Reference to associated Prototype (one-to-one)
- **Status**: Active, Completed, Abandoned, On Hold
- **Created Date**: Auto-generated timestamp
- **Last Modified**: Auto-updated timestamp
- **Tags**: Multiple tags for categorization

#### Prototypes
- **Title**: Short descriptive name
- **Description**: What the prototype demonstrates
- **Link/Path**: Reference to prototype location
- **Experiment ID**: Reference to associated Experiment (one-to-one)
- **Status**: Active, Completed, Abandoned
- **Created Date**: Auto-generated timestamp
- **Last Modified**: Auto-updated timestamp
- **Tags**: Multiple tags for categorization

#### Documentation
- **Title**: Short descriptive name
- **Content**: Rich text or markdown support (includes PRD content)
- **Experiment ID**: Reference to associated Experiment (one-to-one)
- **Created Date**: Auto-generated timestamp
- **Last Modified**: Auto-updated timestamp
- **Tags**: Multiple tags for categorization

**Relationship Model**: Each Experiment has exactly one Documentation and one Prototype. When an Experiment is created, its associated Documentation and Prototype can be created and linked automatically. Deleting an Experiment should also delete its linked Documentation and Prototype.

### 2. Navigation & Interface
- **Left Menu**: Fixed sidebar with three items - Experiments, Prototypes, Documentation
- **Main Content**: List/detail view based on selected menu item
- **Search**: Fast text search across all content types
- **Filter**: By status, date, tags
- **Dark Mode**: Default dark theme, developer tool aesthetic
- **Keyboard Shortcuts**: Power user features for speed

### 3. Content Management Workflow
1. Call `@experiment-creator` to refine idea and create experiment (creates directory and metadata)
2. Call `@prd-writer` to create PRD in documentation folder
3. Build prototype in experiment directory
4. View experiments, prototypes, and documentation in web interface

**Note**: Web interface is display-only (read-only). Experiments created via CLI/agents, not web UI.

### 4. Data Persistence
- **File System**: Experiments stored in `experiments/` directory, metadata in `data/` directory
- **JSON Storage**: Metadata stored in JSON files (`data/experiments.json`, etc.)
- **API Routes**: Next.js API routes read from file system for web interface
- **Read-Only Web**: Web interface displays data but doesn't modify it
- **CLI Creation**: Experiments created via CLI script, not web interface

## User Stories

### Story 1: Create a new experiment
**As a** solo entrepreneur, **I want to** quickly create a new experiment entry with agent assistance, **so that** I can start tracking a product idea and begin the experiment workflow.

#### 1.1 Basic experiment creation via agent
- User calls `@experiment-creator` with an initial idea
- Agent refines the idea and presents proposal for approval
- Agent creates experiment directory structure (`experiments/{slug}/`)
- Agent generates metadata and links Documentation and Prototype
- System creates subdirectories: `docs/`, `prototype/`, `notes/`

#### 1.2 Experiment metadata generation
- System generates unique IDs for Experiment, Documentation, and Prototype
- System sets default status to "Active"
- System auto-generates created date timestamp
- System suggests relevant tags based on experiment content
- System links all three entities in one-to-one relationships

#### 1.3 Validation and error handling
- System validates experiment statement is not empty
- System handles duplicate experiment slugs gracefully
- System provides clear error messages for validation failures
- System rolls back all changes if any step fails

### Story 2: View all experiments
**As a** solo entrepreneur, **I want to** see a list of all my experiments, **so that** I can quickly find and reference past work.

#### 2.1 List view display
- System displays all experiments in a list view
- Each experiment shows: statement, status, created date, last modified
- List is sortable by date (newest/oldest), status, or alphabetically
- List updates automatically when new experiments are created

#### 2.2 Experiment status indicators
- System displays clear status badges (Active, Completed, Abandoned, On Hold)
- Status is visually distinct with color coding
- Status is filterable in the list view

#### 2.3 Empty state handling
- System displays helpful message when no experiments exist
- Empty state includes guidance on how to create first experiment
- Empty state matches dark theme aesthetic

### Story 3: Search and filter experiments
**As a** solo entrepreneur, **I want to** search and filter my experiments, **so that** I can quickly find specific experiments among many.

#### 3.1 Text search functionality
- User can search across experiment statements, tags, and metadata
- Search results appear as user types (fast, real-time search)
- Search highlights matching text in results
- Search works across all content types (Experiments, Prototypes, Documentation)

#### 3.2 Filter by status
- User can filter experiments by status (Active, Completed, Abandoned, On Hold)
- Multiple status filters can be selected simultaneously
- Filter state persists across page navigation

#### 3.3 Filter by tags
- User can filter experiments by tags
- Multiple tags can be selected for filtering
- Tags are displayed as clickable filter chips
- Filter combinations (status + tags) work together

#### 3.4 Filter by date range
- User can filter experiments by created date or last modified date
- Date filters support ranges (last week, last month, custom range)
- Date filters work in combination with other filters

### Story 4: Navigate between content types
**As a** solo entrepreneur, **I want to** easily switch between viewing Experiments, Prototypes, and Documentation, **so that** I can access all related content for an experiment.

#### 4.1 Sidebar navigation
- Fixed left sidebar displays three navigation items: Experiments, Prototypes, Documentation
- Active section is clearly highlighted
- Clicking a section switches the main content view
- Navigation state persists across page refreshes

#### 4.2 Keyboard shortcuts for navigation
- User can use keyboard shortcuts to switch between sections
- Shortcuts are discoverable (shown in help or on hover)
- Shortcuts follow common patterns (Cmd/Ctrl + number keys)

#### 4.3 Consistent list view across sections
- Each section (Experiments, Prototypes, Documentation) uses consistent list view design
- List items show relevant metadata for each content type
- Clicking a list item shows detail view (if implemented)

### Story 5: View experiment details
**As a** solo entrepreneur, **I want to** view detailed information about an experiment, **so that** I can see all associated content and context.

#### 5.1 Experiment detail view
- System displays full experiment statement
- System shows experiment status, dates, and tags
- System displays links to associated Documentation and Prototype
- System shows experiment directory path

#### 5.2 Access related content
- User can navigate to linked Documentation from experiment view
- User can navigate to linked Prototype from experiment view
- Related content is clearly linked and accessible
- Breadcrumbs or back navigation helps user return to experiment

#### 5.3 View experiment files
- System displays experiment directory structure
- User can see what files exist in experiment directory
- System provides links to open experiment directory in file system
- System shows PRD file location if it exists

### Story 6: View prototype information
**As a** solo entrepreneur, **I want to** see prototype details and access prototype code, **so that** I can continue development work.

#### 6.1 Prototype list view
- System displays all prototypes in a list
- Each prototype shows: title, description, status, linked experiment
- Prototypes are linked to their parent experiments
- List is sortable and filterable like experiments

#### 6.2 Prototype detail view
- System displays prototype title and description
- System shows prototype path/link
- System displays prototype status
- System shows linked experiment information

#### 6.3 Access prototype code
- User can navigate to prototype directory from prototype view
- System provides clear path to prototype location
- Links open prototype directory in file system or IDE

### Story 7: View documentation and PRDs
**As a** solo entrepreneur, **I want to** access documentation and PRDs for experiments, **so that** I can reference requirements and context.

#### 7.1 Documentation list view
- System displays all documentation entries in a list
- Each entry shows: title, linked experiment, last modified date
- Documentation entries are linked to their parent experiments
- List supports search and filtering

#### 7.2 View PRD content
- System displays PRD content in readable format
- PRD markdown is rendered with proper formatting
- System shows PRD file location
- User can open PRD file directly from the interface

#### 7.3 Documentation detail view
- System displays full documentation content
- Markdown content is properly rendered
- System shows documentation metadata (title, dates, tags)
- System displays linked experiment information

### Story 8: Fast application startup
**As a** solo entrepreneur, **I want to** the application to start quickly, **so that** I can access my experiments without delay.

#### 8.1 Application load performance
- Application starts in less than 2 seconds
- Initial page load is optimized for speed
- Data loading is efficient and doesn't block UI
- No external API calls slow down startup

#### 8.2 Efficient data loading
- Metadata files are loaded efficiently
- File system reads are optimized
- Caching is used where appropriate
- Large datasets don't cause performance issues

### Story 9: Use keyboard shortcuts
**As a** solo entrepreneur, **I want to** use keyboard shortcuts, **so that** I can navigate and interact quickly without using the mouse.

#### 9.1 Navigation shortcuts
- Keyboard shortcuts for switching between sections (Experiments, Prototypes, Documentation)
- Shortcut for opening search (Cmd/Ctrl + K)
- Shortcut for clearing filters
- Shortcuts are consistent and discoverable

#### 9.2 Action shortcuts
- Shortcut for creating new experiment (if web UI supports it)
- Shortcut for refreshing data
- Escape key closes modals or clears search
- Shortcuts follow platform conventions (Mac vs Windows/Linux)

### Story 10: Experience dark mode interface
**As a** solo entrepreneur, **I want to** use a dark mode interface, **so that** I can work comfortably in low-light conditions and maintain focus.

#### 10.1 Dark theme implementation
- Application uses dark theme by default
- High contrast ensures readability
- Colors follow developer tool aesthetic (VS Code, GitHub inspired)
- Theme is consistent across all views

#### 10.2 Visual design consistency
- Consistent spacing and typography throughout
- Monospace fonts for code and technical content
- Minimal, clean interface without distractions
- Professional developer tool appearance

## Technical Requirements

### Stack
- **Framework**: Next.js
- **Styling**: Tailwind CSS
- **Architecture**: Reusable components, simple state management, local-first (no external APIs)

### Principles
- Component reusability (no one-off code)
- Simplicity over abstractions
- Fast performance (< 2s startup)
- Cross-platform (macOS, Linux, Windows)

### UI/UX
- Dark theme with high contrast
- Monospace/developer-friendly fonts
- Generous whitespace
- Minimal icon set (SVG preferred)
- Keyboard shortcuts for power users

## Implementation Phases

### Phase 1: MVP
- Left menu (Experiments, Prototypes, Documentation)
- One-to-one-to-one relationship model with cascade delete
- List views for each content type
- Basic search
- Dark mode UI
- File system persistence (JSON metadata)

### Phase 2: Enhanced Features
- Tag system and filtering
- Status management
- Rich text/markdown support
- Export/import functionality
- Keyboard shortcuts

### Phase 3: Polish
- Performance optimization
- Advanced search
- Experiment templates
- Product launch readiness tracking

## Non-Requirements

The following are explicitly **not** in scope:
- Multi-user support or authentication
- Cloud sync or remote storage
- Real-time collaboration
- Complex data visualization
- Integration with external services
- Mobile app version (desktop-first)

## Constraints

- Runs entirely locally (no backend server)
- Works offline
- Data exportable/backup-able
- Lightweight and fast
- Cross-platform (macOS, Linux, Windows)

## Future Considerations

- Product launch readiness indicators
- Experiment-to-product conversion tracking
- Code snippet syntax highlighting
- Experiment relationships/dependencies
- Time tracking per experiment

---

## Design Inspiration

VS Code (dark theme), Linear (clean, minimal, fast), GitHub (developer tool aesthetic)

---

**Document Version**: 1.0  
**Last Updated**: Initial creation  
**Status**: Draft

