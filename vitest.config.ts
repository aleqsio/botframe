import { defineConfig } from "vitest/config";

export default defineConfig({
	assetsInclude: ["**/*.botframe"],
	test: {
		include: ["src/**/*.test.{ts,tsx}"],
		passWithNoTests: true,
		css: true,
	},
});
