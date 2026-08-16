import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { reduceDesign, selectionAfter, type DesignAction } from "./reducer";
import { loadSession, saveDesign, saveSession } from "./storage";
import type { OperationalDesign, Selection } from "./types";

interface DesignContextValue {
  design: OperationalDesign;
  selection: Selection;
  setSelection: (s: Selection) => void;
  dispatch: (action: DesignAction) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  present: boolean;
  setPresent: (v: boolean) => void;
  linkMode: boolean;
  setLinkMode: (v: boolean) => void;
  linkFrom: string | null;
  setLinkFrom: (id: string | null) => void;
}

const DesignContext = createContext<DesignContextValue | null>(null);

export function DesignProvider({
  initial,
  children,
}: {
  initial: OperationalDesign;
  children: ReactNode;
}) {
  const [design, setDesign] = useState(initial);
  const [selection, setSelection] = useState<Selection>(null);
  const [present, setPresent] = useState(false);
  const [canUndo, setCanUndo] = useState(() => loadSession().undo.length > 0);
  const [canRedo, setCanRedo] = useState(() => loadSession().redo.length > 0);
  const [linkMode, setLinkModeState] = useState(false);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const undoStack = useRef<OperationalDesign[]>([]);
  const redoStack = useRef<OperationalDesign[]>([]);
  const hydrated = useRef(false);
  if (!hydrated.current) {
    const session = loadSession();
    undoStack.current = session.undo;
    redoStack.current = session.redo;
    hydrated.current = true;
  }

  const persistStacks = useCallback(() => {
    saveSession(undoStack.current, redoStack.current);
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
  }, []);

  const setLinkMode = useCallback((v: boolean) => {
    setLinkModeState(v);
    if (!v) setLinkFrom(null);
  }, []);

  const dispatch = useCallback((action: DesignAction) => {
    setDesign((current) => {
      const next = reduceDesign(current, action);
      if (next === current) return current;
      undoStack.current.push(current);
      if (undoStack.current.length > 80) undoStack.current.shift();
      redoStack.current = [];
      persistStacks();
      saveDesign(next);
      setSelection((sel) => selectionAfter(next, sel));
      return next;
    });
  }, [persistStacks]);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    setDesign((current) => {
      redoStack.current.push(current);
      persistStacks();
      saveDesign(prev);
      setSelection((sel) => selectionAfter(prev, sel));
      return prev;
    });
  }, [persistStacks]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    setDesign((current) => {
      undoStack.current.push(current);
      persistStacks();
      saveDesign(next);
      setSelection((sel) => selectionAfter(next, sel));
      return next;
    });
  }, [persistStacks]);

  const value = useMemo(
    () => ({
      design,
      selection,
      setSelection,
      dispatch,
      undo,
      redo,
      canUndo,
      canRedo,
      present,
      setPresent,
      linkMode,
      setLinkMode,
      linkFrom,
      setLinkFrom,
    }),
    [
      design,
      selection,
      dispatch,
      undo,
      redo,
      canUndo,
      canRedo,
      present,
      linkMode,
      setLinkMode,
      linkFrom,
    ],
  );

  return (
    <DesignContext.Provider value={value}>{children}</DesignContext.Provider>
  );
}

export function useDesign() {
  const ctx = useContext(DesignContext);
  if (!ctx) throw new Error("useDesign must be used within DesignProvider");
  return ctx;
}
