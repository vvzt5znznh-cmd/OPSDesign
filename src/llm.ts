import { LOE_COLORS, type OperationalDesign } from "./types";

/** Stable sample an LLM can copy. Readable IDs; valid to File → Open JSON. */
export const SAMPLE_DESIGN: OperationalDesign = {
  id: "op-clinic-booking",
  title: "Clinic booking go-live",
  purpose:
    "Replace phone booking with a journey patients can complete without calling.",
  endState: {
    name: "LIVE AND USED",
    description:
      "Patients book unassisted. Clinics run the new process. Support is in place. Residual risk is accepted.",
  },
  phases: [
    { id: "ph-discover", name: "Discover" },
    { id: "ph-define", name: "Define" },
    { id: "ph-build", name: "Build and test" },
    { id: "ph-launch", name: "Launch" },
  ],
  linesOfEffort: [
    {
      id: "loe-service",
      name: "Service",
      color: LOE_COLORS[0],
      purpose: "Build the right booking journey",
    },
    {
      id: "loe-assurance",
      name: "Assurance",
      color: LOE_COLORS[1],
      purpose: "Make it safe and reliable",
    },
    {
      id: "loe-adoption",
      name: "Adoption",
      color: LOE_COLORS[2],
      purpose: "Get clinics and patients ready",
    },
  ],
  nodes: [
    {
      id: "n-problem-framed",
      kind: "milestone",
      loeId: "loe-service",
      phaseId: "ph-discover",
      label: "M1: Problem framed",
      description: "We can say who is blocked today and why the phone line fails them.",
      order: 0,
    },
    {
      id: "n-need-understood",
      kind: "condition",
      loeId: "loe-service",
      phaseId: "ph-discover",
      label: "C1: Need is understood",
      description: "Patients and clinics agree the jobs to be done.",
      order: 1,
    },
    {
      id: "n-options-chosen",
      kind: "milestone",
      loeId: "loe-service",
      phaseId: "ph-define",
      label: "M2: Options chosen",
      description: "Preferred journey is on paper, with what we will not build.",
      order: 0,
    },
    {
      id: "n-solution-agreed",
      kind: "condition",
      loeId: "loe-service",
      phaseId: "ph-define",
      label: "C2: Solution is agreed",
      description: "Sponsors have accepted scope, sequence, and residual risk.",
      order: 1,
    },
    {
      id: "n-beta-released",
      kind: "milestone",
      loeId: "loe-service",
      phaseId: "ph-build",
      label: "M3: Beta released",
      description: "A working journey is in the hands of a clinic cohort.",
      order: 0,
    },
    {
      id: "n-go-live",
      kind: "milestone",
      loeId: "loe-service",
      phaseId: "ph-launch",
      label: "M4: Go-live",
      description: "Phone booking is no longer the default path.",
      order: 0,
    },
    {
      id: "n-risks-visible",
      kind: "condition",
      loeId: "loe-assurance",
      phaseId: "ph-discover",
      label: "C1: Risks are visible",
      description: "Clinical, privacy, and operational risks are on one list.",
      order: 0,
    },
    {
      id: "n-funding",
      kind: "condition",
      loeId: "loe-assurance",
      phaseId: "ph-define",
      label: "C2: Funding is committed",
      description: "Build and hypercare are funded.",
      order: 0,
    },
    {
      id: "n-tests-passed",
      kind: "milestone",
      loeId: "loe-assurance",
      phaseId: "ph-build",
      label: "M3: Tests passed",
      description: "Critical paths, access, and failure modes have been tested.",
      order: 0,
    },
    {
      id: "n-support-in-place",
      kind: "condition",
      loeId: "loe-assurance",
      phaseId: "ph-launch",
      label: "C3: Support is in place",
      description: "Clinics know how to escalate. A human path still exists.",
      order: 0,
    },
    {
      id: "n-partners-engaged",
      kind: "condition",
      loeId: "loe-adoption",
      phaseId: "ph-discover",
      label: "C1: Clinics are engaged",
      description: "The clinics who must change have named owners.",
      order: 0,
    },
    {
      id: "n-training",
      kind: "milestone",
      loeId: "loe-adoption",
      phaseId: "ph-build",
      label: "M3: Training delivered",
      description: "Frontline staff have practised the new process.",
      order: 0,
    },
    {
      id: "n-users-ready",
      kind: "condition",
      loeId: "loe-adoption",
      phaseId: "ph-launch",
      label: "C2: Users are ready",
      description: "Patients can find and complete booking without a campaign of calls.",
      order: 0,
    },
  ],
  dependencies: [
    {
      id: "dep-problem-need",
      fromId: "n-problem-framed",
      toId: "n-need-understood",
    },
    {
      id: "dep-funding-agreed",
      fromId: "n-funding",
      toId: "n-solution-agreed",
    },
    {
      id: "dep-agreed-beta",
      fromId: "n-solution-agreed",
      toId: "n-beta-released",
    },
    {
      id: "dep-tests-go-live",
      fromId: "n-tests-passed",
      toId: "n-go-live",
    },
    {
      id: "dep-ready-go-live",
      fromId: "n-users-ready",
      toId: "n-go-live",
    },
    {
      id: "dep-training-ready",
      fromId: "n-training",
      toId: "n-users-ready",
    },
  ],
  decisionPoints: [
    {
      id: "dp-opportunity",
      label: "Is this worth defining?",
      afterPhaseId: "ph-discover",
      placement: "after",
      order: 0,
      description: "Is the problem sharp enough to fund a definition stage?",
    },
    {
      id: "dp-build",
      label: "Commit to build?",
      afterPhaseId: "ph-define",
      placement: "after",
      order: 0,
      description: "Scope, funding, and residual risk are accepted.",
    },
    {
      id: "dp-go-live",
      label: "Authorise go-live?",
      afterPhaseId: "ph-build",
      placement: "in",
      order: 1,
      description: "Tests passed, support ready, clinics willing.",
    },
  ],
};

