import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts", "packages/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
  resolve: {
    alias: {
      "@haodai/action-contracts": path.resolve(
        __dirname,
        "packages/action-contracts/src/index.ts",
      ),
      "@haodai/line-events": path.resolve(
        __dirname,
        "packages/line-events/src/index.ts",
      ),
      "@haodai/domain": path.resolve(__dirname, "packages/domain/src/index.ts"),
      "@haodai/test-fixtures": path.resolve(
        __dirname,
        "packages/test-fixtures/src/index.ts",
      ),
    },
  },
});
