import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from "react";
import { uid } from "./id";
import { columnAtX, hitPhaseAtX, layoutDiagram, minColumnInPhase, type DiagramLayout } from "./layout";
import { useDesign } from "./state";
import {
  CONDITION_FILL,
  MILESTONE_FILL,
  type NodeKind,
  type Selection,
} from "./types";

function wrapLabel(text: string, maxChars = 16, maxLines = 3): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = word;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    const last = kept[maxLines - 1];
    kept[maxLines - 1] =
      last.length >= maxChars ? `${last.slice(0, maxChars - 1)}…` : `${last}…`;
    return kept;
  }
  return lines.length ? lines : [""];
}

function starPath(r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const b = a + Math.PI / 5;
    pts.push(`${Math.cos(a) * r},${Math.sin(a) * r}`);
    pts.push(`${Math.cos(b) * r * 0.4},${Math.sin(b) * r * 0.4}`);
  }
  return `M${pts.join(" L ")} Z`;
}

function svgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: clientX, y: clientY };
  return pt.matrixTransform(ctm.inverse());
}

function isSelected(
  selection: Selection,
  type: NonNullable<Selection>["type"],
  id?: string,
) {
  if (!selection || selection.type !== type) return false;
  if (type === "endState" || type === "title") return true;
  return "id" in selection && selection.id === id;
}

const DIAGRAM_CSS = `
  .svg-title { font-family: Arial, Helvetica, sans-serif; font-size: 22px; font-weight: 700; fill: #1a1f2b; }
  .svg-purpose { font-family: Arial, Helvetica, sans-serif; font-size: 11px; fill: #6b7380; }
  .svg-phase { font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 600; fill: #2c3544; }
  .svg-loe { font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: 700; }
  .svg-condition, .svg-dp-label, .svg-legend { font-family: Arial, Helvetica, sans-serif; font-size: 10px; font-weight: 600; fill: #2c3544; }
  .svg-end { font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: 700; fill: #fff; }
  .svg-end-kicker { font-family: Arial, Helvetica, sans-serif; font-size: 8px; font-weight: 600; fill: rgba(255,255,255,0.7); letter-spacing: 0.12em; }
  .dep-line { fill: none; stroke: #7a8494; stroke-width: 1.4; stroke-dasharray: 5 4; }
  .add-pill-text { font-family: Arial, Helvetica, sans-serif; font-size: 10px; font-weight: 600; fill: #fff; }
`;

