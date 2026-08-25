# OPSDesign

An editor for **operational design** pictures. Concurrent workstreams, gates, and an outcome — the picture lays itself out.

You do not place boxes on a freeform canvas.

## Why this picture

Operational design asks: what outcome must hold, what concurrent work produces it, what must be true along the way, and where someone has to decide. That is the same question for a service launch, a transformation, or a campaign.

| On the drawing | Meaning | Also called |
| --- | --- | --- |
| **End state** | Desired outcome — conditions that must hold when the work is done | End state |
| **Workstream end state** | Optional. What will be true for that line of effort; feeds the campaign panel | Nested / supporting end state |
| **Phases** | Stages in the life cycle | Phases |
| **Lines of effort** | Workstreams organised by purpose | Lines of effort |
| **Milestone** | An event or deliverable (“beta released”) | Milestone |
| **Condition** | A state that must hold (“users are ready”) | Decisive condition |
| **Dependency** | This cannot happen until that is true | Arranging operations / cause and effect |
| **Decision point** | A gate: proceed, recycle, or stop | Decision point |

Milestones and conditions can sit on the same line of effort. Dependencies can cross workstreams.

## Live site

https://vvzt5znznh-cmd.github.io/OPSDesign/

The live site is GitHub Pages from the `main` branch (`/` root). After a source change:

```bash
npm run pages
```

That writes `index.html`, `404.html`, and `assets/` at the repo root. Commit those with the source change.

To skip that step: in the GitHub repo, **Settings → Pages → Source → GitHub Actions**. A workflow already builds `dist/` on every push to `main`. After that switch, live is just merging to `main` — no generated files in git.

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

1. First visit: **Start from a sample** (empty, service go-live, or campaign). Coming back restores the last picture from this browser. File → New… is the same prompt.
2. Click anything on the diagram to edit it. Labels are the text on the picture. Click a workstream to set its end state (shown at the right of that line when workstream end states are on). Off/On is in the inspector on the campaign panel or a workstream. The campaign end-state panel takes a name, what will be true (shown under the name), and a colour wash.
3. Hover a workstream in a phase: **+** then Milestone or Condition. Hover the gate bar and click **+** to add a decision. Use the **+** marks to add a phase or workstream.
4. Drag a node along its arrow to move it earlier or later — early, middle, or late in a phase, or into another phase. Drop at the right edge of a phase to widen it. A node that depends on another sits to the right of it, including across workstreams. Drag a gate along the bar to sit in a phase or after it.
5. **Link**: click what must happen first, then what depends on it.
6. **File**: New… (layout), Restore previous, Open / Save JSON, Ask an LLM…, Export PNG, SVG, or PowerPoint (16:9 slide).

The current picture is saved in this browser (`localStorage`). Leave and come back and it is still there. Undo/Redo are for this tab (they survive refresh). File → New or Open JSON keeps the displaced picture as Restore previous. Older files still open; missing fields pick up quiet defaults.

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
