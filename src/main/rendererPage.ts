import { join } from "node:path";
import { BrowserWindow } from "electron";
import type { WebPreferences } from "electron";

export const PAGE_PREFERENCES: WebPreferences = {
	preload: join(import.meta.dirname, "../preload/index.cjs"),
	contextIsolation: true,
	nodeIntegration: false,
	sandbox: true,
	backgroundThrottling: false,
};

export function loadRenderer(window: BrowserWindow, hash: string): void {
	const devServerUrl = process.env["ELECTRON_RENDERER_URL"];
	if (devServerUrl === undefined) {
		void window.loadFile(join(import.meta.dirname, "../renderer/index.html"), { hash });
		return;
	}
	void window.loadURL(hash === "" ? devServerUrl : `${devServerUrl}#${hash}`);
}

export function editorWindows(): readonly BrowserWindow[] {
	return BrowserWindow.getAllWindows().filter((window) => !window.webContents.isOffscreen());
}
