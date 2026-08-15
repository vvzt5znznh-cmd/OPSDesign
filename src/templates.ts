import { uid } from "./id";
import type { OperationalDesign } from "./types";

function blank(partial: Partial<OperationalDesign> & Pick<OperationalDesign, "title" | "nodeKind">): OperationalDesign {
  const p1 = uid("ph");
  const p2 = uid("ph");
  const p3 = uid("ph");
  const l1 = uid("loe");
  const l2 = uid("loe");

  return {
    id: uid("op"),
    endState: { name: "END STATE", description: "" },
    phases: [
      { id: p1, name: "Phase 1" },
      { id: p2, name: "Phase 2" },
      { id: p3, name: "Phase 3" },
    ],
    linesOfEffort: [
      { id: l1, name: "LoE 1", color: "#E87722" },
      { id: l2, name: "LoE 2", color: "#5B8C2A" },
    ],
    conditions: [],
    decisionPoints: [
      { id: uid("dp"), label: "DP1", afterPhaseId: p1, description: "" },
      { id: uid("dp"), label: "DP2", afterPhaseId: p2, description: "" },
    ],
    ...partial,
  };
}

export function blankDesign(): OperationalDesign {
  return blank({
    title: "Untitled operation",
    nodeKind: "milestone",
  });
}

export function programmeTemplate(): OperationalDesign {
  const p1 = uid("ph");
  const p2 = uid("ph");
  const p3 = uid("ph");
  const p4 = uid("ph");
  const l1 = uid("loe");
  const l2 = uid("loe");
  const l3 = uid("loe");

  const m = (
    loeId: string,
    phaseId: string,
    n: number,
    label: string,
    order: number,
  ) => ({
    id: uid("c"),
    loeId,
    phaseId,
    label: `M${n}: ${label}`,
    description: "",
    order,
  });

  return {
    id: uid("op"),
    title: "Programme CONOPS",
    nodeKind: "milestone",
    endState: {
      name: "END STATE",
      description: "Capability in service, with residual risk accepted.",
    },
    phases: [
      { id: p1, name: "Identify" },
      { id: p2, name: "Define" },
      { id: p3, name: "Test and develop" },
      { id: p4, name: "Realise" },
    ],
    linesOfEffort: [
      { id: l1, name: "LoE 1", color: "#E87722" },
      { id: l2, name: "LoE 2", color: "#5B8C2A" },
      { id: l3, name: "LoE 3", color: "#3D9AD1" },
    ],
    decisionPoints: [
      { id: uid("dp"), label: "DP1", afterPhaseId: p1, description: "Proceed to define?" },
      { id: uid("dp"), label: "DP2", afterPhaseId: p2, description: "Proceed to test and develop?" },
      { id: uid("dp"), label: "DP3", afterPhaseId: p3, description: "Proceed to realise?" },
    ],
    conditions: [
      m(l1, p1, 1, "Need framed", 0),
      m(l1, p1, 2, "Stakeholders mapped", 1),
      m(l1, p2, 3, "Options down-selected", 0),
      m(l1, p3, 4, "Prototype proven", 0),
      m(l1, p3, 5, "Integration ready", 1),
      m(l1, p4, 6, "Tranche 1 live", 0),
      m(l1, p4, 7, "Handover complete", 1),
      m(l2, p1, 1, "Baseline understood", 0),
      m(l2, p2, 2, "Requirements agreed", 0),
      m(l2, p3, 3, "Test plan executed", 0),
      m(l2, p4, 4, "Acceptance signed", 0),
      m(l2, p4, 5, "Support in place", 1),
      m(l3, p1, 1, "Risks identified", 0),
      m(l3, p1, 2, "Partners engaged", 1),
      m(l3, p2, 3, "Funding locked", 0),
      m(l3, p3, 4, "Force prepared", 0),
      m(l3, p3, 5, "Comms ready", 1),
      m(l3, p4, 6, "Transition started", 0),
      m(l3, p4, 7, "Benefits tracking", 1),
    ],
  };
}

export function militaryTemplate(): OperationalDesign {
  const p1 = uid("ph");
  const p2 = uid("ph");
  const p3 = uid("ph");
  const p4 = uid("ph");
  const l1 = uid("loe");
  const l2 = uid("loe");
  const l3 = uid("loe");

  const dc = (
    loeId: string,
    phaseId: string,
    n: number,
    label: string,
    order: number,
  ) => ({
    id: uid("c"),
    loeId,
    phaseId,
    label: `DC${n}: ${label}`,
    description: "",
    order,
  });

  return {
    id: uid("op"),
    title: "Campaign CONOPS",
    nodeKind: "decisive_condition",
    endState: {
      name: "END STATE",
      description:
        "Adversary will to continue is broken; partner authority is restored; residual threat is contained.",
    },
    phases: [
      { id: p1, name: "Shape" },
      { id: p2, name: "Deter" },
      { id: p3, name: "Seize initiative" },
      { id: p4, name: "Dominate" },
    ],
    linesOfEffort: [
      { id: l1, name: "Intelligence", color: "#E87722" },
      { id: l2, name: "Manoeuvre", color: "#5B8C2A" },
      { id: l3, name: "Influence", color: "#3D9AD1" },
    ],
    decisionPoints: [
      { id: uid("dp"), label: "DP1", afterPhaseId: p1, description: "Commit to deterrence posture?" },
      { id: uid("dp"), label: "DP2", afterPhaseId: p2, description: "Authorise offensive action?" },
      { id: uid("dp"), label: "DP3", afterPhaseId: p3, description: "Exploit success / transition?" },
    ],
    conditions: [
      dc(l1, p1, 1, "Picture established", 0),
      dc(l1, p2, 2, "Intent confirmed", 0),
      dc(l1, p3, 3, "Targets cued", 0),
      dc(l1, p4, 4, "Pursuit enabled", 0),
      dc(l2, p1, 1, "Forces postured", 0),
      dc(l2, p2, 2, "Access secured", 0),
      dc(l2, p3, 3, "Foothold taken", 0),
      dc(l2, p4, 4, "Freedom of action", 0),
      dc(l3, p1, 1, "Narrative set", 0),
      dc(l3, p2, 2, "Coalition aligned", 0),
      dc(l3, p3, 3, "Will isolated", 0),
      dc(l3, p4, 4, "Authority restored", 0),
    ],
  };
}

export const TEMPLATES = [
  {
    id: "blank",
    name: "Blank design",
    blurb: "Three phases, two lines of effort, decision points ready to fill.",
    nodeKind: "milestone" as const,
    create: blankDesign,
  },
  {
    id: "programme",
    name: "Programme CONOPS",
    blurb: "Identify → Define → Test and develop → Realise, with milestones.",
    nodeKind: "milestone" as const,
    create: programmeTemplate,
  },
  {
    id: "military",
    name: "Campaign CONOPS",
    blurb: "Shape → Deter → Seize initiative → Dominate, with decisive conditions.",
    nodeKind: "decisive_condition" as const,
    create: militaryTemplate,
  },
] as const;
