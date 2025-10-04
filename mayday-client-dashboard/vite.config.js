import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // Port for the dashboard dev server
    // Optional: Proxy API requests to the backend during development
    // proxy: {
    //   '/api': 'http://localhost:3001', // Assuming backend runs on 3001
    //   '/ws': {
    //      target: 'ws://localhost:3001', // Proxy websockets
    //      ws: true,
    //    },
    // },
  },
});
