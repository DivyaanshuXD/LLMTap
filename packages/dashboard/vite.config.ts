import path from "node:path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/v1': 'http://localhost:4781',
      '/health': 'http://localhost:4781',
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          if (id.includes("framer-motion")) {
            return "motion";
          }

          if (id.includes("@tanstack/react-query") || id.includes("@tanstack/react-table")) {
            return "query";
          }

          if (id.includes("@radix-ui") || id.includes("cmdk")) {
            return "ui";
          }

          if (id.includes("lucide-react")) {
            return "icons";
          }

          return undefined;
        },
      },
    },
  },
})