export function Diagram({
  svgRef,
}: {
  svgRef: RefObject<SVGSVGElement | null>;
}) {
  const {
    design,
    selection,
    setSelection,
    dispatch,
    linkMode,
    setLinkMode,
    linkFrom,
    setLinkFrom,
    showDependencies,
  } = useDesign();
  const laidOut = useMemo(() => layoutDiagram(design), [design]);
  const [hoverCell, setHoverCell] = useState<{
    loeId: string;
    phaseId: string;
  } | null>(null);
  const [drag, setDrag] = useState<{
    id: string;
    x: number;
    y: number;
    originX: number;
    active: boolean;
    pointerId: number;
  } | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;
  const skipDeselect = useRef(false);
  const [renameId, setRenameId] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)
      ) {
        return;
      }
      if (e.key === "Escape") {
        if (renameId) {
          setRenameId(null);
          return;
        }
        if (linkMode) {
          setLinkMode(false);
          return;
        }
        setSelection(null);
        return;
      }
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      if (!selection) return;
      e.preventDefault();
      if (selection.type === "node") {
        dispatch({ type: "removeNode", id: selection.id });
      } else if (selection.type === "dp") {
        dispatch({ type: "removeDp", id: selection.id });
      } else if (selection.type === "phase") {
        dispatch({ type: "removePhase", id: selection.id });
      } else if (selection.type === "loe") {
        dispatch({ type: "removeLoe", id: selection.id });
      } else if (selection.type === "dependency") {
        dispatch({ type: "removeDependency", id: selection.id });
      }
      setSelection(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, dispatch, setSelection, linkMode, setLinkMode, renameId]);

  function dropAt(laid: DiagramLayout, id: string, x: number) {
    const node = design.nodes.find((n) => n.id === id);
    if (!node) return;
    const phase = hitPhaseAtX(laid, x);
    if (!phase) return;
    const columns = new Map(laid.nodes.map((n) => [n.id, n.column]));
    const order = Math.max(
      columnAtX(phase, x),
      minColumnInPhase(design, columns, id, phase.id),
    );
    if (phase.id === node.phaseId && order === node.order) return;
    dispatch({ type: "placeNode", id, phaseId: phase.id, order });
  }

  function onNodePointerDown(
    e: PointerEvent<SVGGElement>,
    id: string,
    x: number,
    y: number,
  ) {
    e.stopPropagation();
    if (linkMode) {
      if (!linkFrom) {
        setLinkFrom(id);
        setSelection({ type: "node", id });
        return;
      }
      if (linkFrom !== id) {
        dispatch({
          type: "addDependency",
          id: uid("dep"),
          fromId: linkFrom,
          toId: id,
        });
        setLinkFrom(id);
        setSelection({ type: "node", id });
      }
      return;
    }
    const pointer = svgRef.current
      ? svgPoint(svgRef.current, e.clientX, e.clientY)
      : { x, y };
    setSelection({ type: "node", id });
    setDrag({
      id,
      x,
      y,
      originX: pointer.x,
      active: false,
      pointerId: e.pointerId,
    });
  }

  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
    const current = dragRef.current;
    if (!current || !svgRef.current) return;
    const p = svgPoint(svgRef.current, e.clientX, e.clientY);
    const active =
      current.active || Math.abs(p.x - current.originX) > 8;
    if (!active) return;
    if (!current.active) {
      svgRef.current.setPointerCapture(e.pointerId);
    }
    setDrag({
      id: current.id,
      x: p.x,
      y: current.y,
      originX: current.originX,
      active: true,
      pointerId: current.pointerId,
    });
  }

  function onPointerUp(e: PointerEvent<SVGSVGElement>) {
    const current = dragRef.current;
    if (!current || !svgRef.current) return;
    if (svgRef.current.hasPointerCapture(e.pointerId)) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
    if (current.active) {
      const p = svgPoint(svgRef.current, e.clientX, e.clientY);
      dropAt(laidOut, current.id, p.x);
      skipDeselect.current = true;
    }
    setDrag(null);
  }

  function addAtHover(kind: NodeKind) {
    if (!hoverCell) return;
    const id = uid("n");
    dispatch({
      type: "addNode",
      id,
      kind,
      loeId: hoverCell.loeId,
      phaseId: hoverCell.phaseId,
    });
    setSelection({ type: "node", id });
  }

  const draggingNode = drag
    ? design.nodes.find((n) => n.id === drag.id)
    : undefined;

  return (
    <svg
      ref={svgRef}
      id="conops-svg"
      width={laidOut.width}
      height={laidOut.height}
      viewBox={`0 0 ${laidOut.width} ${laidOut.height}`}
      role="img"
      aria-label={`${design.title} operational design`}
      className={linkMode ? "diagram-svg link-mode" : "diagram-svg"}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => setHoverCell(null)}
      onClick={() => {
        if (skipDeselect.current) {
          skipDeselect.current = false;
          return;
        }
        if (linkMode) {
          setLinkFrom(null);
          return;
        }
        setSelection(null);
      }}
    >
      <defs>
        <style>{DIAGRAM_CSS}</style>
        {design.linesOfEffort.map((loe) => (
          <marker
            key={loe.id}
            id={`arrow-${loe.id}`}
            markerWidth="14"
            markerHeight="10"
            refX="12"
            refY="5"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M0,0 L14,5 L0,10 Z" fill={loe.color} />
          </marker>
        ))}
        <marker
          id="dep-arrow"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0,0 L8,4 L0,8 Z" fill="#4a5568" />
        </marker>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity="0.18" />
        </filter>
      </defs>

      <rect width={laidOut.width} height={laidOut.height} fill="#ffffff" />

      <text
        x={laidOut.width / 2}
        y={design.purpose.trim() ? 34 : 40}
        textAnchor="middle"
        className={isSelected(selection, "title") ? "svg-title selected" : "svg-title"}
        onClick={(e) => {
          e.stopPropagation();
          setSelection({ type: "title" });
        }}
      >
        {design.title}
      </text>
      {design.purpose.trim() && (
        <text
          x={laidOut.width / 2}
          y={54}
          textAnchor="middle"
          className="svg-purpose"
          onClick={(e) => {
            e.stopPropagation();
            setSelection({ type: "title" });
          }}
        >
          {design.purpose.trim()
            ? design.purpose.length > 120
              ? `${design.purpose.slice(0, 117)}…`
              : design.purpose
            : ""}
        </text>
      )}

      {laidOut.phases.map((phase, i) => (
        <g key={phase.id}>
          <rect
            x={phase.x}
            y={laidOut.plot.y - 42}
            width={phase.width}
            height={laidOut.plot.height + 42}
            fill={i % 2 === 0 ? "#f6f3ee" : "#efeae3"}
          />
          <text
            x={phase.x + phase.width / 2}
            y={laidOut.plot.y - 16}
            textAnchor="middle"
            className={
              isSelected(selection, "phase", phase.id)
                ? "svg-phase selected"
                : "svg-phase"
            }
            onClick={(e) => {
              e.stopPropagation();
              setSelection({ type: "phase", id: phase.id });
            }}
          >
            {phase.name}
          </text>
        </g>
      ))}

      <rect
        x={laidOut.dpBar.x}
        y={laidOut.dpBar.y}
        width={laidOut.dpBar.width}
        height={laidOut.dpBar.height}
        fill="#e6e1d8"
      />

      {laidOut.loes.map((loe) => (
        <g key={loe.id}>
          <line
            x1={loe.x1}
            y1={loe.y}
            x2={laidOut.endState.cx - laidOut.endState.rx - 6}
            y2={loe.y}
            stroke={loe.color}
            strokeWidth={12}
            strokeLinecap="round"
            markerEnd={`url(#arrow-${loe.id})`}
          />
          <text
            x={28}
            y={loe.y + 1}
            dominantBaseline="middle"
            className={
              isSelected(selection, "loe", loe.id) ? "svg-loe selected" : "svg-loe"
            }
            fill={loe.color}
            onClick={(e) => {
              e.stopPropagation();
              setSelection({ type: "loe", id: loe.id });
            }}
          >
            {loe.name}
          </text>
        </g>
      ))}

      {showDependencies &&
        laidOut.dependencies.map((dep) => (
          <g key={dep.id}>
            <path
              d={dep.d}
              className="dep-line"
              markerEnd="url(#dep-arrow)"
              stroke={
                isSelected(selection, "dependency", dep.id) ? "#c4a35a" : "#7a8494"
              }
              strokeWidth={isSelected(selection, "dependency", dep.id) ? 2.2 : 1.4}
            />
            <path
              d={dep.d}
              data-ui="true"
              fill="none"
              stroke="transparent"
              strokeWidth="12"
              className="dep-hit"
              onClick={(e) => {
                e.stopPropagation();
                setSelection({ type: "dependency", id: dep.id });
              }}
            />
          </g>
        ))}

      {laidOut.phases.map((phase) =>
        laidOut.loes.map((loe) => (
          <rect
            key={`${loe.id}-${phase.id}`}
            data-ui="true"
            x={phase.x}
            y={loe.y - 36}
            width={phase.width}
            height={72}
            fill="transparent"
            className="cell-hit"
            onPointerEnter={() =>
              setHoverCell({ loeId: loe.id, phaseId: phase.id })
            }
            onClick={(e) => {
              e.stopPropagation();
              setSelection({ type: "loe", id: loe.id });
            }}
          />
        )),
      )}

      {hoverCell && !drag?.active && !linkMode && (
        <AddPills
          x={
            (laidOut.phases.find((p) => p.id === hoverCell.phaseId)?.x ?? 0) +
            (laidOut.phases.find((p) => p.id === hoverCell.phaseId)?.width ?? 0) -
            104
          }
          y={(laidOut.loes.find((l) => l.id === hoverCell.loeId)?.y ?? 0) - 26}
          onMilestone={() => addAtHover("milestone")}
          onCondition={() => addAtHover("condition")}
        />
      )}

      {laidOut.nodes.map((n) => {
        if (drag?.active && drag.id === n.id) return null;
        return (
          <NodeMark
            key={n.id}
            x={n.x}
            y={n.y}
            label={n.label}
            kind={n.kind}
            selected={
              isSelected(selection, "node", n.id) || linkFrom === n.id
            }
            linking={linkFrom === n.id}
            onPointerDown={(e) => onNodePointerDown(e, n.id, n.x, n.y)}
            onDoubleClick={() => {
              setDrag(null);
              setRenameId(n.id);
            }}
          />
        );
      })}

      {drag?.active && draggingNode && (
        <NodeMark
          x={drag.x}
          y={drag.y}
          label={draggingNode.label}
          kind={draggingNode.kind}
          selected
          dragging
          onPointerDown={() => undefined}
        />
      )}

      {renameId &&
        laidOut.nodes
          .filter((n) => n.id === renameId)
          .map((n) => (
            <foreignObject
              key={`rename-${n.id}`}
              data-ui="true"
              x={n.x - 70}
              y={n.y + 14}
              width="140"
              height="28"
            >
              <input
                className="rename-input"
                autoFocus
                defaultValue={design.nodes.find((x) => x.id === n.id)?.label ?? ""}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value) {
                    dispatch({ type: "updateNode", id: n.id, label: value });
                  }
                  setRenameId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setRenameId(null);
                }}
              />
            </foreignObject>
          ))}

      {laidOut.dps.map((dp) => (
        <g
          key={dp.id}
          transform={`translate(${dp.x}, ${dp.y})`}
          className="dp-mark"
          onClick={(e) => {
            e.stopPropagation();
            setSelection({ type: "dp", id: dp.id });
          }}
        >
          <path
            d={starPath(13)}
            fill="#2E7D32"
            stroke={isSelected(selection, "dp", dp.id) ? "#c4a35a" : "#1b5e20"}
            strokeWidth={isSelected(selection, "dp", dp.id) ? 2.5 : 1}
            filter="url(#soft)"
          />
          <text y={28} textAnchor="middle" className="svg-dp-label">
            {dp.label}
          </text>
        </g>
      ))}

      <g
        className="end-state"
        onClick={(e) => {
          e.stopPropagation();
          setSelection({ type: "endState" });
        }}
      >
        <ellipse
          cx={laidOut.endState.cx}
          cy={laidOut.endState.cy}
          rx={laidOut.endState.rx}
          ry={laidOut.endState.ry}
          fill="#1A365D"
          stroke={isSelected(selection, "endState") ? "#c4a35a" : "#0f2744"}
          strokeWidth={isSelected(selection, "endState") ? 3 : 1.5}
          filter="url(#soft)"
        />
        {wrapLabel(laidOut.endState.name, 12, 3).map((line, i, arr) => (
          <text
            key={i}
            x={laidOut.endState.cx}
            y={laidOut.endState.cy + 6 + (i - (arr.length - 1) / 2) * 15}
            textAnchor="middle"
            className="svg-end"
          >
            {line}
          </text>
        ))}
        {!/end state/i.test(laidOut.endState.name) && (
          <text
            x={laidOut.endState.cx}
            y={laidOut.endState.cy - laidOut.endState.ry + 18}
            textAnchor="middle"
            className="svg-end-kicker"
          >
            END STATE
          </text>
        )}
      </g>

      <Legend x={36} y={laidOut.height - 36} />
    </svg>
  );
}

