export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal wide"
        role="dialog"
        aria-labelledby="help-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="help-title">How to read an operational design</h2>
        <p>
          Operational design is a way to see how concurrent work produces a
          desired outcome. It comes from campaign planning, but the same picture
          works for a product launch, a public service, a transformation, or a
          construction programme.
        </p>
        <dl className="help-dl">
          <dt>End state (desired outcome)</dt>
          <dd>
            The conditions that must hold when the work is finished — not a date
            and not a deliverable list. Every line of effort points here.
          </dd>
          <dt>Phases (stages)</dt>
          <dd>
            Sequential chapters of the work, left to right. In civilian delivery
            these are often Discover, Define, Build, Launch — or whatever stages
            your life cycle uses.
          </dd>
          <dt>Lines of effort (workstreams)</dt>
          <dd>
            Concurrent streams organised by purpose, not by org chart. Product,
            assurance, and adoption can run together toward the same end state.
          </dd>
          <dt>Milestone</dt>
          <dd>
            An event or deliverable: “beta released”, “contract signed”. It
            happened, or it did not. Drawn as a red triangle.
          </dd>
          <dt>Condition</dt>
          <dd>
            A state that must hold: “funding is committed”, “users are ready”.
            In doctrine this is a decisive condition. Drawn as a blue diamond.
          </dd>
          <dt>Dependency</dt>
          <dd>
            Cause and effect across the picture. “Go-live depends on users being
            ready.” Dashed arrows. Use <strong>Link dependencies</strong>, or
            add them from the inspector.
          </dd>
          <dt>Decision point (gate)</dt>
          <dd>
            A choice, usually at a phase boundary: proceed, recycle, or stop. In
            government delivery these are stage gates. Drawn as a green star.
          </dd>
        </dl>
        <p>
          Hover a workstream inside a phase and add a milestone or a condition.
          Drag a node along its arrow to move it. Click a dashed link to select
          and delete it.
        </p>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
