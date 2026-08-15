# OPSDesign

An editor for **operational design** pictures — usable for a civilian project or programme, not only a military campaign.

The diagram lays itself out from the structure of the work. You do not place boxes on a freeform canvas.

## Why this picture

Operational design asks: what outcome must hold, what concurrent work produces it, what must be true along the way, and where someone has to decide. That is the same question for a service launch, a transformation, or a campaign.

| On the drawing | Civilian reading | Doctrinal cousin |
| --- | --- | --- |
| **End state** | Desired outcome — conditions that must hold when the work is done | End state |
| **Phases** | Stages in the life cycle | Phases |
| **Lines of effort** | Workstreams organised by purpose | Lines of effort |
| **Milestone** | An event or deliverable (“beta released”) | Milestone |
| **Condition** | A state that must hold (“users are ready”) | Decisive condition |
| **Dependency** | This cannot happen until that is true | Arranging operations / cause and effect |
| **Decision point** | A gate: proceed, recycle, or stop | Decision point |

Milestones and conditions can sit on the same line of effort. Dependencies can cross workstreams.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default `http://localhost:5173`).

```bash
npm run build
npm run preview
```

## How to use it

1. Start from **Service go-live** (a civilian project), a blank project, or a defence/security campaign.
2. Click anything on the diagram — or in the left outline — to edit it.
3. Hover a line of effort inside a phase: **△** adds a milestone, **◇** adds a condition.
4. Drag a node along its arrow to move it between phases.
5. **Link dependencies**: click the predecessor, then the node that depends on it. Or add predecessors in the inspector.
6. Export **PNG**, **SVG**, or **JSON**.

The current design is also saved in the browser (`localStorage`). Older files that used a single node type still open; each node becomes a milestone or a condition.

### Keyboard

| Key | Action |
| --- | --- |
| Click | Select |
| Delete / Backspace | Remove selection |
| ⌘Z / Ctrl+Z | Undo |
| Shift+⌘Z / Ctrl+Shift+Z | Redo |
| Escape | Clear selection, or leave link mode |

## Stack

Vite, React, TypeScript. No backend.
