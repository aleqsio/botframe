import { defineConfig } from "electron-vite";

export default defineConfig({
	main: {
		build: {
			rolldownOptions: { input: { index: "src/main/index.ts" } },
		},
	},
	renderer: {
		root: "src/renderer",
		build: {
			rolldownOptions: { input: { index: "src/renderer/index.html" } },
		},
	},
});
