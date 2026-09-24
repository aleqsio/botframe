import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { BrowserWindow, dialog, ipcMain, webContents } from "electron";
import type { IpcMainInvokeEvent, WebContents } from "electron";
import {
	FILE_EXTENSION,
	FORGET_FILE,
	LOAD_FILE,
	OPEN_FILE,
	SAVE_FILE,
	UNTITLED,
} from "../shared/file";
import type { OpenedFile } from "../shared/file";

const FILTERS = [{ name: "botframe", extensions: [FILE_EXTENSION] }];
const SAVE_FAILED = "The file was not saved";
const OPEN_FAILED = "The file was not opened";
const DOT_EXTENSION = `.${FILE_EXTENSION}`;

const paths = new Map<number, string>();

function nameOf(path: string): string {
	return basename(path, DOT_EXTENSION);
}

function withExtension(path: string): string {
	return path.endsWith(DOT_EXTENSION) ? path : `${path}${DOT_EXTENSION}`;
}

function windowWith(path: string): BrowserWindow | null {
	const id = [...paths].find(([, held]) => held === path)?.[0];
	const contents = id === undefined ? undefined : webContents.fromId(id);
	return contents === undefined ? null : BrowserWindow.fromWebContents(contents);
}

function remember(contents: WebContents, path: string): void {
	if (!paths.has(contents.id)) {
		contents.once("destroyed", () => {
			paths.delete(contents.id);
		});
	}
	paths.set(contents.id, path);
}

async function chooseOpenPath(window: BrowserWindow): Promise<string | null> {
	const result = await dialog.showOpenDialog(window, {
		filters: FILTERS,
		properties: ["openFile"],
	});
	return result.canceled ? null : (result.filePaths[0] ?? null);
}

async function chooseSavePath(
	window: BrowserWindow,
	current: string | undefined,
): Promise<string | null> {
	const result = await dialog.showSaveDialog(window, {
		filters: FILTERS,
		defaultPath: current ?? `${UNTITLED}.${FILE_EXTENSION}`,
	});
	return result.canceled || result.filePath === "" ? null : withExtension(result.filePath);
}

async function openFile(
	event: IpcMainInvokeEvent,
	pristine: unknown,
	openWindow: () => BrowserWindow,
): Promise<void> {
	const window = BrowserWindow.fromWebContents(event.sender);
	const path = window === null ? null : await chooseOpenPath(window);
	if (path === null) {
		return;
	}
	const holder = windowWith(path);
	if (holder !== null) {
		holder.focus();
		return;
	}
	if (pristine === true && !paths.has(event.sender.id)) {
		remember(event.sender, path);
		event.sender.reload();
		return;
	}
	remember(openWindow().webContents, path);
}

async function writeTo(path: string, bytes: Uint8Array): Promise<boolean> {
	try {
		await writeFile(path, bytes);
		return true;
	} catch (error) {
		dialog.showErrorBox(SAVE_FAILED, String(error));
		return false;
	}
}

async function saveFile(
	event: IpcMainInvokeEvent,
	bytes: unknown,
	saveAs: unknown,
): Promise<string | null> {
	const window = BrowserWindow.fromWebContents(event.sender);
	if (!(bytes instanceof Uint8Array) || window === null) {
		return null;
	}
	const current = paths.get(event.sender.id);
	const path =
		saveAs === true || current === undefined ? await chooseSavePath(window, current) : current;
	if (path === null || !(await writeTo(path, bytes))) {
		return null;
	}
	remember(event.sender, path);
	return nameOf(path);
}

async function loadFile(event: IpcMainInvokeEvent): Promise<OpenedFile | null> {
	const path = paths.get(event.sender.id);
	if (path === undefined) {
		return null;
	}
	try {
		return { name: nameOf(path), bytes: new Uint8Array(await readFile(path)) };
	} catch (error) {
		paths.delete(event.sender.id);
		dialog.showErrorBox(OPEN_FAILED, String(error));
		return null;
	}
}

export function connectFiles(openWindow: () => BrowserWindow): void {
	ipcMain.handle(OPEN_FILE, (event, ...args: unknown[]) => openFile(event, args[0], openWindow));
	ipcMain.handle(SAVE_FILE, (event, ...args: unknown[]) => saveFile(event, args[0], args[1]));
	ipcMain.handle(LOAD_FILE, (event) => loadFile(event));
	ipcMain.on(FORGET_FILE, (event) => {
		paths.delete(event.sender.id);
	});
}
