import { type RefObject } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Diagram } from "./Diagram";
import { LanguageProvider } from "./i18n";
import type { LayoutOptions } from "./layout";
import { DesignProvider } from "./state";
import { ThemeProvider, type DiagramPalette } from "./theme";
import type { OperationalDesign } from "./types";

export function serializePictureSvg(svg: SVGSVGElement): {
  xml: string;
  width: number;
  height: number;
} {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll("[data-ui='true']").forEach((el) => el.remove());
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clone.removeAttribute("id");
  const width = Number(clone.getAttribute("width")) || 1200;
  const height = Number(clone.getAttribute("height")) || 700;
  return {
    xml: new XMLSerializer().serializeToString(clone),
    width,
    height,
  };
}

/** Mount a read-only phase picture off-screen so export matches the on-screen figure. */
export function renderPhaseViewSvg(
  picture: OperationalDesign,
  layoutOptions: LayoutOptions = {},
  palette?: DiagramPalette,
): { xml: string; width: number; height: number } {
  if (typeof document === "undefined") {
    throw new Error("Phase pictures can only be exported in the browser.");
  }
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-20000px;top:0;pointer-events:none;opacity:0;";
  document.body.appendChild(host);
  const svgRef: RefObject<SVGSVGElement | null> = { current: null };
  const root = createRoot(host);
  try {
    flushSync(() => {
      root.render(
        <ThemeProvider>
          <LanguageProvider>
            <DesignProvider initial={picture} persist={false}>
              <Diagram
                svgRef={svgRef}
                picture={picture}
                readOnly
                layoutOptions={layoutOptions}
                palette={palette}
              />
            </DesignProvider>
          </LanguageProvider>
        </ThemeProvider>,
      );
    });
    const svg = svgRef.current;
    if (!svg) throw new Error("Could not render the phase picture.");
    return serializePictureSvg(svg);
  } finally {
    root.unmount();
    host.remove();
  }
}
