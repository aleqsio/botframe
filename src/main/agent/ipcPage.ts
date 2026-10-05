import { ipcMain } from "electron";
import { AGENT_CALL, AGENT_REPLY } from "../../shared/agent";
import { editorWindows } from "../rendererPage";
import { listenAgent } from "./listen";
import { Pending } from "./pending";
import { agentServer } from "./server";
import type { CallPage } from "./pending";

function ipcPage(): CallPage {
	const pending = new Pending((call) => {
		const [window] = editorWindows();
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

export function serveAgents(): void {
	listenAgent(agentServer(ipcPage(), null));
}
