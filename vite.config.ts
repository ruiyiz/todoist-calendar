import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  // Bound to localhost; reach it over the tailnet via `tailscale serve`.
  server: { host: "127.0.0.1", port: 3000, allowedHosts: [".ts.net"] },
  plugins: [tanstackStart(), viteReact()],
});
