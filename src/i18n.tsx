import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "nb";

const LANG_KEY = "opsdesign:lang";

export type Copy = {
  milestone: string;
  milestones: string;
  condition: string;
  conditions: string;
  gate: string;
  gates: string;
  decision: string;
  decisionGates: string;
  dependency: string;
  endState: string;
  endStateHeader: string;
  workstream: string;
  workstreams: string;
  phase: string;
  phases: string;
  purpose: string;
  title: string;
  project: string;
  detail: string;
  detailFigure: string;
  phaseFigure: string;
  campaignEndPanel: string;
  prevPhase: string;
  nextPhase: string;
  file: string;
  newFile: string;
  openJson: string;
  askLlm: string;
  saveJson: string;
  exportPng: string;
  exportSvg: string;
  exportPages: string;
  exportPptx: string;
  restorePrevious: string;
  undo: string;
  redo: string;
  link: string;
  linking: string;
  present: string;
  edit: string;
  dark: string;
  off: string;
  on: string;
  close: string;
  cancel: string;
  remove: string;
  done: string;
  name: string;
  label: string;
  description: string;
  colour: string;
  earlier: string;
  later: string;
  up: string;
  down: string;
  untitled: string;
  untitledProject: string;
  notesSuffix: string;
  inWord: string;
  afterWord: string;
  inPhase: string;
  afterPhase: string;
  noNodes: string;
  emptyDetail: string;
  addGate: string;
  addPhase: string;
  addWorkstream: string;
  addNode: string;
  help: string;
  langEn: string;
  langNb: string;
  langTitle: string;
  projectTitle: string;
  importFailed: string;
  pagesFailed: string;
  pptxFailed: string;
  linkBanner: string;
  purposePlaceholder: string;
  whatWillBeTrue: string;
  whatWillBeTrueHint: string;
  streamPurposePlaceholder: string;
  streamEndPlaceholder: string;
  nodeDescPlaceholder: string;
  gateDescPlaceholder: string;
  gateLabelPlaceholder: string;
  addPredecessor: string;
  dependsOn: string;
  thisEnables: string;
  drawLink: string;
  removeLink: string;
  unknown: string;
  addPhaseAfter: string;
  removePhase: string;
  removeWorkstream: string;
  workstreamEndStates: string;
  loeEndsOn: string;
  loeEndsOff: string;
  streamFeedsCampaign: string;
  endStateIntro: string;
  workstreamIntro: string;
  milestoneIntro: string;
  conditionIntro: string;
  gateIntro: string;
  dependencyIntro: (from: string, to: string) => string;
  pickerTitle: string;
  pickerIntro: string;
  pickerIntroReplace: string;
  tplEmpty: string;
  tplSample: string;
  tplBlank: string;
  tplBlankBlurb: string;
  tplProject: string;
  tplProjectBlurb: string;
  tplCampaign: string;
  tplCampaignBlurb: string;
  tplEpic: string;
  tplEpicBlurb: string;
  llmTitle: string;
  llmIntro: string;
  llmStep1: string;
  llmStep2: string;
  llmStep3: string;
  llmStep4: string;
  copyPrompt: string;
  copied: string;
  downloadSample: string;
  helpTitle: string;
  helpIntro: string;
  helpEndState: string;
  helpPhases: string;
  helpWorkstreams: string;
  helpMilestone: string;
  helpCondition: string;
  helpGate: string;
  helpHow: string;
  helpPersist: string;
  notesBriefing: string;
  notesDelete: string;
  notesPurpose: string;
  notesLoeEnds: string;
  notesDetailFollows: string;
  notesSubtitle: string;
  notesSubtitleCont: string;
  phaseN: (n: number) => string;
  workstreamN: (n: number) => string;
  decisionN: (n: number) => string;
  inPhaseMeta: (name: string) => string;
  afterPhaseMeta: (name: string) => string;
  notesPage: (phase: string) => string;
};

