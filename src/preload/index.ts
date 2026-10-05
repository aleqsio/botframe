import { contextBridge, ipcRenderer } from "electron";
import { AGENT_CALL, AGENT_REPLY } from "../shared/agent";
import { HAS_CLIPBOARD_LAYERS, READ_CLIPBOARD_LAYERS, WRITE_CLIPBOARD } from "../shared/clipboard";
import type { ClipboardWrite } from "../shared/clipboard";
import {
	CAPTURE_PAGE,
	EXPORT_DONE,
	EXPORT_READY,
	EXPORT_SCENE,
	RENDER_IMAGE,
	SAVE_IMAGES,
} from "../shared/exportImage";
import type { CaptureRect, ExportScene, ImageFile } from "../shared/exportImage";
import { EDIT_COMMAND, SET_EDIT_MENU } from "../shared/editMenu";
import type { EditMenuItem } from "../shared/editMenu";
import { OPEN_FILE, RENAME_FILE, SAVE_FILE } from "../shared/file";
import type { OpenedFile, SavedFile } from "../shared/file";
import { FETCH_MEDIA } from "../shared/media";
import type { FetchedMedia } from "../shared/media";

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

function isBytes(value: unknown): value is Uint8Array<ArrayBuffer> {
	return value instanceof Uint8Array && value.buffer instanceof ArrayBuffer;
}

function fetchedMedia(value: unknown): FetchedMedia | null {
	const media: Partial<Record<keyof FetchedMedia, unknown>> | null =
		typeof value === "object" && value !== null ? value : null;
	return typeof media?.type === "string" && isBytes(media.bytes)
		? { type: media.type, bytes: media.bytes }
		: null;
}

async function answerExport(
	run: (call: unknown) => Promise<unknown>,
	call: unknown,
): Promise<void> {
	ipcRenderer.send(EXPORT_DONE, await run(call));
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
	async fetchMedia(url: string): Promise<FetchedMedia | null> {
		return fetchedMedia(await invoke(FETCH_MEDIA, url));
	},
	async renderImage(scene: ExportScene): Promise<Uint8Array> {
		const result = await invoke(RENDER_IMAGE, scene);
		if (result instanceof Uint8Array) {
			return result;
		}
		throw new Error(typeof result === "string" ? result : "botframe did not draw the picture.");
	},
	serveExport(run: (call: unknown) => Promise<unknown>): void {
		ipcRenderer.on(EXPORT_SCENE, (_event, ...args: unknown[]) => {
			void answerExport(run, args[0]);
		});
		ipcRenderer.send(EXPORT_READY);
	},
	async capturePage(rect: CaptureRect): Promise<Uint8Array | null> {
		const bytes = await invoke(CAPTURE_PAGE, rect);
		return bytes instanceof Uint8Array ? bytes : null;
	},
	async saveImages(files: readonly ImageFile[]): Promise<number> {
		const saved = await invoke(SAVE_IMAGES, files);
		return typeof saved === "number" ? saved : 0;
	},
	serveAgent(run: (call: unknown) => Promise<unknown>): void {
		ipcRenderer.on(AGENT_CALL, (_event, ...args: unknown[]) => {
			void answer(run, args[0]);
		});
	},
});
