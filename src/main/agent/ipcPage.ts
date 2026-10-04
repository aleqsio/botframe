import { BrowserWindow, ipcMain } from "electron";
import { AGENT_CALL, AGENT_REPLY } from "../../shared/agent";
import { Pending } from "./pending";
import type { CallPage } from "./pending";

export function ipcPage(): CallPage {
	const pending = new Pending((call) => {
		const [window] = BrowserWindow.getAllWindows();
		if (window === undefined) {
			throw new Error("No botframe window is open.");
		}
		window.webContents.send(AGENT_CALL, call);
	});
	ipcMain.on(AGENT_REPLY, (_event, ...args: unknown[]) => {
		pending.settle(args[0]);
	});
	return (tool, args) => pending.call(tool, args);
}