const en: Copy = {
  milestone: "Milestone",
  milestones: "Milestones",
  condition: "Condition",
  conditions: "Conditions",
  gate: "Gate",
  gates: "Gates",
  decision: "Decision",
  decisionGates: "Decision gates",
  dependency: "Dependency",
  endState: "End state",
  endStateHeader: "END STATE",
  workstream: "Workstream",
  workstreams: "Workstreams",
  phase: "Phase",
  phases: "Phases",
  purpose: "Purpose",
  title: "Title",
  project: "Project",
  detail: "Detail",
  detailFigure: "Detail figure",
  phaseFigure: "Phase figure",
  campaignEndPanel: "End-state panel",
  prevPhase: "Previous phase",
  nextPhase: "Next phase",
  file: "File",
  newFile: "New…",
  openJson: "Open JSON…",
  askLlm: "Ask an LLM…",
  saveJson: "Save JSON",
  exportPng: "Export PNG",
  exportSvg: "Export SVG",
  exportPages: "Export pages…",
  exportPptx: "Export PowerPoint…",
  restorePrevious: "Restore previous",
  undo: "Undo",
  redo: "Redo",
  link: "Link",
  linking: "Linking…",
  present: "Present",
  edit: "Edit",
  dark: "Dark",
  off: "Off",
  on: "On",
  close: "Close",
  cancel: "Cancel",
  remove: "Remove",
  done: "Done",
  name: "Name",
  label: "Label",
  description: "Description",
  colour: "Colour",
  earlier: "← Earlier",
  later: "Later →",
  up: "↑ Up",
  down: "↓ Down",
  untitled: "Untitled",
  untitledProject: "Untitled project",
  notesSuffix: "notes",
  inWord: "In",
  afterWord: "After",
  inPhase: "In phase",
  afterPhase: "After phase",
  noNodes: "No milestones or conditions.",
  emptyDetail:
    "Add milestones, conditions, or gates on the picture. They will list here by workstream.",
  addGate: "Add gate",
  addPhase: "Add phase",
  addWorkstream: "Add workstream",
  addNode: "Add milestone or condition",
  help: "Help",
  langEn: "EN",
  langNb: "NO",
  langTitle: "Language",
  projectTitle: "Project title",
  importFailed: "Import failed.",
  pagesFailed: "Page export failed.",
  pptxFailed: "PowerPoint export failed.",
  linkBanner: "Click what must happen first, then what depends on it.",
  purposePlaceholder: "What this work is for, in one sentence.",
  whatWillBeTrue: "What will be true",
  whatWillBeTrueHint: "Shown under the name on the panel.",
  streamPurposePlaceholder: "What this stream is for",
  streamEndPlaceholder: "What will be true for this stream",
  nodeDescPlaceholder: "What this means — shown in the list under the picture.",
  gateDescPlaceholder:
    "What this decision is about — shown in the list under the picture.",
  gateLabelPlaceholder: "Proceed? Recycle? Stop?",
  addPredecessor: "Add a predecessor…",
  dependsOn: "Depends on",
  thisEnables: "This enables",
  drawLink: "Draw link from here",
  removeLink: "Remove link",
  unknown: "Unknown",
  addPhaseAfter: "Add phase after",
  removePhase: "Remove phase",
  removeWorkstream: "Remove workstream",
  workstreamEndStates: "Workstream end states",
  loeEndsOn:
    "A pill at the right of every workstream. Turn off to run the lines into the campaign panel.",
  loeEndsOff:
    "Hidden on every workstream. Typed text is kept. Turn on to show a pill on each line.",
  streamFeedsCampaign:
    "This stream's outcome. It feeds the campaign end state on the right.",
  endStateIntro:
    "The panel on the right. Every workstream reads into it. Name is the heading; what will be true sits under it. Colour is a light wash — keep it part of the picture, not a billboard.",
  workstreamIntro: "Concurrent work organised by purpose.",
  milestoneIntro: "An event or deliverable. The label is the text on the picture.",
  conditionIntro: "A state that must hold. The label is the text on the picture.",
  gateIntro:
    "Go, recycle, or stop. Name it as the decision — that label sits under the star. Drag along the bar to sit inside a phase, or on the seam after it. Hover the bar and click + to add another.",
  dependencyIntro: (from, to) =>
    `${from} must be true or complete before ${to}.`,
  pickerTitle: "Start from a sample",
  pickerIntro: "An empty picture, or a filled-in example.",
  pickerIntroReplace:
    "An empty picture, or a filled-in example. Your current picture is kept — Undo, or File → Restore previous.",
  tplEmpty: "Empty",
  tplSample: "Sample",
  tplBlank: "Blank",
  tplBlankBlurb: "Three phases, two workstreams, decisions ready to name.",
  tplProject: "Service go-live",
  tplProjectBlurb:
    "Discover → Define → Build and test → Launch, with milestones, conditions, and dependencies.",
  tplCampaign: "Campaign",
  tplCampaignBlurb:
    "Shape → Deter → Seize initiative → Dominate, with conditions across workstreams.",
  tplEpic: "Operation Epic Fury",
  tplEpicBlurb:
    "Shape → Seize initiative → Dominate → Coerce and terminate → Prevent reconstitution. Six lines of effort, gates, and supporting notes.",
  llmTitle: "Ask an LLM for a picture",
  llmIntro:
    "Give a language model the prompt and the sample file, then describe your project in plain language. Save the JSON it returns and open it here with File → Open JSON.",
  llmStep1: "Copy the prompt (it includes the sample).",
  llmStep2:
    "Paste it into ChatGPT, Claude, or similar. Attach the sample file if the model takes files.",
  llmStep3: "Describe the work: outcome, stages, concurrent streams, decisions.",
  llmStep4: "Save the reply as a .json file. File → Open JSON.",
  copyPrompt: "Copy prompt",
  copied: "Copied",
  downloadSample: "Download sample JSON",
  helpTitle: "How the picture works",
  helpIntro:
    "Operational design is a way to see how concurrent work produces a desired outcome. Same geometry for a service launch, a transformation, or a campaign.",
  helpEndState:
    "The panel on the right. Every workstream reads into it. Name is the heading; what will be true sits under it — not a date. Colour is a wash you can change in the inspector. Workstream end states (pills at the right of each line) are optional — Off/On in the inspector. Turn them off and the lines run into the campaign panel; the text is kept.",
  helpPhases: "Stages, left to right. Discover, define, build, launch — or yours.",
  helpWorkstreams:
    "Concurrent work organised by purpose. Name the stream, then the one-line job it does. With workstream end states on, click the stream (or the pill at the end of the line) to set its end state.",
  helpMilestone:
    "An event or deliverable. It happened, or it did not. Optional description sits in the detail list under the picture, not on the figure.",
  helpCondition:
    "A state that must hold. Funding is committed. Users are ready. Optional description sits in the detail list under the picture.",
  helpGate:
    'A decision: proceed, recycle, or stop. Sit inside a phase, or on the seam after it. Name it as the decision, not "Gate 1". Optional description sits in the detail list under the picture.',
  helpHow:
    "Hover a workstream in a phase and click the +, or click an empty cell, to add a milestone or condition — it lands where you click (early, middle, or late). On a busy cell the + sits at the right so it does not cover the figures. The Milestone / Condition pills sit in front of existing marks; click anywhere else or press Escape to close them. Hover the gate bar and click the + to add a decision. Drag nodes along a workstream to sit early, in the middle, or late in a phase; drop at the right edge to widen the phase. Drag a gate along the bar to place it in a phase or after it. Use the + marks to add a phase or workstream. Click a milestone or condition to see its links. Title, purpose, and labels wrap — the picture grows instead of clipping. Link, then click A then B — B sits to the right of A. The first time, pick a sample. File → New… is that prompt again. File → Ask an LLM… copies a prompt and sample JSON; File → Open JSON loads the file it returns. File → Export PowerPoint makes a 16:9 briefing: the wall, then one slide per phase from the Phase figure (not a crop). The picture scales to fit; type scales with it. If the detail figure is on, notes for that phase follow it. Long descriptions continue on extra slides rather than shrinking. PNG and SVG follow the same toggle: the list sits under the picture. File → Export pages… makes a zip of PNGs for Word/A4 — the wall, then one re-laid picture of each phase (same as the Phase figure). If the detail figure is on, matching notes pages go in the same zip. Decision gates list as a campaign band, not as a workstream. Dependency links are curved PowerPoint connectors glued to the sides of the figures. Labels are the text on the picture. Workstream end states are optional (Off/On in the inspector). When on, each workstream can carry an end state at the right of its line. Campaign end-state name and the conditions that must hold sit on the panel. Phase figure Off/On under the wall walks one phase with full labels; workstream chips and end-state toggles change only that view. Detail Off/On under that can list decision gates (campaign-level) and each workstream's milestones and conditions, with optional descriptions.",
  helpPersist:
    "The picture stays in this browser when you leave. Undo/Redo cover this tab, including refresh. File → Restore previous brings back what New or Open JSON replaced.",
  notesBriefing: "OPSDesign briefing notes — not drawn on the slide.",
  notesDelete:
    "Delete these notes before you share the file if they should stay off the deck.",
  notesPurpose: "Purpose",
  notesLoeEnds: "Workstream end states",
  notesDetailFollows: "Detail follows on the next 16:9 slides.",
  notesSubtitle: "Decision gates, milestones, and conditions",
  notesSubtitleCont: "Decision gates, milestones, and conditions (continued)",
  phaseN: (n) => `Phase ${n}`,
  workstreamN: (n) => `Workstream ${n}`,
  decisionN: (n) => `Decision ${n}`,
  inPhaseMeta: (name) => `In ${name}`.trim(),
  afterPhaseMeta: (name) => `After ${name}`.trim(),
  notesPage: (phase) => `${phase} — notes`,
};

