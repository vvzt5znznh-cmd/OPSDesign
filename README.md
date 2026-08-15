# OPSDesign

An editor for **operational design / CONOPS** pictures: phases across the top, concurrent lines of effort, decision points at the gates, and a single end state.

The diagram lays itself out from the structure of the operation. You do not place boxes on a freeform canvas.

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

1. Pick a template (blank, programme with **milestones**, or campaign with **decisive conditions**).
2. Click anything on the diagram — or in the left outline — to edit it in the inspector.
3. Hover a line of effort inside a phase and click **+** to add a node.
4. Drag a node along its arrow to move it between phases.
5. Toggle **Milestones** / **Decisive conditions** in the toolbar. The nodes stay; only the symbol changes (triangle vs diamond).
6. Export **PNG**, **SVG**, or **JSON**. JSON round-trips, so you can version the design in git.

The current design is also saved in the browser (`localStorage`).

### Keyboard

| Key | Action |
| --- | --- |
| Click | Select |
| Delete / Backspace | Remove selection |
| ⌘Z / Ctrl+Z | Undo |
| Shift+⌘Z / Ctrl+Shift+Z | Redo |
| Escape | Clear selection |

## The picture

| Element | Meaning |
| --- | --- |
| **End state** | Conditions that must hold when the operation is finished |
| **Phases** | Sequential stages, left to right |
| **Lines of effort** | Concurrent workstreams organised by purpose |
| **Milestone** | An event or deliverable |
| **Decisive condition** | A state that is necessary to reach the end state |
| **Decision point** | A choice, usually at a phase boundary |

## Stack

Vite, React, TypeScript. No backend.
