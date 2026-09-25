import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { BrowserWindow, dialog, ipcMain } from "electron";
import type { IpcMainInvokeEvent } from "electron";
import { FILE_EXTENSION, OPEN_FILE, SAVE_FILE, UNTITLED } from "../shared/file";
import type { OpenedFile, SavedFile } from "../shared/file";

const FILTERS = [{ name: "botframe", extensions: [FILE_EXTENSION] }];
const SAVE_FAILED = "The file was not saved";
const OPEN_FAILED = "The file was not opened";
const DOT_EXTENSION = `.${FILE_EXTENSION}`;

const paths = new Map<string, string>();

function withExtension(path: string): string {
	return path.endsWith(DOT_EXTENSION) ? path : `${path}${DOT_EXTENSION}`;
}

function tokenOf(path: string): string {
	for (const [token, held] of paths) {
		if (held === path) {
			return token;
		}
	}
	const token = randomUUID();
	paths.set(token, path);
	return token;
}

function savedFile(path: string): SavedFile {
	return { token: tokenOf(path), name: basename(path, DOT_EXTENSION) };
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
		defaultPath: current ?? `${UNTITLED}${DOT_EXTENSION}`,
	});
	return result.canceled || result.filePath === "" ? null : withExtension(result.filePath);
}

async function readFrom(path: string): Promise<Uint8Array | null> {
	try {
		return new Uint8Array(await readFile(path));
	} catch (error) {
		dialog.showErrorBox(OPEN_FAILED, String(error));
		return null;
	}
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

async function openFile(event: IpcMainInvokeEvent): Promise<OpenedFile | null> {
	const window = BrowserWindow.fromWebContents(event.sender);
	const path = window === null ? null : await chooseOpenPath(window);
	const bytes = path === null ? null : await readFrom(path);
	return path === null || bytes === null ? null : { ...savedFile(path), bytes };
}

async function saveFile(
	event: IpcMainInvokeEvent,
	bytes: unknown,
	token: unknown,
	saveAs: unknown,
): Promise<SavedFile | null> {
	const window = BrowserWindow.fromWebContents(event.sender);
	if (!(bytes instanceof Uint8Array) || window === null) {
		return null;
	}
	const current = typeof token === "string" ? paths.get(token) : undefined;
	const path =
		saveAs === true || current === undefined ? await chooseSavePath(window, current) : current;
	if (path === null || !(await writeTo(path, bytes))) {
		return null;
	}
	return savedFile(path);
}

export function connectFiles(): void {
	ipcMain.handle(OPEN_FILE, (event) => openFile(event));
	ipcMain.handle(SAVE_FILE, (event, ...args: unknown[]) =>
		saveFile(event, args[0], args[1], args[2]),
	);
}
