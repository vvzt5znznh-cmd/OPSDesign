import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from "react";
import { uid } from "./id";
import { columnAtX, hitPhaseAtX, layoutDiagram, minColumnInPhase, snapGateAtX, END_STATE_TEXT, HEADING, LAYOUT, type DiagramLayout } from "./layout";
import { useDesign } from "./state";
import { useTheme, type DiagramPalette } from "./theme";
import {
  CONDITION_FILL,
  MILESTONE_FILL,
  type NodeKind,
  type Selection,
} from "./types";
import { wrapLabel, nodeLabelSize } from "./wrap";

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

function diagramCss(p: DiagramPalette): string {
  return `
  .svg-title { font-family: Arial, Helvetica, sans-serif; font-size: 22px; font-weight: 700; fill: ${p.title}; }
  .svg-purpose { font-family: Arial, Helvetica, sans-serif; font-size: 11px; fill: ${p.purpose}; }
  .svg-phase { font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 600; fill: ${p.phase}; }
  .svg-loe { font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: 700; }
  .svg-loe-purpose { font-family: Arial, Helvetica, sans-serif; font-size: 9px; font-weight: 500; fill: ${p.purpose}; }
  .svg-end-col { font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: 700; fill: ${p.purpose}; letter-spacing: 0.12em; }
  .svg-condition, .svg-dp-label, .svg-legend { font-family: Arial, Helvetica, sans-serif; font-size: 10px; font-weight: 600; fill: ${p.label}; }
  .svg-end { font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: 700; }
  .svg-end-desc { font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: 400; }
  .dep-line { fill: none; stroke: ${p.dep}; stroke-width: 1.4; stroke-dasharray: 5 4; }
  .add-pill-text { font-family: Arial, Helvetica, sans-serif; font-size: 10px; font-weight: 600; fill: #fff; }
  .canvas-plus { cursor: pointer; }
  .canvas-plus:hover circle { fill: ${p.plusHover}; }
`;
}

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
    present,
  } = useDesign();
  const { diagram: palette } = useTheme();
  const laidOut = useMemo(() => layoutDiagram(design), [design]);
  const endText = useMemo(() => {
    const end = laidOut.endState;
    const T = END_STATE_TEXT;
    const nameH = end.nameLines.length * T.nameLh;
    const descH = end.descriptionLines.length * T.descLh;
    const gap =
      end.nameLines.length && end.descriptionLines.length ? T.gap : 0;
    const top = end.y + (end.height - (nameH + gap + descH)) / 2;
    return { top, nameH, gap };
  }, [laidOut.endState]);
  const [hoverCell, setHoverCell] = useState<{
    loeId: string;
    phaseId: string;
  } | null>(null);
  const [hoverGate, setHoverGate] = useState<{
    x: number;
    phaseId: string;
    placement: "in" | "after";
    order: number;
  } | null>(null);
  const [addMenu, setAddMenu] = useState<{
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
  const [dpDrag, setDpDrag] = useState<{
    id: string;
    x: number;
    y: number;
    originX: number;
    active: boolean;
    pointerId: number;
  } | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;
  const dpDragRef = useRef(dpDrag);
  dpDragRef.current = dpDrag;
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
        if (addMenu) {
          setAddMenu(null);
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
  }, [selection, dispatch, setSelection, linkMode, setLinkMode, renameId, addMenu]);

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
    skipDeselect.current = true;
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
    skipDeselect.current = true;
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
    if (!svgRef.current) return;
    const p = svgPoint(svgRef.current, e.clientX, e.clientY);
    const gate = dpDragRef.current;
    if (gate) {
      const active = gate.active || Math.abs(p.x - gate.originX) > 8;
      if (active) {
        if (!gate.active) svgRef.current.setPointerCapture(e.pointerId);
        setDpDrag({
          ...gate,
          x: p.x,
          active: true,
        });
      }
      return;
    }
    const current = dragRef.current;
    if (!current) return;
    const active = current.active || Math.abs(p.x - current.originX) > 8;
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
    const gate = dpDragRef.current;
    if (gate && svgRef.current) {
      if (svgRef.current.hasPointerCapture(e.pointerId)) {
        svgRef.current.releasePointerCapture(e.pointerId);
      }
      if (gate.active) {
        const p = svgPoint(svgRef.current, e.clientX, e.clientY);
        const snap = snapGateAtX(laidOut.phases, p.x);
        if (snap) {
          dispatch({
            type: "updateDp",
            id: gate.id,
            afterPhaseId: snap.phaseId,
            placement: snap.placement,
            order: snap.order,
          });
        }
      }
      skipDeselect.current = true;
      setDpDrag(null);
      return;
    }
    const current = dragRef.current;
    if (!current || !svgRef.current) return;
    if (svgRef.current.hasPointerCapture(e.pointerId)) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
    if (current.active) {
      const p = svgPoint(svgRef.current, e.clientX, e.clientY);
      dropAt(laidOut, current.id, p.x);
    }
    skipDeselect.current = true;
    setDrag(null);
  }

  function addInCell(
    kind: NodeKind,
    cell: { loeId: string; phaseId: string } | null,
  ) {
    if (!cell) return;
    const id = uid("n");
    dispatch({
      type: "addNode",
      id,
      kind,
      loeId: cell.loeId,
      phaseId: cell.phaseId,
    });
    setSelection({ type: "node", id });
    setAddMenu(null);
    setHoverCell(null);
  }

  const draggingNode = drag
    ? design.nodes.find((n) => n.id === drag.id)
    : undefined;

  function cellOccupied(loeId: string, phaseId: string) {
    return design.nodes.some((n) => n.loeId === loeId && n.phaseId === phaseId);
  }

  function openAddMenu(loeId: string, phaseId: string) {
    skipDeselect.current = true;
    setAddMenu({ loeId, phaseId });
    setHoverCell({ loeId, phaseId });
  }

  function depOpacity(dep: { id: string; fromId: string; toId: string }) {
    const focused =
      selection?.type === "node" || selection?.type === "dependency";
    const active =
      (selection?.type === "dependency" && selection.id === dep.id) ||
      (selection?.type === "node" &&
        (dep.fromId === selection.id || dep.toId === selection.id));
    if (active) return 1;
    if (focused) return 0.1;
    return 0.3;
  }

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
        setAddMenu(null);
        if (linkMode) {
          setLinkFrom(null);
          return;
        }
        setSelection(null);
      }}
    >
      <defs>
        <style>{diagramCss(palette)}</style>
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
          <path d="M0,0 L8,4 L0,8 Z" fill={palette.dep} />
        </marker>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity="0.18" />
        </filter>
      </defs>

      <rect width={laidOut.width} height={laidOut.height} fill={palette.bg} />

      <g
        onClick={(e) => {
          e.stopPropagation();
          setSelection({ type: "title" });
        }}
      >
        {laidOut.titleLines.map((line, i) => (
          <text
            key={`title-${i}`}
            x={laidOut.width / 2}
            y={LAYOUT.padY + HEADING.top + i * HEADING.titleLh + 18}
            textAnchor="middle"
            className={
              isSelected(selection, "title") ? "svg-title selected" : "svg-title"
            }
          >
            {line}
          </text>
        ))}
        {laidOut.purposeLines.map((line, i) => (
          <text
            key={`purpose-${i}`}
            x={laidOut.width / 2}
            y={
              LAYOUT.padY +
              HEADING.top +
              laidOut.titleLines.length * HEADING.titleLh +
              HEADING.gap +
              i * HEADING.purposeLh +
              11
            }
            textAnchor="middle"
            className="svg-purpose"
          >
            {line}
          </text>
        ))}
      </g>

      {laidOut.phases.map((phase, i) => (
        <g key={phase.id}>
          <rect
            x={phase.x}
            y={laidOut.plot.y - 42}
            width={phase.width}
            height={laidOut.plot.height + 42}
            fill={i % 2 === 0 ? palette.phaseA : palette.phaseB}
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

      <g
        className="end-col"
        onClick={(e) => {
          e.stopPropagation();
          setSelection({ type: "endState" });
        }}
      >
        <rect
          x={laidOut.endCol.x}
          y={laidOut.endCol.y}
          width={laidOut.endCol.width}
          height={laidOut.endCol.height}
          fill={palette.phaseA}
        />
        <text
          x={laidOut.endCol.x + laidOut.endCol.width / 2}
          y={laidOut.plot.y - 16}
          textAnchor="middle"
          className="svg-end-col"
        >
          END STATE
        </text>
      </g>

      <g
        className="gate-rail"
        onPointerLeave={() => setHoverGate(null)}
      >
        <rect
          x={laidOut.dpBar.x}
          y={laidOut.dpBar.y}
          width={laidOut.dpBar.width}
          height={laidOut.dpBar.height}
          fill={palette.dpBar}
          onPointerMove={(e) => {
            if (present || linkMode || dpDrag || !svgRef.current) return;
            const p = svgPoint(svgRef.current, e.clientX, e.clientY);
            const snap = snapGateAtX(laidOut.phases, p.x);
            if (!snap) {
              setHoverGate(null);
              return;
            }
            const taken = laidOut.dps.some((dp) => Math.abs(dp.x - snap.x) < 22);
            setHoverGate(taken ? null : snap);
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        />
        {!present && !linkMode && !dpDrag?.active && hoverGate && (
          <CellPlus
            x={hoverGate.x}
            y={laidOut.dpBar.y + laidOut.dpBar.height / 2}
            title="Add gate"
            onClick={() => {
              const id = uid("dp");
              dispatch({
                type: "addDp",
                id,
                afterPhaseId: hoverGate.phaseId,
                placement: hoverGate.placement,
                order: hoverGate.order,
              });
              setSelection({ type: "dp", id });
              setHoverGate(null);
              skipDeselect.current = true;
            }}
          />
        )}
      </g>

      {laidOut.loes.map((loe) => (
        <g key={loe.id}>
          <line
            x1={loe.x1}
            y1={loe.y}
            x2={loe.x2}
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
          {loe.purposeLines.map((line, i) => (
            <text
              key={i}
              x={28}
              y={loe.y + 16 + i * 11}
              className="svg-loe-purpose"
              onClick={(e) => {
                e.stopPropagation();
                setSelection({ type: "loe", id: loe.id });
              }}
            >
              {line}
            </text>
          ))}
        </g>
      ))}

      {laidOut.dependencies.map((dep) => (
        <g key={dep.id} opacity={depOpacity(dep)}>
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
            y={loe.y - loe.height / 2 + 8}
            width={phase.width}
            height={loe.height - 16}
            fill="transparent"
            className="cell-hit"
            onPointerEnter={() =>
              setHoverCell({ loeId: loe.id, phaseId: phase.id })
            }
            onClick={(e) => {
              e.stopPropagation();
              if (
                !present &&
                !linkMode &&
                !cellOccupied(loe.id, phase.id)
              ) {
                openAddMenu(loe.id, phase.id);
                return;
              }
              setSelection({ type: "loe", id: loe.id });
            }}
          />
        )),
      )}

      {!present &&
        laidOut.phases.flatMap((phase) =>
          laidOut.loes.map((loe) => {
            const adding =
              addMenu?.loeId === loe.id && addMenu.phaseId === phase.id;
            const hovering =
              hoverCell?.loeId === loe.id && hoverCell.phaseId === phase.id;
            if (adding || !hovering) return null;
            const occupied = cellOccupied(loe.id, phase.id);
            return (
              <CellPlus
                key={`plus-${loe.id}-${phase.id}`}
                x={occupied ? phase.x + phase.width - 16 : phase.x + phase.width / 2}
                y={occupied ? loe.y - 28 : loe.y}
                onClick={() => openAddMenu(loe.id, phase.id)}
              />
            );
          }),
        )}

      {addMenu && !drag?.active && !dpDrag?.active && !linkMode && !present && (
        <AddPills
          x={
            (laidOut.phases.find((p) => p.id === addMenu.phaseId)?.x ?? 0) +
            (laidOut.phases.find((p) => p.id === addMenu.phaseId)?.width ?? 0) -
            100
          }
          y={(laidOut.loes.find((l) => l.id === addMenu.loeId)?.y ?? 0) + 18}
          onMilestone={() => addInCell("milestone", addMenu)}
          onCondition={() => addInCell("condition", addMenu)}
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
              x={n.x - nodeLabelSize(n.label).width / 2}
              y={n.y + 14}
              width={nodeLabelSize(n.label).width}
              height={Math.max(28, nodeLabelSize(n.label).height)}
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

      {laidOut.dps.map((dp) => {
        if (dpDrag?.active && dpDrag.id === dp.id) return null;
        return (
        <g
          key={dp.id}
          transform={`translate(${dp.x}, ${dp.y})`}
          className={dpDrag?.id === dp.id ? "dp-mark dragging" : "dp-mark"}
          onPointerDown={(e) => {
            e.stopPropagation();
            skipDeselect.current = true;
            if (linkMode || present) {
              setSelection({ type: "dp", id: dp.id });
              return;
            }
            setSelection({ type: "dp", id: dp.id });
            const pointer = svgRef.current
              ? svgPoint(svgRef.current, e.clientX, e.clientY)
              : { x: dp.x, y: dp.y };
            setDpDrag({
              id: dp.id,
              x: dp.x,
              y: dp.y,
              originX: pointer.x,
              active: false,
              pointerId: e.pointerId,
            });
          }}
          onClick={(e) => {
            e.stopPropagation();
            setSelection({ type: "dp", id: dp.id });
          }}
        >
          <circle r="20" fill="transparent" data-ui="true" />
          <rect x="-56" y="16" width="112" height="30" fill="transparent" />
          <path
            d={starPath(13)}
            fill="#2E7D32"
            stroke={isSelected(selection, "dp", dp.id) ? "#c4a35a" : "#1b5e20"}
            strokeWidth={isSelected(selection, "dp", dp.id) ? 2.5 : 1}
            filter="url(#soft)"
          />
          {wrapLabel(dp.label, 16, 4).map((line, i) => (
            <text
              key={i}
              y={24 + i * 12}
              textAnchor="middle"
              className="svg-dp-label"
            >
              {line}
            </text>
          ))}
        </g>
        );
      })}

      {dpDrag?.active &&
        (() => {
          const src = laidOut.dps.find((d) => d.id === dpDrag.id);
          const label = src?.label ?? "";
          return (
            <g
              transform={`translate(${dpDrag.x}, ${dpDrag.y})`}
              className="dp-mark dragging"
            >
              <path
                d={starPath(13)}
                fill="#2E7D32"
                stroke="#c4a35a"
                strokeWidth="2.5"
                filter="url(#soft)"
              />
              {wrapLabel(label, 16, 4).map((line, i) => (
                <text
                  key={i}
                  y={24 + i * 12}
                  textAnchor="middle"
                  className="svg-dp-label"
                >
                  {line}
                </text>
              ))}
            </g>
          );
        })()}

      <g
        className="end-state"
        onClick={(e) => {
          e.stopPropagation();
          setSelection({ type: "endState" });
        }}
      >
        <rect
          x={laidOut.endState.x}
          y={laidOut.endState.y}
          width={laidOut.endState.width}
          height={laidOut.endState.height}
          rx="12"
          fill={laidOut.endState.color}
          fillOpacity="0.16"
          stroke={isSelected(selection, "endState") ? "#c4a35a" : laidOut.endState.color}
          strokeOpacity={isSelected(selection, "endState") ? 1 : 0.55}
          strokeWidth={isSelected(selection, "endState") ? 2.4 : 1.2}
        />
        {laidOut.endState.nameLines.map((line, i) => (
          <text
            key={`n-${i}`}
            x={laidOut.endState.x + laidOut.endState.width / 2}
            y={
              endText.top +
              i * END_STATE_TEXT.nameLh +
              END_STATE_TEXT.nameLh / 2
            }
            textAnchor="middle"
            dominantBaseline="middle"
            className="svg-end"
            fill={palette.title}
          >
            {line}
          </text>
        ))}
        {laidOut.endState.descriptionLines.map((line, i) => (
          <text
            key={`d-${i}`}
            x={laidOut.endState.x + laidOut.endState.width / 2}
            y={
              endText.top +
              endText.nameH +
              endText.gap +
              i * END_STATE_TEXT.descLh +
              END_STATE_TEXT.descLh / 2
            }
            textAnchor="middle"
            dominantBaseline="middle"
            className="svg-end-desc"
            fill={palette.purpose}
          >
            {line}
          </text>
        ))}
      </g>

      {!present && (
        <>
          {laidOut.phases.length > 0 && (
            <PlusMark
              x={
                (laidOut.phases[laidOut.phases.length - 1].x +
                  laidOut.phases[laidOut.phases.length - 1].width +
                  laidOut.endCol.x) /
                2
              }
              y={laidOut.plot.y - 22}
              label="Add phase"
              onClick={() => {
                const afterId = laidOut.phases[laidOut.phases.length - 1].id;
                const id = uid("ph");
                dispatch({ type: "addPhase", afterId, id });
                setSelection({ type: "phase", id });
              }}
            />
          )}
          {laidOut.loes.length > 0 && (
            <PlusMark
              x={40}
              y={laidOut.loes[laidOut.loes.length - 1].y + 36}
              label="Add workstream"
              onClick={() => {
                const id = uid("loe");
                dispatch({ type: "addLoe", id });
                setSelection({ type: "loe", id });
              }}
            />
          )}
        </>
      )}

      <Legend x={36} y={laidOut.height - 36} />
    </svg>
  );
}

function CellPlus({
  x,
  y,
  onClick,
  title = "Add milestone or condition",
}: {
  x: number;
  y: number;
  onClick: () => void;
  title?: string;
}) {
  const { diagram: palette } = useTheme();
  return (
    <g
      data-ui="true"
      className="canvas-plus"
      transform={`translate(${x}, ${y})`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <title>{title}</title>
      <circle r="9" fill={palette.plus} fillOpacity="0.18" />
      <path
        d="M-4.5,0 H4.5 M0,-4.5 V4.5"
        stroke={palette.plus}
        strokeWidth="1.4"
        strokeOpacity="0.7"
      />
    </g>
  );
}

function PlusMark({
  x,
  y,
  label,
  onClick,
}: {
  x: number;
  y: number;
  label: string;
  onClick: () => void;
}) {
  const { diagram: palette } = useTheme();
  return (
    <g
      data-ui="true"
      className="canvas-plus"
      transform={`translate(${x}, ${y})`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <title>{label}</title>
      <circle r="11" fill={palette.plus} />
      <path d="M-5.5,0 H5.5 M0,-5.5 V5.5" stroke={palette.plusInk} strokeWidth="1.7" />
    </g>
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
  const { diagram: palette } = useTheme();
  return (
    <g data-ui="true" className="add-on-canvas" transform={`translate(${x}, ${y})`}>
      <g
        onClick={(e) => {
          e.stopPropagation();
          onMilestone();
        }}
      >
        <rect width="92" height="22" rx="11" fill={palette.pill} />
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
        <rect width="92" height="22" rx="11" fill={palette.pill} />
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
  const { diagram: palette } = useTheme();
  const { lines, width: boxW, height: boxH } = nodeLabelSize(label);
  const fill = kind === "milestone" ? MILESTONE_FILL : CONDITION_FILL;
  const stroke = selected ? "#c4a35a" : kind === "milestone" ? "#3b0d0d" : "#06243f";
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
        height={boxH}
        rx="3"
        fill={palette.labelBg}
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
        Gate
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
