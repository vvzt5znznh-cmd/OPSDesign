import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative so the app works at https://<user>.github.io/OPSDesign/
  // and still works in local preview.
  base: "./",
  server: {
    host: true,
    port: 5173,
  },
});
