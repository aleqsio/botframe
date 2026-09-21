import { defineConfig } from "@playwright/test";

export default defineConfig({
	timeout: 30_000,
	fullyParallel: false,
	workers: 1,
	reporter: [["list"]],
	projects: [
		{ name: "electron", testDir: "e2e", testIgnore: "**/chromium/**" },
		{
			name: "chromium",
			testDir: "e2e/chromium",
			use: { browserName: "chromium", viewport: { width: 1280, height: 800 } },
		},
	],
});
