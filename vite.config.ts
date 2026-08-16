import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Relative so the app works at https://<user>.github.io/OPSDesign/
  // and still works in local preview.
  base: "./",
  // HTML lives in src/ so the repo-root index.html can be the built Pages site.
  root: path.resolve(repoRoot, "src"),
  envDir: repoRoot,
  publicDir: path.resolve(repoRoot, "public"),
  build: {
    outDir: path.resolve(repoRoot, "dist"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 5173,
  },
});
