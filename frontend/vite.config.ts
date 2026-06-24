import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  server: {
    proxy: {
      // Em dev, encaminha /api para o backend, evitando CORS no navegador.
      "/api": "http://localhost:4000",
    },
  },
  plugins: [react()],
});