const nb: Copy = {
  milestone: "Milepæl",
  milestones: "Milepæler",
  condition: "Betingelse",
  conditions: "Betingelser",
  gate: "Port",
  gates: "Porter",
  decision: "Beslutning",
  decisionGates: "Beslutningsporter",
  dependency: "Avhengighet",
  endState: "Sluttilstand",
  endStateHeader: "SLUTTILSTAND",
  workstream: "Arbeidsstrøm",
  workstreams: "Arbeidsstrømmer",
  phase: "Fase",
  phases: "Faser",
  purpose: "Formål",
  title: "Tittel",
  project: "Prosjekt",
  detail: "Detalj",
  detailFigure: "Detaljfigur",
  phaseFigure: "Fasefigur",
  campaignEndPanel: "Sluttilstandspanel",
  prevPhase: "Forrige fase",
  nextPhase: "Neste fase",
  file: "Fil",
  newFile: "Ny…",
  openJson: "Åpne JSON…",
  askLlm: "Spør en LLM…",
  saveJson: "Lagre JSON",
  exportPng: "Eksporter PNG",
  exportSvg: "Eksporter SVG",
  exportPages: "Eksporter sider…",
  exportPptx: "Eksporter PowerPoint…",
  restorePrevious: "Gjenopprett forrige",
  undo: "Angre",
  redo: "Gjør om",
  link: "Koble",
  linking: "Kobler…",
  present: "Presenter",
  edit: "Rediger",
  dark: "Mørk",
  off: "Av",
  on: "På",
  close: "Lukk",
  cancel: "Avbryt",
  remove: "Fjern",
  done: "Ferdig",
  name: "Navn",
  label: "Etikett",
  description: "Beskrivelse",
  colour: "Farge",
  earlier: "← Tidligere",
  later: "Senere →",
  up: "↑ Opp",
  down: "↓ Ned",
  untitled: "Uten tittel",
  untitledProject: "Prosjekt uten navn",
  notesSuffix: "notater",
  inWord: "I",
  afterWord: "Etter",
  inPhase: "I fasen",
  afterPhase: "Etter fasen",
  noNodes: "Ingen milepæler eller betingelser.",
  emptyDetail:
    "Legg til milepæler, betingelser eller porter på bildet. De listes her per arbeidsstrøm.",
  addGate: "Legg til port",
  addPhase: "Legg til fase",
  addWorkstream: "Legg til arbeidsstrøm",
  addNode: "Legg til milepæl eller betingelse",
  help: "Hjelp",
  langEn: "EN",
  langNb: "NO",
  langTitle: "Språk",
  projectTitle: "Prosjekttittel",
  importFailed: "Import feilet.",
  pagesFailed: "Sideeksport feilet.",
  pptxFailed: "PowerPoint-eksport feilet.",
  linkBanner: "Klikk det som må skje først, deretter det som avhenger av det.",
  purposePlaceholder: "Hva dette arbeidet er til, i én setning.",
  whatWillBeTrue: "Hva som skal være sant",
  whatWillBeTrueHint: "Vises under navnet på panelet.",
  streamPurposePlaceholder: "Hva denne strømmen er til",
  streamEndPlaceholder: "Hva som skal være sant for denne strømmen",
  nodeDescPlaceholder: "Hva dette betyr — vises i listen under bildet.",
  gateDescPlaceholder:
    "Hva denne beslutningen gjelder — vises i listen under bildet.",
  gateLabelPlaceholder: "Fortsette? Gå om? Stoppe?",
  addPredecessor: "Legg til en forutsetning…",
  dependsOn: "Avhenger av",
  thisEnables: "Dette muliggjør",
  drawLink: "Tegn kobling herfra",
  removeLink: "Fjern kobling",
  unknown: "Ukjent",
  addPhaseAfter: "Legg til fase etter",
  removePhase: "Fjern fase",
  removeWorkstream: "Fjern arbeidsstrøm",
  workstreamEndStates: "Sluttilstand per arbeidsstrøm",
  loeEndsOn:
    "En brikke til høyre på hver arbeidsstrøm. Slå av for å la linjene gå inn i kampanjepanelet.",
  loeEndsOff:
    "Skjult på hver arbeidsstrøm. Teksten beholdes. Slå på for å vise en brikke på hver linje.",
  streamFeedsCampaign:
    "Utfallet for denne strømmen. Det mater kampanjens sluttilstand til høyre.",
  endStateIntro:
    "Panelet til høyre. Hver arbeidsstrøm leser inn i det. Navnet er overskriften; det som skal være sant står under. Fargen er en lett lasur — la den sitte i bildet, ikke som en plakat.",
  workstreamIntro: "Parallelt arbeid organisert etter formål.",
  milestoneIntro: "En hendelse eller et leveransepunkt. Etiketten er teksten på bildet.",
  conditionIntro: "En tilstand som må holde. Etiketten er teksten på bildet.",
  gateIntro:
    "Gå, gå om, eller stopp. Navngi den som beslutningen — etiketten sitter under stjernen. Dra langs feltet for å plassere den i en fase, eller i sømmen etter. Hold over feltet og klikk + for å legge til en til.",
  dependencyIntro: (from, to) =>
    `${from} må være sant eller ferdig før ${to}.`,
  pickerTitle: "Start fra et eksempel",
  pickerIntro: "Et tomt bilde, eller et utfylt eksempel.",
  pickerIntroReplace:
    "Et tomt bilde, eller et utfylt eksempel. Det du har nå beholdes — Angre, eller Fil → Gjenopprett forrige.",
  tplEmpty: "Tom",
  tplSample: "Eksempel",
  tplBlank: "Tom",
  tplBlankBlurb: "Tre faser, to arbeidsstrømmer, beslutninger klare til å navngis.",
  tplProject: "Tjeneste i produksjon",
  tplProjectBlurb:
    "Oppdag → Avklar → Bygg og test → Lansér, med milepæler, betingelser og avhengigheter.",
  tplCampaign: "Kampanje",
  tplCampaignBlurb:
    "Form → Avskrekk → Ta initiativ → Dominere, med betingelser på tvers av arbeidsstrømmer.",
  tplEpic: "Operation Epic Fury",
  tplEpicBlurb:
    "Form → Ta initiativ → Dominere → Tving og avslutt → Hindre gjenoppbygging. Seks innsatsområder, porter og støttenotater.",
  llmTitle: "Spør en LLM om et bilde",
  llmIntro:
    "Gi en språkmodell ledeteksten og eksempelfilen, og beskriv prosjektet i vanlig språk. Lagre JSON-filen den returnerer og åpne den her med Fil → Åpne JSON.",
  llmStep1: "Kopier ledeteksten (den inneholder eksempelet).",
  llmStep2:
    "Lim den inn i ChatGPT, Claude eller tilsvarende. Legg ved eksempelfilen hvis modellen tar filer.",
  llmStep3: "Beskriv arbeidet: utfall, faser, parallelle strømmer, beslutninger.",
  llmStep4: "Lagre svaret som en .json-fil. Fil → Åpne JSON.",
  copyPrompt: "Kopier ledetekst",
  copied: "Kopiert",
  downloadSample: "Last ned eksempel-JSON",
  helpTitle: "Slik bildet virker",
  helpIntro:
    "Operasjonelt design er en måte å se hvordan parallelt arbeid gir et ønsket utfall. Samme geometri for en tjenestelansering, en omstilling eller en kampanje.",
  helpEndState:
    "Panelet til høyre. Hver arbeidsstrøm leser inn i det. Navnet er overskriften; det som skal være sant står under — ikke en dato. Fargen er en lasur du kan endre i inspektøren. Sluttilstand per arbeidsstrøm (brikker til høyre på hver linje) er valgfritt — Av/På i inspektøren. Slå dem av, så går linjene inn i kampanjepanelet; teksten beholdes.",
  helpPhases: "Stadier, fra venstre mot høyre. Oppdag, avklar, bygg, lansér — eller dine egne.",
  helpWorkstreams:
    "Parallelt arbeid organisert etter formål. Navngi strømmen, deretter jobben den gjør i én linje. Med sluttilstand per arbeidsstrøm på, klikk strømmen (eller brikken i enden av linjen) for å sette sluttilstanden.",
  helpMilestone:
    "En hendelse eller et leveransepunkt. Den skjedde, eller den skjedde ikke. Valgfri beskrivelse sitter i detaljlisten under bildet, ikke på figuren.",
  helpCondition:
    "En tilstand som må holde. Finansiering er bundet. Brukerne er klare. Valgfri beskrivelse sitter i detaljlisten under bildet.",
  helpGate:
    "En beslutning: fortsett, gå om, eller stopp. Plasser den i en fase, eller i sømmen etter. Navngi den som beslutningen, ikke «Port 1». Valgfri beskrivelse sitter i detaljlisten under bildet.",
  helpHow:
    "Hold over en arbeidsstrøm i en fase og klikk +, eller klikk en tom celle, for å legge til en milepæl eller betingelse — den lander der du klikker (tidlig, midt eller sent). I en travel celle sitter + til høyre så den ikke dekker figurene. Milepæl-/betingelse-brikkene sitter foran eksisterende merker; klikk et annet sted eller trykk Escape for å lukke dem. Hold over portfeltet og klikk + for å legge til en beslutning. Dra noder langs en arbeidsstrøm for å sitte tidlig, midt eller sent i en fase; slipp i høyre kant for å utvide fasen. Dra en port langs feltet for å plassere den i en fase eller etter den. Bruk + for å legge til en fase eller arbeidsstrøm. Klikk en milepæl eller betingelse for å se koblingene. Tittel, formål og etiketter brytes — bildet vokser i stedet for å klippes. Koble, deretter klikk A så B — B sitter til høyre for A. Første gang velger du et eksempel. Fil → Ny… er den dialogen på nytt. Fil → Spør en LLM… kopierer en ledetekst og eksempel-JSON; Fil → Åpne JSON laster filen den returnerer. Fil → Eksporter PowerPoint lager en 16:9-brief: veggen, deretter ett lys per fase fra fasefiguren (ikke et utsnitt). Bildet skalerer til å passe; typen skalerer med. Hvis detaljfiguren er på, følger notater for den fasen. Lange beskrivelser fortsetter på ekstra lys i stedet for å krympes. PNG og SVG følger samme bryter: listen sitter under bildet. Fil → Eksporter sider… lager en zip med PNG-er til Word/A4 — veggen, deretter ett omlagt bilde av hver fase (samme som fasefiguren). Hvis detaljfiguren er på, følger notatsider i samme zip. Beslutningsporter listes som et kampanjebånd, ikke som en arbeidsstrøm. Avhengighetskoblinger er bøyde PowerPoint-koblinger limt til sidene av figurene. Etikettene er teksten på bildet. Sluttilstand per arbeidsstrøm er valgfritt (Av/På i inspektøren). Når de er på, kan hver arbeidsstrøm bære en sluttilstand til høyre på linjen. Kampanjens sluttilstandsnavn og vilkårene som må holde sitter på panelet. Fasefigur Av/På under veggen viser én fase med fulle etiketter; arbeidsstrømbrikker og sluttilstandsbrytere endrer bare den visningen. Detalj Av/På under det kan liste beslutningsporter (kampanjenivå) og hver arbeidsstrøms milepæler og betingelser, med valgfrie beskrivelser.",
  helpPersist:
    "Bildet blir i denne nettleseren når du går. Angre/Gjør om dekker denne fanen, også ved oppdatering. Fil → Gjenopprett forrige henter tilbake det Ny eller Åpne JSON erstattet.",
  notesBriefing: "OPSDesign-briefnotater — tegnes ikke på lysbildet.",
  notesDelete:
    "Slett disse notatene før du deler filen hvis de ikke skal ligge på dekket.",
  notesPurpose: "Formål",
  notesLoeEnds: "Sluttilstand per arbeidsstrøm",
  notesDetailFollows: "Detalj følger på de neste 16:9-lysene.",
  notesSubtitle: "Beslutningsporter, milepæler og betingelser",
  notesSubtitleCont: "Beslutningsporter, milepæler og betingelser (fortsettelse)",
  phaseN: (n) => `Fase ${n}`,
  workstreamN: (n) => `Arbeidsstrøm ${n}`,
  decisionN: (n) => `Beslutning ${n}`,
  inPhaseMeta: (name) => `I ${name}`.trim(),
  afterPhaseMeta: (name) => `Etter ${name}`.trim(),
  notesPage: (phase) => `${phase} — notater`,
};

const DICT: Record<Lang, Copy> = { en, nb };

let current: Lang = "en";

export function loadLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === "en" || stored === "nb") return stored;
  } catch {
    /* ignore */
  }
  return "en";
}

export function applyLang(lang: Lang): void {
  current = lang;
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
  }
}

export function persistLang(lang: Lang): void {
  applyLang(lang);
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* ignore */
  }
}

export function copy(lang: Lang = current): Copy {
  return DICT[lang] ?? DICT.en;
}

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Copy;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const initial = loadLang();
    applyLang(initial);
    return initial;
  });

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    persistLang(next);
  }, []);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: copy(lang),
    }),
    [lang, setLang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
