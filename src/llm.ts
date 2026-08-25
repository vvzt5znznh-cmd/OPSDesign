import { LOE_COLORS, END_STATE_COLORS, END_STATE_DEFAULT_COLOR, type OperationalDesign } from "./types";

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
    color: END_STATE_DEFAULT_COLOR,
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
      endState: "Patients book unassisted.",
    },
    {
      id: "loe-assurance",
      name: "Assurance",
      color: LOE_COLORS[1],
      purpose: "Make it safe and reliable",
      endState: "Support is in place. Residual risk is accepted.",
    },
    {
      id: "loe-adoption",
      name: "Adoption",
      color: LOE_COLORS[2],
      purpose: "Get clinics and patients ready",
      endState: "Clinics run the new process.",
    },
  ],
  nodes: [
    {
      id: "n-problem-framed",
      kind: "milestone",
      loeId: "loe-service",
      phaseId: "ph-discover",
      label: "M1: Problem framed",
      description: "",
      order: 0,
    },
    {
      id: "n-need-understood",
      kind: "condition",
      loeId: "loe-service",
      phaseId: "ph-discover",
      label: "C1: Need is understood",
      description: "",
      order: 2,
    },
    {
      id: "n-options-chosen",
      kind: "milestone",
      loeId: "loe-service",
      phaseId: "ph-define",
      label: "M2: Options chosen",
      description: "",
      order: 0,
    },
    {
      id: "n-solution-agreed",
      kind: "condition",
      loeId: "loe-service",
      phaseId: "ph-define",
      label: "C2: Solution is agreed",
      description: "",
      order: 2,
    },
    {
      id: "n-beta-released",
      kind: "milestone",
      loeId: "loe-service",
      phaseId: "ph-build",
      label: "M3: Beta released",
      description: "",
      order: 0,
    },
    {
      id: "n-go-live",
      kind: "milestone",
      loeId: "loe-service",
      phaseId: "ph-launch",
      label: "M4: Go-live",
      description: "",
      order: 0,
    },
    {
      id: "n-risks-visible",
      kind: "condition",
      loeId: "loe-assurance",
      phaseId: "ph-discover",
      label: "C1: Risks are visible",
      description: "",
      order: 0,
    },
    {
      id: "n-funding",
      kind: "condition",
      loeId: "loe-assurance",
      phaseId: "ph-define",
      label: "C2: Funding is committed",
      description: "",
      order: 0,
    },
    {
      id: "n-tests-passed",
      kind: "milestone",
      loeId: "loe-assurance",
      phaseId: "ph-build",
      label: "M3: Tests passed",
      description: "",
      order: 0,
    },
    {
      id: "n-support-in-place",
      kind: "condition",
      loeId: "loe-assurance",
      phaseId: "ph-launch",
      label: "C3: Support is in place",
      description: "",
      order: 0,
    },
    {
      id: "n-partners-engaged",
      kind: "condition",
      loeId: "loe-adoption",
      phaseId: "ph-discover",
      label: "C1: Clinics are engaged",
      description: "",
      order: 0,
    },
    {
      id: "n-training",
      kind: "milestone",
      loeId: "loe-adoption",
      phaseId: "ph-build",
      label: "M3: Training delivered",
      description: "",
      order: 0,
    },
    {
      id: "n-users-ready",
      kind: "condition",
      loeId: "loe-adoption",
      phaseId: "ph-launch",
      label: "C2: Users are ready",
      description: "",
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
      description: "",
    },
    {
      id: "dp-build",
      label: "Commit to build?",
      afterPhaseId: "ph-define",
      placement: "after",
      order: 0,
      description: "",
    },
    {
      id: "dp-go-live",
      label: "Authorise go-live?",
      afterPhaseId: "ph-build",
      placement: "in",
      order: 1,
      description: "",
    },
  ],
  showLoeEndStates: true,
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
- **Workstream / line of effort**: concurrent work organised by purpose. \`name\` is short. \`purpose\` is one line under the name (the job that stream does). \`endState\` is what will be true for that stream. When \`showLoeEndStates\` is true it sits in a pill at the right of the line and feeds the campaign panel; when false the lines run into the campaign panel and the text is kept but not drawn.
- **Milestone** (\`kind\`: "milestone"): an event or deliverable. It happened, or it did not. \`label\` is the text on the figure, e.g. "M1: Problem framed". \`description\` must be "".
- **Condition** (\`kind\`: "condition"): a state that must hold. "Funding is committed." "Users are ready." \`label\` is the text on the figure, e.g. "C1: Need is understood". \`description\` must be "".
- **Gate / decision** (\`decisionPoints\`): a decision to proceed, recycle, or stop. \`label\` is the text under the star — name it as the question or decision, not "Gate 1". \`description\` must be "". \`placement\` is "in" (inside the phase) or "after" (on the seam after that phase). \`afterPhaseId\` is the phase the gate belongs to.
- **Dependency**: from A to B means A must be true or complete before B. Use these for cross-workstream coupling (the interesting ones) and for a few same-stream sequences. No cycles. Both IDs must be nodes.

## JSON shape
Root object:
{
  "id": string,
  "title": string,
  "purpose": string,
  "endState": { "name": string, "description": string, "color": string },
  "phases": [{ "id": string, "name": string }],
  "linesOfEffort": [{ "id": string, "name": string, "color": string, "purpose": string, "endState": string }],
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
  }],
  "showLoeEndStates": boolean
}

## Rules
1. Output **only** a single JSON object. No markdown, no commentary, no trailing text.
2. Copy the field names and nesting of the sample exactly. Do not add fields. Do not omit required fields. Node and gate \`description\` must be "". \`endState.description\` is the campaign panel. Each workstream \`endState\` is that stream's outcome. \`showLoeEndStates\` is true to draw those as pills (usual); false hides the pills and runs the lines into the campaign panel.
3. Every \`phaseId\`, \`loeId\`, \`afterPhaseId\`, \`fromId\`, and \`toId\` must match an id you defined.
4. IDs must be unique strings. Prefer readable kebab-case: \`op-…\`, \`ph-…\`, \`loe-…\`, \`n-…\`, \`dp-…\`, \`dep-…\`.
5. \`order\` is the left-to-right slot in that workstream+phase, starting at 0. A default phase has three slots (early, middle, late). Two things on the same stream in the same phase cannot share a slot: 0 then 1 then 2. A later slot widens the phase.
6. Workstream colours, in order, pick from: ${LOE_COLORS.join(", ")}. End-state \`color\` is a wash on the panel; pick from: ${END_STATE_COLORS.join(", ")} (default ${END_STATE_DEFAULT_COLOR}). Do not fill it as a solid dark billboard.
7. Typical size: 3–5 phases, 2–4 workstreams, 2–4 nodes per stream, 2–4 gates, a handful of dependencies. Prefer a readable picture over a complete WBS.
8. End state is not a date, a deliverable, or "project complete". Gates are decisions, not milestones.
9. Invent a new \`id\` for the root (not the sample's id). Title and purpose come from the user's description.
10. If the user is vague, still produce a coherent picture and keep purpose/end state explicit. The same schema covers any kind of project.

## Sample
Match this structure. Replace the content with the user's project.

`;

export function llmPromptWithSample(): string {
  return `${LLM_PROMPT}${sampleDesignJson()}`;
}
