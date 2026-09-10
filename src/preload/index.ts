import { contextBridge, ipcRenderer } from "electron";
import { HAS_CLIPBOARD_LAYERS, READ_CLIPBOARD_LAYERS, WRITE_CLIPBOARD } from "../shared/clipboard";
import type { ClipboardWrite } from "../shared/clipboard";
import { EDIT_COMMAND, SET_EDIT_MENU } from "../shared/editMenu";
import type { EditMenuItem } from "../shared/editMenu";

async function invoke(channel: string, ...args: readonly unknown[]): Promise<unknown> {
	const value: unknown = await ipcRenderer.invoke(channel, ...args);
	return value;
}

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
	async writeClipboard(write: ClipboardWrite): Promise<void> {
		await invoke(WRITE_CLIPBOARD, write);
	},
	async readClipboardLayers(): Promise<string | null> {
		const value = await invoke(READ_CLIPBOARD_LAYERS);
		return typeof value === "string" ? value : null;
	},
	async hasClipboardLayers(): Promise<boolean> {
		return (await invoke(HAS_CLIPBOARD_LAYERS)) === true;
	},
});
