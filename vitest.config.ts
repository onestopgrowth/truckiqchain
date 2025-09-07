import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.{test,spec}.ts"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
