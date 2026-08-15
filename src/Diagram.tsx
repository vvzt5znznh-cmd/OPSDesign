import { useEffect, useMemo, useRef, useState, type RefObject, type PointerEvent } from "react";
import { uid } from "./id";
import { conditionsInCell, nodeKindLabel, nodeKindShort } from "./design";
import { hitPhaseAtX, layoutDiagram, type DiagramLayout } from "./layout";
import { useDesign } from "./state";
import type { OperationalDesign, Selection } from "./types";

function wrapLabel(text: string, maxChars = 15, maxLines = 3): string[] {
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

function isSelected(selection: Selection, type: NonNullable<Selection>["type"], id?: string) {
  if (!selection || selection.type !== type) return false;
  if (type === "endState" || type === "title") return true;
  return "id" in selection && selection.id === id;
}

const DIAGRAM_CSS = `
  .svg-title { font-family: Arial, Helvetica, sans-serif; font-size: 22px; font-weight: 700; fill: #0f1c2e; }
  .svg-phase { font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 600; fill: #1a365d; }
  .svg-loe { font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: 700; }
  .svg-condition, .svg-dp-label, .svg-legend { font-family: Arial, Helvetica, sans-serif; font-size: 10px; font-weight: 600; fill: #243042; }
  .svg-end { font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: 700; fill: #fff; }
`;

export function Diagram({
  svgRef,
}: {
  svgRef: RefObject<SVGSVGElement | null>;
}) {
  const { design, selection, setSelection, dispatch } = useDesign();
  const laidOut = useMemo(() => layoutDiagram(design), [design]);
  const [hoverCell, setHoverCell] = useState<{ loeId: string; phaseId: string } | null>(null);
  const [drag, setDrag] = useState<{
    id: string;
    x: number;
    y: number;
    originX: number;
    active: boolean;
  } | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;
  const skipDeselect = useRef(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
        return;
      }
      if (e.key === "Escape") {
        setSelection(null);
        return;
      }
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      if (!selection) return;
      e.preventDefault();
      if (selection.type === "condition") {
        dispatch({ type: "removeCondition", id: selection.id });
      } else if (selection.type === "dp") {
        dispatch({ type: "removeDp", id: selection.id });
      } else if (selection.type === "phase") {
        dispatch({ type: "removePhase", id: selection.id });
      } else if (selection.type === "loe") {
        dispatch({ type: "removeLoe", id: selection.id });
      }
      setSelection(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, dispatch, setSelection]);

  function dropAt(laid: DiagramLayout, id: string, x: number) {
    const condition = design.conditions.find((c) => c.id === id);
    if (!condition) return;
    const phase = hitPhaseAtX(laid, x);
    if (!phase) return;
    const siblings = conditionsInCell(design, condition.loeId, phase.id).filter(
      (c) => c.id !== id,
    );
    const siblingLayouts = laid.conditions.filter(
      (c) => c.loeId === condition.loeId && c.phaseId === phase.id && c.id !== id,
    );
    let order = siblings.length;
    for (let i = 0; i < siblingLayouts.length; i++) {
      if (x < siblingLayouts[i].x) {
        order = i;
        break;
      }
    }
    const original = conditionsInCell(design, condition.loeId, condition.phaseId);
    const currentIndex = original.findIndex((c) => c.id === id);
    if (phase.id === condition.phaseId && order === currentIndex) return;
    dispatch({ type: "placeCondition", id, phaseId: phase.id, order });
  }

  function onConditionPointerDown(
    e: PointerEvent<SVGGElement>,
    id: string,
    x: number,
    y: number,
  ) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelection({ type: "condition", id });
    setDrag({ id, x, y, originX: x, active: false });
  }

  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
    const current = dragRef.current;
    if (!current || !svgRef.current) return;
    const p = svgPoint(svgRef.current, e.clientX, e.clientY);
    const active = current.active || Math.abs(p.x - current.originX) > 6;
    setDrag({
      id: current.id,
      x: p.x,
      y: current.y,
      originX: current.originX,
      active,
    });
  }

  function onPointerUp(e: PointerEvent<SVGSVGElement>) {
    const current = dragRef.current;
    if (!current || !svgRef.current) return;
    if (current.active) {
      const p = svgPoint(svgRef.current, e.clientX, e.clientY);
      dropAt(laidOut, current.id, p.x);
      skipDeselect.current = true;
    }
    setDrag(null);
  }

  const nodeFill = design.nodeKind === "milestone" ? "#C62828" : "#0F4C81";
  const short = nodeKindShort(design.nodeKind);

  return (
    <svg
      ref={svgRef}
      id="conops-svg"
      width={laidOut.width}
      height={laidOut.height}
      viewBox={`0 0 ${laidOut.width} ${laidOut.height}`}
      role="img"
      aria-label={`${design.title} operational design`}
      className="diagram-svg"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => setHoverCell(null)}
      onClick={() => {
        if (skipDeselect.current) {
          skipDeselect.current = false;
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
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity="0.18" />
        </filter>
      </defs>

      <rect width={laidOut.width} height={laidOut.height} fill="#ffffff" />

      <text
        x={laidOut.width / 2}
        y={40}
        textAnchor="middle"
        className={isSelected(selection, "title") ? "svg-title selected" : "svg-title"}
        onClick={(e) => {
          e.stopPropagation();
          setSelection({ type: "title" });
        }}
      >
        {design.title}
      </text>

      {laidOut.phases.map((phase, i) => (
        <g key={phase.id}>
          <rect
            x={phase.x}
            y={laidOut.plot.y - 42}
            width={phase.width}
            height={laidOut.plot.height + 42}
            fill={i % 2 === 0 ? "#f4f6f8" : "#e9eef3"}
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
        fill="#d9dee5"
      />

      {laidOut.loes.map((loe) => (
        <g key={loe.id}>
          <line
            x1={loe.x1}
            y1={loe.y}
            x2={laidOut.endState.cx - laidOut.endState.rx - 6}
            y2={loe.y}
            stroke={loe.color}
            strokeWidth={14}
            strokeLinecap="round"
            markerEnd={`url(#arrow-${loe.id})`}
          />
          <text
            x={36}
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
            onPointerEnter={() => setHoverCell({ loeId: loe.id, phaseId: phase.id })}
            onClick={(e) => {
              e.stopPropagation();
              setSelection({ type: "loe", id: loe.id });
            }}
          />
        )),
      )}

      {hoverCell && !drag?.active && (
        <g
          data-ui="true"
          className="add-on-canvas"
          transform={`translate(${
            (laidOut.phases.find((p) => p.id === hoverCell.phaseId)?.x ?? 0) +
            (laidOut.phases.find((p) => p.id === hoverCell.phaseId)?.width ?? 0) -
            22
          }, ${
            (laidOut.loes.find((l) => l.id === hoverCell.loeId)?.y ?? 0) - 28
          })`}
          onClick={(e) => {
            e.stopPropagation();
            const id = uid("c");
            dispatch({
              type: "addCondition",
              id,
              loeId: hoverCell.loeId,
              phaseId: hoverCell.phaseId,
            });
            setSelection({ type: "condition", id });
          }}
        >
          <circle r="10" cx="10" cy="10" fill="#0f1c2e" />
          <path d="M10 5 v10 M5 10 h10" stroke="#fff" strokeWidth="1.8" />
        </g>
      )}

      {laidOut.conditions.map((c) => {
        if (drag?.active && drag.id === c.id) return null;
        return (
          <ConditionMark
            key={c.id}
            x={c.x}
            y={c.y}
            label={c.label}
            kind={design.nodeKind}
            fill={nodeFill}
            selected={isSelected(selection, "condition", c.id)}
            onPointerDown={(e) => onConditionPointerDown(e, c.id, c.x, c.y)}
          />
        );
      })}

      {drag?.active && (
        <ConditionMark
          x={drag.x}
          y={drag.y}
          label={design.conditions.find((c) => c.id === drag.id)?.label ?? ""}
          kind={design.nodeKind}
          fill={nodeFill}
          selected
          dragging
          onPointerDown={() => undefined}
        />
      )}

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
        {wrapLabel(laidOut.endState.name, 12, 4).map((line, i, arr) => (
          <text
            key={i}
            x={laidOut.endState.cx}
            y={laidOut.endState.cy + (i - (arr.length - 1) / 2) * 16}
            textAnchor="middle"
            className="svg-end"
          >
            {line}
          </text>
        ))}
      </g>

      <Legend
        x={36}
        y={laidOut.height - 28}
        kind={design.nodeKind}
        nodeFill={nodeFill}
        short={short}
      />
    </svg>
  );
}

function ConditionMark({
  x,
  y,
  label,
  kind,
  fill,
  selected,
  dragging,
  onPointerDown,
}: {
  x: number;
  y: number;
  label: string;
  kind: OperationalDesign["nodeKind"];
  fill: string;
  selected: boolean;
  dragging?: boolean;
  onPointerDown: (e: PointerEvent<SVGGElement>) => void;
}) {
  const lines = wrapLabel(label);
  const stroke = selected ? "#c4a35a" : "#3b0d0d";
  return (
    <g
      transform={`translate(${x}, ${y})`}
      className={dragging ? "condition-mark dragging" : "condition-mark"}
      onPointerDown={onPointerDown}
      onClick={(e) => e.stopPropagation()}
    >
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
          stroke={selected ? "#c4a35a" : "#06243f"}
          strokeWidth={selected ? 2.4 : 1.1}
          filter="url(#soft)"
        />
      )}
      {lines.map((line, i) => (
        <text key={i} y={24 + i * 11} textAnchor="middle" className="svg-condition">
          {line}
        </text>
      ))}
    </g>
  );
}

function Legend({
  x,
  y,
  kind,
  nodeFill,
  short,
}: {
  x: number;
  y: number;
  kind: OperationalDesign["nodeKind"];
  nodeFill: string;
  short: string;
}) {
  return (
    <g transform={`translate(${x}, ${y})`} className="legend">
      {kind === "milestone" ? (
        <path d="M0,-8 L7,6 L-7,6 Z" fill={nodeFill} />
      ) : (
        <path d="M0,-8 L8,0 L0,8 L-8,0 Z" fill={nodeFill} />
      )}
      <text x="14" y="4" className="svg-legend">
        {nodeKindLabel(kind)} ({short})
      </text>
      <path
        transform="translate(210, 0)"
        d={starPath(8)}
        fill="#2E7D32"
        stroke="#1b5e20"
        strokeWidth="0.8"
      />
      <text x="224" y="4" className="svg-legend">
        Decision Point (DP)
      </text>
    </g>
  );
}
