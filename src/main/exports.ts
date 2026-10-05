import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { BrowserWindow, app, dialog, ipcMain } from "electron";
import type { IpcMainInvokeEvent } from "electron";
import { FILE_NAME } from "../shared/file";
import { ExportWindow } from "./exportWindow";
import { uniqueNames } from "./imageNames";
import { editorWindows } from "./rendererPage";
import {
	CAPTURE_PAGE,
	EXPORT_DONE,
	EXPORT_READY,
	IMAGE_EXTENSION,
	RENDER_IMAGE,
	SAVE_IMAGES,
} from "../shared/exportImage";
import type { CaptureRect, ImageFile } from "../shared/exportImage";

const FILTERS = [{ name: "PNG", extensions: [IMAGE_EXTENSION] }];
const SAVE_FAILED = "The image was not saved";
const FALLBACK_NAME = "Layer";

function fieldsOf(value: unknown): Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null ? { ...value } : {};
}

function isLength(value: unknown): value is number {
	return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function captureRect(value: unknown): CaptureRect | null {
	const { x, y, width, height } = fieldsOf(value);
	return isLength(x) && isLength(y) && isLength(width) && isLength(height)
		? { x, y, width, height }
		: null;
}

function imageFiles(value: unknown): readonly ImageFile[] {
	const files = Array.isArray(value) ? value : [];
	return files.flatMap((file: unknown) => {
		const { name, bytes } = fieldsOf(file);
		return bytes instanceof Uint8Array
			? [{ name: typeof name === "string" && FILE_NAME.test(name) ? name : FALLBACK_NAME, bytes }]
			: [];
	});
}

async function capture(event: IpcMainInvokeEvent, value: unknown): Promise<Uint8Array | null> {
	const rect = captureRect(value);
	if (rect === null) {
		return null;
	}
	const image = await event.sender.capturePage(rect);
	return new Uint8Array(image.toPNG());
}

async function choosePaths(
	window: BrowserWindow,
	files: readonly ImageFile[],
): Promise<readonly string[]> {
	const names = uniqueNames(files.map((file) => file.name)).map(
		(name) => `${name}.${IMAGE_EXTENSION}`,
	);
	const [only, ...others] = names;
	if (only !== undefined && others.length === 0) {
		const result = await dialog.showSaveDialog(window, { filters: FILTERS, defaultPath: only });
		return result.canceled || result.filePath === "" ? [] : [result.filePath];
	}
	const result = await dialog.showOpenDialog(window, {
		properties: ["openDirectory", "createDirectory"],
	});
	const [folder] = result.filePaths;
	return result.canceled || folder === undefined ? [] : names.map((name) => join(folder, name));
}

async function saveImages(event: IpcMainInvokeEvent, value: unknown): Promise<number> {
	const window = BrowserWindow.fromWebContents(event.sender);
	const files = imageFiles(value);
	const paths = window === null || files.length === 0 ? [] : await choosePaths(window, files);
	try {
		await Promise.all(paths.map((path, index) => writeFile(path, files[index]?.bytes ?? [])));
		return paths.length;
	} catch (error) {
		dialog.showErrorBox(SAVE_FAILED, String(error));
		return 0;
	}
}

async function renderImage(exporter: ExportWindow, scene: unknown): Promise<Uint8Array | string> {
	try {
		const bytes = await exporter.render(scene);
		return bytes instanceof Uint8Array ? bytes : "The export window gave no picture.";
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
}

export function connectExports(): void {
	const exporter = new ExportWindow();
	app.on("browser-window-created", (_event, window) => {
		window.on("closed", () => {
			if (editorWindows().length === 0) {
				exporter.close();
			}
		});
	});
	ipcMain.handle(RENDER_IMAGE, (event, ...args: unknown[]) =>
		exporter.owns(event.sender) ? null : renderImage(exporter, args[0]),
	);
	ipcMain.on(EXPORT_READY, (event) => {
		exporter.markReady(event.sender);
	});
	ipcMain.on(EXPORT_DONE, (event, ...args: unknown[]) => {
		exporter.settle(event.sender, args[0]);
	});
	ipcMain.handle(CAPTURE_PAGE, (event, ...args: unknown[]) =>
		exporter.owns(event.sender) ? capture(event, args[0]) : null,
	);
	ipcMain.handle(SAVE_IMAGES, (event, ...args: unknown[]) => saveImages(event, args[0]));
}
