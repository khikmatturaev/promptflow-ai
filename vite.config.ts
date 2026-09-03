import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const webMCPHeaders = {
  // WebMCP requires an origin-isolated document. Keep this explicit in both
  // development and preview so the browser does not silently hide modelContext.
  'Origin-Agent-Cluster': '?1',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  // WebMCP's Permissions Policy defaults to self, but declaring it explicitly
  // makes the capability intentional and resilient to hosting-header changes.
  'Permissions-Policy': 'tools=(self)',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    headers: webMCPHeaders,
  },
  preview: {
    headers: webMCPHeaders,
  },
});
