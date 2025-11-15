# Prototype Port Assignments

This document tracks port assignments for running experiment prototypes. The Experiment Hub runs on port 3000, and each prototype gets its own port.

## Port Mapping

| Port | Experiment | Prototype Directory |
|------|-----------|---------------------|
| 3000 | Experiment Hub | (main hub) |
| 3001 | Embroidery Pattern Manager | `experiments/etsy-embroidery-pattern-manager/prototype` |
| 3002 | Seed Finder | `experiments/seed-finder/prototype` |
| 3003 | The Illuminator | `experiments/the-illuminator/prototype` |
| 3004 | Photo Memories | `experiments/photo-memories/prototype` |
| 3005 | Garden Guide Generator | `experiments/garden-guide-generator/prototype` |
| 3006 | Experience Principles Repository | `experiments/experience-principles-repository/prototype` |
| 3007 | Best Day Ever | `experiments/best-day-ever/prototype` |

## Running Prototypes

Each prototype should have its port configured in `package.json`:

```json
{
  "scripts": {
    "dev": "next dev -p 3001",
    "start": "next start -p 3001"
  }
}
```

## Accessing Prototypes

Prototypes are accessible at:
- **Embroidery Pattern Manager**: [http://localhost:3001](http://localhost:3001)
- **Seed Finder**: [http://localhost:3002](http://localhost:3002)
- (etc.)

Links are automatically displayed in the Experiment Hub interface when a prototype has a `port` field in `data/prototypes.json`.

## Adding a New Prototype

1. Assign the next available port number
2. Update the prototype's `package.json` scripts to use the port
3. Add the `port` field to the prototype entry in `data/prototypes.json`
4. Update this document with the new mapping