function AddPills({
  x,
  y,
  onMilestone,
  onCondition,
}: {
  x: number;
  y: number;
  onMilestone: () => void;
  onCondition: () => void;
}) {
  return (
    <g data-ui="true" className="add-on-canvas" transform={`translate(${x}, ${y})`}>
      <g
        onClick={(e) => {
          e.stopPropagation();
          onMilestone();
        }}
      >
        <rect width="92" height="22" rx="11" fill="#1a1f2b" />
        <path d="M12,6 L17,17 L7,17 Z" fill={MILESTONE_FILL} />
        <text x="24" y="15" className="add-pill-text">
          Milestone
        </text>
      </g>
      <g
        transform="translate(0,26)"
        onClick={(e) => {
          e.stopPropagation();
          onCondition();
        }}
      >
        <rect width="92" height="22" rx="11" fill="#1a1f2b" />
        <path d="M12,5 L19,11 L12,17 L5,11 Z" fill={CONDITION_FILL} />
        <text x="26" y="15" className="add-pill-text">
          Condition
        </text>
      </g>
    </g>
  );
}

function NodeMark({
  x,
  y,
  label,
  kind,
  selected,
  dragging,
  linking,
  onPointerDown,
  onDoubleClick,
}: {
  x: number;
  y: number;
  label: string;
  kind: NodeKind;
  selected: boolean;
  dragging?: boolean;
  linking?: boolean;
  onPointerDown: (e: PointerEvent<SVGGElement>) => void;
  onDoubleClick?: () => void;
}) {
  const lines = wrapLabel(label);
  const fill = kind === "milestone" ? MILESTONE_FILL : CONDITION_FILL;
  const stroke = selected ? "#c4a35a" : kind === "milestone" ? "#3b0d0d" : "#06243f";
  const maxLen = Math.max(...lines.map((l) => l.length), 4);
  const boxW = Math.min(140, Math.max(48, maxLen * 6.2 + 10));
  return (
    <g
      transform={`translate(${x}, ${y})`}
      className={dragging ? "condition-mark dragging" : "condition-mark"}
      onPointerDown={onPointerDown}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick?.();
      }}
    >
      {linking && <circle r="18" fill="none" stroke="#c4a35a" strokeWidth="1.5" />}
      {kind === "milestone" ? (
        <path
          d="M0,-13 L11,9 L-11,9 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth={selected ? 2.4 : 1.1}
          filter="url(#soft)"
        />
      ) : (
        <path
          d="M0,-13 L13,0 L0,13 L-13,0 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth={selected ? 2.4 : 1.1}
          filter="url(#soft)"
        />
      )}
      <rect
        x={-boxW / 2}
        y={14}
        width={boxW}
        height={lines.length * 12 + 6}
        rx="3"
        fill="rgba(255,255,255,0.92)"
      />
      {lines.map((line, i) => (
        <text key={i} y={26 + i * 12} textAnchor="middle" className="svg-condition">
          {line}
        </text>
      ))}
    </g>
  );
}

function Legend({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`} className="legend">
      <path d="M0,-8 L7,6 L-7,6 Z" fill={MILESTONE_FILL} />
      <text x="12" y="4" className="svg-legend">
        Milestone
      </text>
      <path transform="translate(92,0)" d="M0,-8 L8,0 L0,8 L-8,0 Z" fill={CONDITION_FILL} />
      <text x="106" y="4" className="svg-legend">
        Condition
      </text>
      <path
        transform="translate(188, 0)"
        d={starPath(8)}
        fill="#2E7D32"
        stroke="#1b5e20"
        strokeWidth="0.8"
      />
      <text x="202" y="4" className="svg-legend">
        Gate / DP
      </text>
      <line
        x1="278"
        y1="0"
        x2="318"
        y2="0"
        stroke="#4a5568"
        strokeWidth="1.6"
        strokeDasharray="5 4"
      />
      <text x="324" y="4" className="svg-legend">
        Dependency
      </text>
    </g>
  );
}
