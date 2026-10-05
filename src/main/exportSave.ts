import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { BrowserWindow, dialog } from "electron";
import type { IpcMainInvokeEvent } from "electron";
import { EXPORT_FORMATS } from "../shared/exportFile";
import type { ExportFormat, ExportedFile } from "../shared/exportFile";
import { FILE_NAME } from "../shared/file";
import { uniqueNames } from "./fileNames";

const SAVE_FAILED = "The export was not saved";
const FALLBACK_NAME = "Layer";

function fieldsOf(value: unknown): Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null ? { ...value } : {};
}

function formatOf(value: unknown): ExportFormat | null {
	return EXPORT_FORMATS.find((format) => format.id === value)?.id ?? null;
}

function exportedFiles(value: unknown): readonly ExportedFile[] {
	const files = Array.isArray(value) ? value : [];
	return files.flatMap((file: unknown) => {
		const { name, format, bytes } = fieldsOf(file);
		const checked = formatOf(format);
		if (!(bytes instanceof Uint8Array) || checked === null) {
			return [];
		}
		const safe = typeof name === "string" && FILE_NAME.test(name) ? name : FALLBACK_NAME;
		return [{ name: safe, format: checked, bytes }];
	});
}

function fileNames(files: readonly ExportedFile[]): readonly string[] {
	const names = uniqueNames(files.map((file) => file.name));
	return names.map((name, index) => `${name}.${files[index]?.format ?? ""}`);
}

async function choosePaths(
	window: BrowserWindow,
	files: readonly ExportedFile[],
): Promise<readonly string[]> {
	const names = fileNames(files);
	const [only, ...others] = names;
	const [first] = files;
	if (only !== undefined && first !== undefined && others.length === 0) {
		const filters = [{ name: first.format.toUpperCase(), extensions: [first.format] }];
		const result = await dialog.showSaveDialog(window, { filters, defaultPath: only });
		return result.canceled || result.filePath === "" ? [] : [result.filePath];
	}
	const result = await dialog.showOpenDialog(window, {
		properties: ["openDirectory", "createDirectory"],
	});
	const [folder] = result.filePaths;
	return result.canceled || folder === undefined ? [] : names.map((name) => join(folder, name));
}

export async function saveExports(event: IpcMainInvokeEvent, value: unknown): Promise<number> {
	const window = BrowserWindow.fromWebContents(event.sender);
	const files = exportedFiles(value);
	const paths = window === null || files.length === 0 ? [] : await choosePaths(window, files);
	try {
		await Promise.all(paths.map((path, index) => writeFile(path, files[index]?.bytes ?? [])));
		return paths.length;
	} catch (error) {
		dialog.showErrorBox(SAVE_FAILED, String(error));
		return 0;
	}
}
