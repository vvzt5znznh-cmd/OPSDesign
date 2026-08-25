export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal wide"
        role="dialog"
        aria-labelledby="help-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="help-title">How the picture works</h2>
        <p>
          Operational design is a way to see how concurrent work produces a
          desired outcome. Same geometry for a service launch, a transformation,
          or a campaign.
        </p>
        <div className="help-grid">
          <div>
            <h3>End state</h3>
            <p>
              The panel on the right. Every workstream reads into it. Name is
              the heading; what will be true sits under it — not a date. Colour
              is a wash you can change in the inspector. Workstream end states
              (pills at the right of each line) are optional — Off/On in the
              inspector. Turn them off and the lines run into the campaign
              panel; the text is kept.
            </p>
          </div>
          <div>
            <h3>Phases</h3>
            <p>Stages, left to right. Discover, define, build, launch — or yours.</p>
          </div>
          <div>
            <h3>Workstreams</h3>
            <p>
              Concurrent work organised by purpose. Name the stream, then the
              one-line job it does. With workstream end states on, click the
              stream (or the pill at the end of the line) to set its end state.
            </p>
          </div>
          <div>
            <h3>Milestone △</h3>
            <p>An event or deliverable. It happened, or it did not.</p>
          </div>
          <div>
            <h3>Condition ◇</h3>
            <p>A state that must hold. Funding is committed. Users are ready.</p>
          </div>
          <div>
            <h3>Gate ★</h3>
            <p>
              A decision: proceed, recycle, or stop. Sit inside a phase, or on
              the seam after it. Name it as the decision, not "Gate 1".
            </p>
          </div>
        </div>
        <p className="help-how">
          Hover a workstream in a phase and click the +, or click an empty cell,
          to add a milestone or condition — it lands where you click (early,
          middle, or late). On a busy cell the + sits at the right so it does
          not cover the figures. Hover the gate bar and click the + to add a
          decision. Drag nodes along a workstream to sit early, in the middle,
          or late in a phase; drop at the right edge to widen the phase. Drag a
          gate along the bar to place it in a phase or after it. Use the + marks
          to add a phase or workstream. Click a milestone or condition to see its
          links. Title, purpose, and labels wrap — the picture grows instead of
          clipping.{" "}
          <strong>Link</strong>, then click A then B — B sits to the right of A.
          The first time, pick a sample. File → New… is that prompt again. File → Ask an LLM… copies a prompt
          and sample JSON; File → Open JSON loads the file it returns. File →
          Export PowerPoint makes a 16:9 briefing slide. The picture scales to
          fit; type scales with it. Dependency links are curved PowerPoint
          connectors glued to the sides of the figures. Labels are the text on
          the picture. Workstream end states are optional (Off/On in the
          inspector). When on, each workstream can carry an end state at the
          right of its line. Campaign end-state name and the conditions that
          must hold sit on the panel.
        </p>
        <p className="help-how">
          The picture stays in this browser when you leave. Undo/Redo cover this
          tab, including refresh. File → Restore previous brings back what New
          or Open JSON replaced.
        </p>
        <button type="button" className="modal-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
