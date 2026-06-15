import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  server: {
    port: 5173,
  },
  plugins: [react()],
  // amazon-cognito-identity-js pulls in the `buffer` polyfill, which references
  // the Node `global` at module-eval time. Map it to `globalThis` so the bundle
  // runs in the browser (otherwise the whole app crashes on boot).
  define: {
    global: "globalThis",
  },
});
