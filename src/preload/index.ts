import { contextBridge, ipcRenderer } from "electron";
import { EDIT_COMMAND, SET_EDIT_MENU } from "../shared/editMenu";
import type { EditMenuItem } from "../shared/editMenu";

contextBridge.exposeInMainWorld("botframe", {
	setEditMenu(items: readonly EditMenuItem[]): void {
		ipcRenderer.send(SET_EDIT_MENU, items);
	},
	onCommand(listener: (id: string) => void): void {
		ipcRenderer.on(EDIT_COMMAND, (_event, ...args: unknown[]) => {
			const [id] = args;
			if (typeof id === "string") {
				listener(id);
			}
		});
	},
});
