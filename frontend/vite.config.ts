import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";

function resolveProxyTarget() {
  // Highest priority: explicit override.
  if (process.env.VITE_API_PROXY_TARGET) return process.env.VITE_API_PROXY_TARGET;

  // In WSL, localhost may not reach Windows-hosted backend reliably.
  if (process.env.WSL_DISTRO_NAME) {
    try {
      const resolv = fs.readFileSync("/etc/resolv.conf", "utf8");
      const match = resolv.match(/^nameserver\s+([0-9.]+)$/m);
      if (match?.[1]) return `http://${match[1]}:18080`;
    } catch {
      // ignore and fall back
    }
  }

  // Default for native Windows/macOS/Linux dev.
  return "http://127.0.0.1:18080";
}

const proxyTarget = resolveProxyTarget();

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: proxyTarget,
        changeOrigin: true
      },
      "/actuator": {
        target: proxyTarget,
        changeOrigin: true
      }
    }
  }
});
