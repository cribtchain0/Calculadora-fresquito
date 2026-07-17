import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // El puerto puede venir del entorno (p. ej. la vista previa de Claude Code)
    port: Number(process.env.PORT) || 5173,
  },
});
