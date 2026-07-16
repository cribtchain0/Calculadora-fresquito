import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // En desarrollo, las llamadas a /api van al backend en :3001
      "/api": "http://localhost:3001",
    },
  },
});
