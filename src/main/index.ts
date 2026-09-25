import { join } from "node:path";
import { BrowserWindow, app, ipcMain } from "electron";
import { SET_EDIT_MENU } from "../shared/editMenu";
import { connectClipboard } from "./clipboard";
import { setEditMenu } from "./editMenu";
import { connectFiles } from "./files";

function createWindow(): void {
	const window = new BrowserWindow({
		width: 1200,
		height: 800,
		show: false,
		titleBarStyle: "hiddenInset",
		trafficLightPosition: { x: 22, y: 20 },
		backgroundColor: "#00000000",
		vibrancy: "under-window",
		visualEffectState: "active",
		webPreferences: {
			preload: join(import.meta.dirname, "../preload/index.cjs"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
			backgroundThrottling: false,
		},
	});
	window.once("ready-to-show", () => {
		window.show();
	});
	const devServerUrl = process.env["ELECTRON_RENDERER_URL"];
	if (devServerUrl === undefined) {
		void window.loadFile(join(import.meta.dirname, "../renderer/index.html"));
		return;
	}
	void window.loadURL(devServerUrl);
}

ipcMain.on(SET_EDIT_MENU, (event, ...args: unknown[]) => {
	const window = BrowserWindow.fromWebContents(event.sender);
	if (window !== null) {
		setEditMenu(args[0], window);
	}
});

app.on("ready", () => {
	connectClipboard();
	connectFiles();
	createWindow();
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
