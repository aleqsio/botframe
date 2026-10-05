import { app, ipcMain } from "electron";
import type { IpcMainInvokeEvent } from "electron";
import {
	CAPTURE_PAGE,
	EXPORT_DONE,
	EXPORT_READY,
	PRINT_PAGE,
	RENDER_EXPORT,
	SAVE_EXPORTS,
} from "../shared/exportFile";
import type { CaptureRect, PageSize } from "../shared/exportFile";
import { saveExports } from "./exportSave";
import { ExportWindow } from "./exportWindow";
import { editorWindows } from "./rendererPage";

const CSS_PIXELS_PER_INCH = 96;

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

function pageSize(value: unknown): PageSize | null {
	const { width, height } = fieldsOf(value);
	return isLength(width) && isLength(height) && width > 0 && height > 0 ? { width, height } : null;
}

async function capture(event: IpcMainInvokeEvent, value: unknown): Promise<Uint8Array | null> {
	const rect = captureRect(value);
	if (rect === null) {
		return null;
	}
	const image = await event.sender.capturePage(rect);
	return new Uint8Array(image.toPNG());
}

async function print(event: IpcMainInvokeEvent, value: unknown): Promise<Uint8Array | null> {
	const size = pageSize(value);
	if (size === null) {
		return null;
	}
	const pdf = await event.sender.printToPDF({
		pageSize: {
			width: size.width / CSS_PIXELS_PER_INCH,
			height: size.height / CSS_PIXELS_PER_INCH,
		},
		margins: { top: 0, bottom: 0, left: 0, right: 0 },
		printBackground: true,
	});
	return new Uint8Array(pdf);
}

async function renderExport(exporter: ExportWindow, scene: unknown): Promise<Uint8Array | string> {
	try {
		const bytes = await exporter.render(scene);
		return bytes instanceof Uint8Array ? bytes : "The export window gave no file.";
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
	ipcMain.handle(RENDER_EXPORT, (event, ...args: unknown[]) =>
		exporter.owns(event.sender) ? null : renderExport(exporter, args[0]),
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
	ipcMain.handle(PRINT_PAGE, (event, ...args: unknown[]) =>
		exporter.owns(event.sender) ? print(event, args[0]) : null,
	);
	ipcMain.handle(SAVE_EXPORTS, (event, ...args: unknown[]) => saveExports(event, args[0]));
}
