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
			// electron-vite deep-clones the config and throws on the plugin object unless it is awaited.
			// https://github.com/alex8088/electron-vite/issues/902
			await babel({
				include: "**/*.tsx",
				presets: [reactCompilerPreset()],
			}),
			react(),
		],
		// Pre-bundling corrupts Loro's WebAssembly startup: the renderer dies with
		// "Cannot read properties of undefined (reading 'memory')" before first paint.
		optimizeDeps: { exclude: ["loro-crdt"] },
		build: {
			rolldownOptions: { input: { index: "index.html" } },
		},
	},
});
