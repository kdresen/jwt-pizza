import { defineConfig } from "vite";
import istanbul from "vite-plugin-istanbul";

export default defineConfig({
  server: { port: 5173, strictPort: true },
  build: { sourcemap: true },
  plugins: [
    istanbul({
      include: ["src/**/*"],
      exclude: ["node_modules"],
      requireEnv: false,
    }),
  ],
});
