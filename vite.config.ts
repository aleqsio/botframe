import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { join } from "node:path";
import { defineConfig } from "vite";
import type { UserConfig } from "vite";

export const renderer = {
	root: "src/renderer",
	assetsInclude: ["**/*.botframe"],
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
} satisfies UserConfig;

export default defineConfig({
	...renderer,
	base: "./",
	build: { outDir: join(import.meta.dirname, "out/web"), emptyOutDir: true },
});
