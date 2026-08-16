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
            <p>What must be true when you are done — not a date.</p>
          </div>
          <div>
            <h3>Phases</h3>
            <p>Stages, left to right. Discover, define, build, launch — or yours.</p>
          </div>
          <div>
            <h3>Workstreams</h3>
            <p>Lines of effort: concurrent work organised by purpose.</p>
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
            <p>A decision between stages: proceed, recycle, or stop.</p>
          </div>
        </div>
        <p className="help-how">
          Hover a workstream in a phase to add. Drag along the line to move a
          node earlier or later, including inside a phase. A node that depends
          on another is drawn to the right of it — even on a different
          workstream. Press <strong>Link</strong>, then click A then B to draw
          a dependency.
        </p>
        <button type="button" className="modal-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
