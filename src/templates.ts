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
      { id: l1, name: "Workstream 1", color: "#E87722", purpose: "", endState: "" },
      { id: l2, name: "Workstream 2", color: "#5B8C2A", purpose: "", endState: "" },
    ],
    nodes: [],
    dependencies: [],
    decisionPoints: [
      { id: uid("dp"), label: "Decision 1", afterPhaseId: p1, placement: "after", order: 0, description: "" },
      { id: uid("dp"), label: "Decision 2", afterPhaseId: p2, placement: "after", order: 0, description: "" },
    ],
    showLoeEndStates: false,
    showDetail: false,
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
  description = "",
): DesignNode {
  return {
    id: uid("n"),
    kind,
    loeId,
    phaseId,
    label,
    description,
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
    problemFramed: node(
      "milestone",
      service,
      p1,
      "M1: Problem framed",
      0,
      "People cannot finish an application without calling. That is the problem to fix.",
    ),
    needUnderstood: node(
      "condition",
      service,
      p1,
      "C1: Need is understood",
      2,
      "The journeys that matter, and who they are for, are agreed.",
    ),
    optionsChosen: node(
      "milestone",
      service,
      p2,
      "M2: Options chosen",
      0,
      "A preferred option is on the table. Discarded options are recorded.",
    ),
    solutionAgreed: node(
      "condition",
      service,
      p2,
      "C2: Solution is agreed",
      2,
      "The service to build is named, scoped, and accepted.",
    ),
    betaReleased: node(
      "milestone",
      service,
      p3,
      "M3: Beta released",
      0,
      "A working service is in the hands of a limited set of users.",
    ),
    serviceReliable: node(
      "condition",
      service,
      p3,
      "C3: Service is reliable",
      2,
      "The live path holds under expected load. Known defects are accepted.",
    ),
    goLive: node(
      "milestone",
      service,
      p4,
      "M4: Go-live",
      1,
      "The new service is the default path. The old process is withdrawn.",
    ),
    baseline: node(
      "milestone",
      assurance,
      p1,
      "M1: Baseline captured",
      0,
      "Current performance, cost, and risk are written down so change can be judged.",
    ),
    risksVisible: node(
      "condition",
      assurance,
      p1,
      "C1: Risks are visible",
      2,
      "Owners, likelihood, and treatment sit on one list.",
    ),
    requirements: node(
      "milestone",
      assurance,
      p2,
      "M2: Requirements signed",
      0,
      "What must be true for go-live is agreed in writing.",
    ),
    funding: node(
      "condition",
      assurance,
      p2,
      "C2: Funding is committed",
      2,
      "Money and people for build and run are allocated.",
    ),
    testsPassed: node(
      "milestone",
      assurance,
      p3,
      "M3: Tests passed",
      1,
      "The agreed tests have been run. Residual defects are listed.",
    ),
    acceptance: node(
      "milestone",
      assurance,
      p4,
      "M4: Acceptance signed",
      0,
      "The receiving owner accepts the service as ready to run.",
    ),
    support: node(
      "condition",
      assurance,
      p4,
      "C3: Support is in place",
      2,
      "Someone answers when it breaks, in hours that match demand.",
    ),
    stakeholders: node(
      "milestone",
      adoption,
      p1,
      "M1: Stakeholders mapped",
      0,
      "Who must agree, who must use it, and who can block it.",
    ),
    partners: node(
      "condition",
      adoption,
      p1,
      "C1: Partners are engaged",
      2,
      "The people we depend on are working with us, not waiting to be told.",
    ),
    comms: node(
      "milestone",
      adoption,
      p2,
      "M2: Comms plan agreed",
      1,
      "Who hears what, when, and through which channel.",
    ),
    training: node(
      "milestone",
      adoption,
      p3,
      "M3: Training delivered",
      1,
      "The people who will run the service have practised the new path.",
    ),
    usersReady: node(
      "condition",
      adoption,
      p4,
      "C2: Users are ready",
      0,
      "Users know the new path and can complete it without a workaround.",
    ),
    benefits: node(
      "milestone",
      adoption,
      p4,
      "M4: Benefits tracking on",
      2,
      "The measures that prove the change are being collected.",
    ),
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
        endState: "Users complete the journey unassisted.",
      },
      {
        id: assurance,
        name: "Assurance",
        color: "#5B8C2A",
        purpose: "Make it safe and reliable",
        endState: "Support is in place. Residual risk is accepted.",
      },
      {
        id: adoption,
        name: "Adoption",
        color: "#3D9AD1",
        purpose: "Get people ready and engaged",
        endState: "Benefits are being tracked.",
      },
    ],
    decisionPoints: [
      {
        id: uid("dp"),
        label: "Worth defining?",
        afterPhaseId: p1,
        placement: "after",
        order: 0,
        description:
          "Is the problem real enough, and the need clear enough, to spend design time?",
      },
      {
        id: uid("dp"),
        label: "Commit to build?",
        afterPhaseId: p2,
        placement: "after",
        order: 0,
        description:
          "Is the solution agreed and funded, so build should start?",
      },
      {
        id: uid("dp"),
        label: "Authorise go-live?",
        afterPhaseId: p3,
        placement: "after",
        order: 0,
        description:
          "Is the service reliable, support in place, and residual risk accepted?",
      },
    ],
    nodes: Object.values(n),
    showLoeEndStates: true,
    showDetail: false,
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
    description: string,
  ): DesignNode => node("condition", loeId, phaseId, label, order, description);

  const intel1 = c(
    l1,
    p1,
    "C1: Picture established",
    1,
    "The situation is described well enough to decide.",
  );
  const intel2 = c(
    l1,
    p2,
    "C2: Intent confirmed",
    1,
    "What must be achieved, and what must be avoided, is agreed.",
  );
  const intel3 = c(
    l1,
    p3,
    "C3: Targets cued",
    1,
    "The next actions have a clear object and timing.",
  );
  const intel4 = c(
    l1,
    p4,
    "C4: Pursuit enabled",
    1,
    "Follow-on action can be directed without starting from scratch.",
  );
  const man1 = c(
    l2,
    p1,
    "C1: Forces postured",
    1,
    "People and means are where they can act when authorised.",
  );
  const man2 = c(
    l2,
    p2,
    "C2: Access secured",
    1,
    "The force can get to the places it must operate.",
  );
  const man3 = c(
    l2,
    p3,
    "C3: Foothold taken",
    1,
    "A position exists from which the rest of the action can proceed.",
  );
  const man4 = c(
    l2,
    p4,
    "C4: Freedom of action",
    1,
    "The force can manoeuvre without being fixed.",
  );
  const inf1 = c(
    l3,
    p1,
    "C1: Narrative set",
    1,
    "The story we need others to hear is in play.",
  );
  const inf2 = c(
    l3,
    p2,
    "C2: Partners aligned",
    1,
    "Those we need with us share the same immediate purpose.",
  );
  const inf3 = c(
    l3,
    p3,
    "C3: Opposition isolated",
    1,
    "The opposing story and its backers have less room.",
  );
  const inf4 = c(
    l3,
    p4,
    "C4: Authority restored",
    1,
    "A legitimate authority can act in public and be recognised.",
  );

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
        endState: "Pursuit is enabled.",
      },
      {
        id: l2,
        name: "Manoeuvre",
        color: "#5B8C2A",
        purpose: "Posture, access, and seize",
        endState: "The force has freedom of action.",
      },
      {
        id: l3,
        name: "Influence",
        color: "#3D9AD1",
        purpose: "Shape the narrative",
        endState: "Partner authority is restored.",
      },
    ],
    decisionPoints: [
      {
        id: uid("dp"),
        label: "Commit to deter?",
        afterPhaseId: p1,
        placement: "after",
        order: 0,
        description:
          "Is the picture good enough to posture and warn, rather than wait?",
      },
      {
        id: uid("dp"),
        label: "Authorise action?",
        afterPhaseId: p2,
        placement: "after",
        order: 0,
        description: "Are access and intent sufficient to act?",
      },
      {
        id: uid("dp"),
        label: "Exploit or transition?",
        afterPhaseId: p3,
        placement: "after",
        order: 0,
        description:
          "Has initiative been seized enough to press, or should we hand over?",
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
    showLoeEndStates: true,
    showDetail: false,
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
