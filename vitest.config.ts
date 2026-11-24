import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Lets tests import "@/lib/..." the same way the app does, and render .tsx components.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
