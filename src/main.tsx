import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { loadDesign } from "./storage";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App initial={loadDesign()} />
  </StrictMode>,
);
