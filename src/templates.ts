import { uid } from "./id";
import { END_STATE_DEFAULT_COLOR, type DesignNode, type NodeKind, type OperationalDesign } from "./types";

function blank(
  partial: Partial<OperationalDesign> & Pick<OperationalDesign, "title">,
): OperationalDesign {
  const p1 = uid("ph");
  const p2 = uid("ph");
  const p3 = uid("ph");
  const l1 = uid("loe");
  const l2 = uid("loe");

  return {
    id: uid("op"),
    purpose: "",
    endState: { name: "END STATE", description: "", color: END_STATE_DEFAULT_COLOR },
    phases: [
      { id: p1, name: "Phase 1" },
      { id: p2, name: "Phase 2" },
      { id: p3, name: "Phase 3" },
    ],
    linesOfEffort: [
      { id: l1, name: "Workstream 1", color: "#E87722", purpose: "" },
      { id: l2, name: "Workstream 2", color: "#5B8C2A", purpose: "" },
    ],
    nodes: [],
    dependencies: [],
    decisionPoints: [
      { id: uid("dp"), label: "Decision 1", afterPhaseId: p1, placement: "after", order: 0, description: "" },
      { id: uid("dp"), label: "Decision 2", afterPhaseId: p2, placement: "after", order: 0, description: "" },
    ],
    ...partial,
  };
}

export function blankDesign(): OperationalDesign {
  return blank({
    title: "Untitled project",
    purpose: "What this work is for, in one sentence.",
  });
}

function node(
  kind: NodeKind,
  loeId: string,
  phaseId: string,
  label: string,
  order: number,
): DesignNode {
  return {
    id: uid("n"),
    kind,
    loeId,
    phaseId,
    label,
    description: "",
    order,
  };
}

