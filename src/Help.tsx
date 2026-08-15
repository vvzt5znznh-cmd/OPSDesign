export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-labelledby="help-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="help-title">How to read and edit a CONOPS</h2>
        <dl className="help-dl">
          <dt>End state</dt>
          <dd>
            The conditions that must exist when the operation is finished. Every
            line of effort points here.
          </dd>
          <dt>Phases</dt>
          <dd>
            Sequential stages across the top. Time and campaign logic run left to
            right.
          </dd>
          <dt>Lines of effort (LoE)</dt>
          <dd>
            Concurrent workstreams organised by purpose, not geography. Each is a
            coloured arrow.
          </dd>
          <dt>Milestones vs decisive conditions</dt>
          <dd>
            A milestone is an event or deliverable. A decisive condition is a
            state that must hold to reach the end state. Toggle the symbol in the
            toolbar; the underlying nodes are the same.
          </dd>
          <dt>Decision points (DP)</dt>
          <dd>
            Places where a commander or sponsor must choose, usually at a phase
            boundary. They sit on the grey bar above the lines of effort.
          </dd>
        </dl>
        <p>
          Click anything on the diagram to edit it in the inspector. Hover a line
          of effort inside a phase and press + to add a node. Drag a node along
          its arrow to move it between phases.
        </p>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
