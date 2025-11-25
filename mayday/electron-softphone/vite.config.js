import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    base: process.env.NODE_ENV === "production" ? "./" : "/",
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
      "process.env.VITE_API_URL": JSON.stringify(
        process.env.NODE_ENV === "development"
          ? "http://localhost:8004"
          : "https://cs.brhgroup.co"
      ),
      "process.env.VITE_WEBSOCKET_URL": JSON.stringify(
        process.env.NODE_ENV === "development"
          ? "http://localhost:8004"
          : "https://cs.brhgroup.co"
      ),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      extensions: [".js", ".jsx"],
    },
    esbuild: {
      loader: "jsx",
      include: /src\/.*\.jsx?$/,
      exclude: [],
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          ".js": "jsx",
        },
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: true,
      assetsDir: "assets",
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, "index.html"),
        },
        output: {
          assetFileNames: (assetInfo) => {
            if (assetInfo.name.endsWith(".mp3")) {
              return "assets/sounds/[name][extname]";
            }
            return "assets/[name]-[hash][extname]";
          },
        },
      },
    },
    server: {
      port: 8004,
      strictPort: true,
      proxy: {
        "/api": {
          target: "http://localhost:8004",
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        "/socket.io": {
          target: "http://localhost:8004",
          changeOrigin: true,
          ws: true,
        },
        "/ws": {
          target: "ws://3.111.43.161:8088/ws",
          ws: true,
          secure: false,
          changeOrigin: true,
        },
        "/api/whatsapp": {
          target: "http://localhost:8004",
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
