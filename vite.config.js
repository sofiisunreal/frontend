import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { headers: { "Referrer-Policy": "no-referrer-when-downgrade", "Cross-Origin-Opener-Policy": "same-origin-allow-popups" } },
});