export function sampleDesignJson(): string {
  return `${JSON.stringify(SAMPLE_DESIGN, null, 2)}\n`;
}

export const LLM_PROMPT = `You are producing an OPSDesign document. OPSDesign is a browser editor for an operational-design picture (CONOPS): concurrent workstreams, phases, milestones, conditions, decision gates, and an end state. The user will describe a project in natural language. You will output one JSON file they can File → Open JSON in OPSDesign.

## What the picture is for
Operational design asks: what must be true when we are done, what concurrent work produces it, what must hold along the way, and where someone has to decide. Same geometry for a service launch, a transformation, or a campaign. It is not a Gantt chart and not a process map.

## Vocabulary (use these words in labels)
- **End state**: the outcome that must hold when the work is done — a set of conditions, not a date. \`name\` is a short heading on the panel (e.g. LIVE AND USED). \`description\` is 1–3 sentences of what will be true.
- **Phase**: a stage left to right (Discover, Define, Build, Launch — or the user's names).
- **Workstream / line of effort**: concurrent work organised by purpose. \`name\` is short. \`purpose\` is one line under the name (the job that stream does).
- **Milestone** (\`kind\`: "milestone"): an event or deliverable. It happened, or it did not. Label like "M1: Problem framed".
- **Condition** (\`kind\`: "condition"): a state that must hold. "Funding is committed." "Users are ready." Label like "C1: Need is understood".
- **Gate / decision** (\`decisionPoints\`): a decision to proceed, recycle, or stop. Name it as the question or decision, not "Gate 1". \`placement\` is "in" (inside the phase) or "after" (on the seam after that phase). \`afterPhaseId\` is the phase the gate belongs to.
- **Dependency**: from A to B means A must be true or complete before B. Use these for cross-workstream coupling (the interesting ones) and for a few same-stream sequences. No cycles. Both IDs must be nodes.

## JSON shape
Root object:
{
  "id": string,
  "title": string,
  "purpose": string,
  "endState": { "name": string, "description": string },
  "phases": [{ "id": string, "name": string }],
  "linesOfEffort": [{ "id": string, "name": string, "color": string, "purpose": string }],
  "nodes": [{
    "id": string,
    "kind": "milestone" | "condition",
    "loeId": string,
    "phaseId": string,
    "label": string,
    "description": string,
    "order": number
  }],
  "dependencies": [{ "id": string, "fromId": string, "toId": string }],
  "decisionPoints": [{
    "id": string,
    "label": string,
    "afterPhaseId": string,
    "placement": "in" | "after",
    "order": number,
    "description": string
  }]
}

## Rules
1. Output **only** a single JSON object. No markdown, no commentary, no trailing text.
2. Copy the field names and nesting of the sample exactly. Do not add fields. Do not omit required fields. Use "" if a description is unknown.
3. Every \`phaseId\`, \`loeId\`, \`afterPhaseId\`, \`fromId\`, and \`toId\` must match an id you defined.
4. IDs must be unique strings. Prefer readable kebab-case: \`op-…\`, \`ph-…\`, \`loe-…\`, \`n-…\`, \`dp-…\`, \`dep-…\`.
5. \`order\` is the left-to-right slot in that workstream+phase, starting at 0. Two things in the same cell: 0 then 1.
6. Workstream colours, in order, pick from: ${LOE_COLORS.join(", ")}.
7. Typical size: 3–5 phases, 2–4 workstreams, 2–4 nodes per stream, 2–4 gates, a handful of dependencies. Prefer a readable picture over a complete WBS.
8. End state is not a date, a deliverable, or "project complete". Gates are decisions, not milestones.
9. Invent a new \`id\` for the root (not the sample's id). Title and purpose come from the user's description.
10. If the user is vague, still produce a coherent picture and keep purpose/end state explicit. Civilian and defence projects use the same schema.

## Sample
Match this structure. Replace the content with the user's project.

`;

export function llmPromptWithSample(): string {
  return `${LLM_PROMPT}${sampleDesignJson()}`;
}
