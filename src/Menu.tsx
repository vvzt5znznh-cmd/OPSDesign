import { useEffect, useRef, useState, type ReactNode } from "react";

export function Menu({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="menu" ref={ref}>
      <button
        type="button"
        className={open ? "menu-btn open" : "menu-btn"}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {label}
        <span className="caret" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="menu-pop" role="menu" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}
