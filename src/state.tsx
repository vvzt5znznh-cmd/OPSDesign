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
import { saveDesign } from "./storage";
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
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const undoStack = useRef<OperationalDesign[]>([]);
  const redoStack = useRef<OperationalDesign[]>([]);

  const dispatch = useCallback((action: DesignAction) => {
    setDesign((current) => {
      const next = reduceDesign(current, action);
      if (next === current) return current;
      undoStack.current.push(current);
      if (undoStack.current.length > 80) undoStack.current.shift();
      redoStack.current = [];
      setCanUndo(true);
      setCanRedo(false);
      saveDesign(next);
      setSelection((sel) => selectionAfter(next, sel));
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    setDesign((current) => {
      redoStack.current.push(current);
      setCanUndo(undoStack.current.length > 0);
      setCanRedo(true);
      saveDesign(prev);
      setSelection((sel) => selectionAfter(prev, sel));
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    setDesign((current) => {
      undoStack.current.push(current);
      setCanUndo(true);
      setCanRedo(redoStack.current.length > 0);
      saveDesign(next);
      setSelection((sel) => selectionAfter(next, sel));
      return next;
    });
  }, []);

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
    }),
    [design, selection, dispatch, undo, redo, canUndo, canRedo, present],
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