export function projectTemplate(): OperationalDesign {
  const p1 = uid("ph");
  const p2 = uid("ph");
  const p3 = uid("ph");
  const p4 = uid("ph");
  const service = uid("loe");
  const assurance = uid("loe");
  const adoption = uid("loe");

  const n = {
    problemFramed: node("milestone", service, p1, "M1: Problem framed", 0),
    needUnderstood: node("condition", service, p1, "C1: Need is understood", 2),
    optionsChosen: node("milestone", service, p2, "M2: Options chosen", 0),
    solutionAgreed: node("condition", service, p2, "C2: Solution is agreed", 2),
    betaReleased: node("milestone", service, p3, "M3: Beta released", 0),
    serviceReliable: node("condition", service, p3, "C3: Service is reliable", 2),
    goLive: node("milestone", service, p4, "M4: Go-live", 1),
    baseline: node("milestone", assurance, p1, "M1: Baseline captured", 0),
    risksVisible: node("condition", assurance, p1, "C1: Risks are visible", 2),
    requirements: node("milestone", assurance, p2, "M2: Requirements signed", 0),
    funding: node("condition", assurance, p2, "C2: Funding is committed", 2),
    testsPassed: node("milestone", assurance, p3, "M3: Tests passed", 1),
    acceptance: node("milestone", assurance, p4, "M4: Acceptance signed", 0),
    support: node("condition", assurance, p4, "C3: Support is in place", 2),
    stakeholders: node("milestone", adoption, p1, "M1: Stakeholders mapped", 0),
    partners: node("condition", adoption, p1, "C1: Partners are engaged", 2),
    comms: node("milestone", adoption, p2, "M2: Comms plan agreed", 1),
    training: node("milestone", adoption, p3, "M3: Training delivered", 1),
    usersReady: node("condition", adoption, p4, "C2: Users are ready", 0),
    benefits: node("milestone", adoption, p4, "M4: Benefits tracking on", 2),
  };

  const dep = (from: DesignNode, to: DesignNode) => ({
    id: uid("dep"),
    fromId: from.id,
    toId: to.id,
  });

  return {
    id: uid("op"),
    title: "Service go-live",
    purpose:
      "Replace the current application process with a service people can complete without calling us.",
    endState: {
      name: "LIVE AND USED",
      description:
        "Users complete the journey unassisted. Support is in place. Residual risk is accepted. Benefits are being tracked.",
      color: END_STATE_DEFAULT_COLOR,
    },
    phases: [
      { id: p1, name: "Discover" },
      { id: p2, name: "Define" },
      { id: p3, name: "Build and test" },
      { id: p4, name: "Launch" },
    ],
    linesOfEffort: [
      {
        id: service,
        name: "Service",
        color: "#E87722",
        purpose: "Build the right service",
      },
      {
        id: assurance,
        name: "Assurance",
        color: "#5B8C2A",
        purpose: "Make it safe and reliable",
      },
      {
        id: adoption,
        name: "Adoption",
        color: "#3D9AD1",
        purpose: "Get people ready and engaged",
      },
    ],
    decisionPoints: [
      {
        id: uid("dp"),
        label: "Worth defining?",
        afterPhaseId: p1,
        placement: "after",
        order: 0,
        description: "",
      },
      {
        id: uid("dp"),
        label: "Commit to build?",
        afterPhaseId: p2,
        placement: "after",
        order: 0,
        description: "",
      },
      {
        id: uid("dp"),
        label: "Authorise go-live?",
        afterPhaseId: p3,
        placement: "after",
        order: 0,
        description: "",
      },
    ],
    nodes: Object.values(n),
    dependencies: [
      dep(n.problemFramed, n.needUnderstood),
      dep(n.optionsChosen, n.solutionAgreed),
      dep(n.funding, n.solutionAgreed),
      dep(n.solutionAgreed, n.betaReleased),
      dep(n.testsPassed, n.serviceReliable),
      dep(n.serviceReliable, n.goLive),
      dep(n.usersReady, n.goLive),
      dep(n.training, n.usersReady),
      dep(n.acceptance, n.support),
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

  const c = (
    loeId: string,
    phaseId: string,
    label: string,
    order: number,
  ): DesignNode => node("condition", loeId, phaseId, label, order);

  const intel1 = c(l1, p1, "C1: Picture established", 1);
  const intel2 = c(l1, p2, "C2: Intent confirmed", 1);
  const intel3 = c(l1, p3, "C3: Targets cued", 1);
  const intel4 = c(l1, p4, "C4: Pursuit enabled", 1);
  const man1 = c(l2, p1, "C1: Forces postured", 1);
  const man2 = c(l2, p2, "C2: Access secured", 1);
  const man3 = c(l2, p3, "C3: Foothold taken", 1);
  const man4 = c(l2, p4, "C4: Freedom of action", 1);
  const inf1 = c(l3, p1, "C1: Narrative set", 1);
  const inf2 = c(l3, p2, "C2: Partners aligned", 1);
  const inf3 = c(l3, p3, "C3: Opposition isolated", 1);
  const inf4 = c(l3, p4, "C4: Authority restored", 1);

  const dep = (from: DesignNode, to: DesignNode) => ({
    id: uid("dep"),
    fromId: from.id,
    toId: to.id,
  });

  return {
    id: uid("op"),
    title: "Campaign CONOPS",
    purpose:
      "Set the conditions for a stable authority to resume, with residual threat contained.",
    endState: {
      name: "END STATE",
      description:
        "Partner authority is restored. Residual threat is contained. The force can transition.",
      color: END_STATE_DEFAULT_COLOR,
    },
    phases: [
      { id: p1, name: "Shape" },
      { id: p2, name: "Deter" },
      { id: p3, name: "Seize initiative" },
      { id: p4, name: "Dominate" },
    ],
    linesOfEffort: [
      {
        id: l1,
        name: "Intelligence",
        color: "#E87722",
        purpose: "See and understand",
      },
      {
        id: l2,
        name: "Manoeuvre",
        color: "#5B8C2A",
        purpose: "Posture, access, and seize",
      },
      {
        id: l3,
        name: "Influence",
        color: "#3D9AD1",
        purpose: "Shape the narrative",
      },
    ],
    decisionPoints: [
      {
        id: uid("dp"),
        label: "Commit to deter?",
        afterPhaseId: p1,
        placement: "after",
        order: 0,
        description: "",
      },
      {
        id: uid("dp"),
        label: "Authorise action?",
        afterPhaseId: p2,
        placement: "after",
        order: 0,
        description: "",
      },
      {
        id: uid("dp"),
        label: "Exploit or transition?",
        afterPhaseId: p3,
        placement: "after",
        order: 0,
        description: "",
      },
    ],
    nodes: [
      intel1,
      intel2,
      intel3,
      intel4,
      man1,
      man2,
      man3,
      man4,
      inf1,
      inf2,
      inf3,
      inf4,
    ],
    dependencies: [
      dep(intel2, man2),
      dep(man2, man3),
      dep(inf2, inf3),
      dep(man3, intel3),
      dep(inf3, man4),
    ],
  };
}

export const TEMPLATES = [
  {
    id: "blank",
    name: "Blank",
    blurb: "Three phases, two workstreams, decisions ready to name.",
    tag: "Empty",
    create: blankDesign,
  },
  {
    id: "project",
    name: "Service go-live",
    blurb:
      "Discover → Define → Build and test → Launch, with milestones, conditions, and dependencies.",
    tag: "Sample",
    create: projectTemplate,
  },
  {
    id: "military",
    name: "Campaign",
    blurb:
      "Shape → Deter → Seize initiative → Dominate, with conditions across workstreams.",
    tag: "Sample",
    create: militaryTemplate,
  },
] as const;
