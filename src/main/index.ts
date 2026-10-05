import { BrowserWindow, app, ipcMain } from "electron";
import { SET_EDIT_MENU } from "../shared/editMenu";
import { ipcPage } from "./agent/ipcPage";
import { listenAgent } from "./agent/listen";
import { agentServer } from "./agent/server";
import { connectClipboard } from "./clipboard";
import { setEditMenu } from "./editMenu";
import { connectExports } from "./exports";
import { connectFiles } from "./files";
import { connectMedia } from "./media";
import { PAGE_PREFERENCES, editorWindows, loadRenderer } from "./rendererPage";

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
		webPreferences: PAGE_PREFERENCES,
	});
	window.once("ready-to-show", () => {
		window.show();
	});
	loadRenderer(window, "");
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
	connectMedia();
	connectExports();
	listenAgent(agentServer(ipcPage(), null));
	createWindow();
});

app.on("activate", () => {
	if (editorWindows().length === 0) {
		createWindow();
	}
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
