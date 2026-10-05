import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["src/**/*.test.{ts,tsx}", "e2e/**/*.unit.test.ts"],
		passWithNoTests: true,
		css: true,
	},
});
