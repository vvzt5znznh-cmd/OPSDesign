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

## Live site

https://vvzt5znznh-cmd.github.io/OPSDesign/

The live site is GitHub Pages from the `main` branch. Pushes to `main` also run a production build in Actions. To refresh the files Pages serves:

```bash
npm run pages
```

That writes `index.html`, `404.html`, and `assets/` at the repo root. Commit those together with the source change.

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
2. Click anything on the diagram to edit it. The end-state panel takes a name, a description, and a colour wash.
3. Hover a workstream in a phase: **+** then Milestone or Condition. Hover the gate bar and click **+** to add a decision. Use the **+** marks to add a phase or workstream.
4. Drag a node along its arrow to move it earlier or later — within a phase or into another. A node that depends on another sits to the right of it, including across workstreams. Drag a gate along the bar to sit in a phase or after it.
5. **Link**: click what must happen first, then what depends on it.
6. **File**: Open / Save JSON, Ask an LLM… (prompt + sample for a language model), Export PNG, SVG, or PowerPoint.

The current design is also saved in the browser (`localStorage`). Older files still open; missing fields pick up quiet defaults.

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
