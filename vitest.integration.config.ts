import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Integration tests against a running local Supabase stack (npm run db:start,
 * then npm run db:seed:fixture). They go through the public API surfaces
 * (PostgREST and GraphQL) exactly as a browser would.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
