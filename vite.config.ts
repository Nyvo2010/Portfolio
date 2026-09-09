import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const configuredBase = process.env.VITE_BASE_PATH;

export default defineConfig({
  base: configuredBase ? `/${configuredBase.replace(/^\/+|\/+$/g, "")}/` : "/",
  plugins: [react(), tailwindcss()],
});
