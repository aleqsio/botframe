import { contextBridge, ipcRenderer } from "electron";
import { AGENT_CALL, AGENT_REPLY } from "../shared/agent";
import { HAS_CLIPBOARD_LAYERS, READ_CLIPBOARD_LAYERS, WRITE_CLIPBOARD } from "../shared/clipboard";
import type { ClipboardWrite } from "../shared/clipboard";
import { EDIT_COMMAND, SET_EDIT_MENU } from "../shared/editMenu";
import type { EditMenuItem } from "../shared/editMenu";
import { OPEN_FILE, RENAME_FILE, SAVE_FILE } from "../shared/file";
import type { OpenedFile, SavedFile } from "../shared/file";

async function invoke(channel: string, ...args: readonly unknown[]): Promise<unknown> {
	const value: unknown = await ipcRenderer.invoke(channel, ...args);
	return value;
}

function fieldsOf(value: unknown): Partial<Record<keyof OpenedFile, unknown>> | null {
	return typeof value === "object" && value !== null ? value : null;
}

function savedFile(value: unknown): SavedFile | null {
	const file = fieldsOf(value);
	return typeof file?.token === "string" && typeof file.name === "string"
		? { token: file.token, name: file.name }
		: null;
}

function openedFile(value: unknown): OpenedFile | null {
	const file = savedFile(value);
	const bytes = fieldsOf(value)?.bytes;
	return file !== null && bytes instanceof Uint8Array ? { ...file, bytes } : null;
}

async function answer(run: (call: unknown) => Promise<unknown>, call: unknown): Promise<void> {
	ipcRenderer.send(AGENT_REPLY, await run(call));
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
	async openFile(): Promise<OpenedFile | null> {
		return openedFile(await invoke(OPEN_FILE));
	},
	async saveFile(
		bytes: Uint8Array,
		token: string | null,
		name: string,
		saveAs: boolean,
	): Promise<SavedFile | null> {
		return savedFile(await invoke(SAVE_FILE, bytes, token, name, saveAs));
	},
	async renameFile(token: string, name: string): Promise<SavedFile | null> {
		return savedFile(await invoke(RENAME_FILE, token, name));
	},
	serveAgent(run: (call: unknown) => Promise<unknown>): void {
		ipcRenderer.on(AGENT_CALL, (_event, ...args: unknown[]) => {
			void answer(run, args[0]);
		});
	},
});
