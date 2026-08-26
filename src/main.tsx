import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { loadDesign } from "./storage";
import { applyTheme, loadTheme, ThemeProvider } from "./theme";
import { applyLang, loadLang, LanguageProvider } from "./i18n";
import "./index.css";

applyTheme(loadTheme());
applyLang(loadLang());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <App initial={loadDesign()} />
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
);
