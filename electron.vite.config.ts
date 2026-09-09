import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";

export default defineConfig({
	main: {
		build: {
			rolldownOptions: { input: { index: "src/main/index.ts" } },
		},
	},
	renderer: {
		root: "src/renderer",
		plugins: [
			await babel({
				include: "**/*.tsx",
				presets: [reactCompilerPreset()],
			}),
			react(),
		],
		optimizeDeps: { exclude: ["loro-crdt"] },
		build: {
			rolldownOptions: { input: { index: "index.html" } },
		},
	},
});
