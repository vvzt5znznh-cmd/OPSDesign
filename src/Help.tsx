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
              the heading; description is the conditions that must hold — not a
              date.
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
              one-line job it does.
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
          Hover a workstream in a phase, or click the + in an empty cell, to add
          a milestone or condition. Drag nodes along a workstream. Drag a gate
          along the bar to place it in a phase or after it. Click the bar to add
          a gate. Use the + marks to add a phase, workstream, or gate.{" "}
          <strong>Link</strong>, then click A then B — B sits to the right of A.
          File → Export PowerPoint makes an editable briefing slide that matches
          the picture. Dependency links are PowerPoint connectors glued to the
          figures — copy one, or draw a new Elbow / Straight connector, and snap
          it to a milestone or condition. End-state name and description sit on
          the panel; other inspector detail goes to speaker notes.
        </p>
        <button type="button" className="modal-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
