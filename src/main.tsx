import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { loadDesign } from "./storage";
import { applyTheme, loadTheme, ThemeProvider } from "./theme";
import "./index.css";

applyTheme(loadTheme());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App initial={loadDesign()} />
    </ThemeProvider>
  </StrictMode>,
);
