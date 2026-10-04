import { constants } from "node:fs";
import { copyFile, link, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { BrowserWindow, dialog, ipcMain } from "electron";
import type { IpcMainInvokeEvent } from "electron";
import {
	FILE_EXTENSION,
	FILE_NAME,
	OPEN_FILE,
	RENAME_FILE,
	SAVE_FILE,
	UNTITLED,
} from "../shared/file";
import type { OpenedFile, SavedFile } from "../shared/file";
import { loadPaths, pathOf, setPath, tokenOf } from "./filePaths";

const FILTERS = [{ name: "botframe", extensions: [FILE_EXTENSION] }];
const SAVE_FAILED = "The file was not saved";
const OPEN_FAILED = "The file was not opened";
const RENAME_FAILED = "The file was not renamed";
const DOT_EXTENSION = `.${FILE_EXTENSION}`;

function withExtension(path: string): string {
	return path.endsWith(DOT_EXTENSION) ? path : `${path}${DOT_EXTENSION}`;
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

async function chooseSavePath(window: BrowserWindow, defaultPath: string): Promise<string | null> {
	const result = await dialog.showSaveDialog(window, { filters: FILTERS, defaultPath });
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

interface SaveRequest {
	token: unknown;
	name: unknown;
	saveAs: unknown;
}

async function saveFile(
	event: IpcMainInvokeEvent,
	bytes: unknown,
	{ token, name, saveAs }: SaveRequest,
): Promise<SavedFile | null> {
	const window = BrowserWindow.fromWebContents(event.sender);
	if (!(bytes instanceof Uint8Array) || window === null) {
		return null;
	}
	const current = pathOf(token);
	const path =
		saveAs === true || current === undefined
			? await chooseSavePath(window, current ?? withExtension(isFileName(name) ? name : UNTITLED))
			: current;
	if (path === null || !(await writeTo(path, bytes))) {
		return null;
	}
	return savedFile(path);
}

function isFileName(name: unknown): name is string {
	return typeof name === "string" && FILE_NAME.test(name);
}

function codeOf(error: unknown): unknown {
	return error instanceof Error && "code" in error ? error.code : null;
}

async function isSameFile(current: string, target: string): Promise<boolean> {
	try {
		const [one, two] = await Promise.all([stat(current), stat(target)]);
		return one.ino === two.ino && one.dev === two.dev;
	} catch {
		return true;
	}
}

async function place(current: string, target: string): Promise<void> {
	try {
		await link(current, target);
	} catch (error) {
		if (codeOf(error) === "EEXIST") {
			throw error;
		}
		await copyFile(current, target, constants.COPYFILE_EXCL);
	}
}

async function move(current: string, target: string): Promise<void> {
	if (current.toLowerCase() === target.toLowerCase()) {
		if (!(await isSameFile(current, target))) {
			throw Object.assign(new Error(target), { code: "EEXIST" });
		}
		await rename(current, target);
		return;
	}
	await place(current, target);
	await unlink(current);
}

async function moveTo(current: string, target: string): Promise<boolean> {
	try {
		await move(current, target);
		return true;
	} catch (error) {
		const taken = codeOf(error) === "EEXIST";
		const reason = taken ? `${basename(target)} is already in the folder.` : String(error);
		dialog.showErrorBox(RENAME_FAILED, reason);
		return false;
	}
}

async function renameFile(token: unknown, name: unknown): Promise<SavedFile | null> {
	const current = pathOf(token);
	if (typeof token !== "string" || current === undefined || !isFileName(name)) {
		return null;
	}
	const target = join(dirname(current), withExtension(name));
	if (target !== current && !(await moveTo(current, target))) {
		return null;
	}
	setPath(token, target);
	return { token, name: basename(target, DOT_EXTENSION) };
}

export function connectFiles(): void {
	const pathsLoaded = loadPaths();
	ipcMain.handle(OPEN_FILE, async (event) => {
		await pathsLoaded;
		return openFile(event);
	});
	ipcMain.handle(SAVE_FILE, async (event, ...args: unknown[]) => {
		await pathsLoaded;
		return saveFile(event, args[0], { token: args[1], name: args[2], saveAs: args[3] });
	});
	ipcMain.handle(RENAME_FILE, async (_event, ...args: unknown[]) => {
		await pathsLoaded;
		return renameFile(args[0], args[1]);
	});
}
