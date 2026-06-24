import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  optimizeDeps: {
    include: [
      "firebase/app","firebase/auth",
      "firebase/firestore","firebase/storage"
    ],
  },

  build: {
    chunkSizeWarningLimit: 600,

    // Eliminar console.log en producción (mantener warn/error para debugging)
    minify: "esbuild",
    target: "es2020",

    rollupOptions: {
      output: {
        manualChunks: {
          "firebase-core":      ["firebase/app","firebase/auth"],
          "firebase-firestore": ["firebase/firestore"],
          "firebase-storage":   ["firebase/storage"],
          "react-vendor":       ["react","react-dom","react-router-dom"],
        },
      },
    },
  },
});
