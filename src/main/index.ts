import { join } from "node:path";
import { BrowserWindow, app } from "electron";

function createWindow(): void {
	const window = new BrowserWindow({
		width: 1200,
		height: 800,
		show: false,
		titleBarStyle: "hiddenInset",
		trafficLightPosition: { x: 11, y: 11 },
		backgroundColor: "#00000000",
		vibrancy: "under-window",
		visualEffectState: "active",
		webPreferences: {
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

app.on("ready", () => {
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
