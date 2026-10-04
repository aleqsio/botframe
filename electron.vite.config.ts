import { defineConfig } from "electron-vite";
import { renderer } from "./vite.config";

export default defineConfig({
	main: {
		build: {
			rolldownOptions: { input: { index: "src/main/index.ts" } },
		},
	},
	preload: {
		build: {
			rolldownOptions: {
				input: { index: "src/preload/index.ts" },
				// A sandboxed preload script must be CommonJS.
				// https://www.electronjs.org/docs/latest/tutorial/esm#preload-scripts
				output: { format: "cjs", entryFileNames: "[name].cjs" },
			},
		},
	},
	renderer: {
		...renderer,
		build: {
			rolldownOptions: { input: { index: "index.html" } },
		},
	},
});
