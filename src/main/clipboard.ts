import { ClipboardItem, clipboard, ipcMain } from "electron";
import {
	HAS_CLIPBOARD_LAYERS,
	HTML_FLAVOR,
	LAYERS_FLAVOR,
	READ_CLIPBOARD_LAYERS,
	TEXT_FLAVOR,
	WRITE_CLIPBOARD,
} from "../shared/clipboard";
import type { ClipboardWrite } from "../shared/clipboard";

function isClipboardWrite(value: unknown): value is ClipboardWrite {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const write: Partial<Record<keyof ClipboardWrite, unknown>> = value;
	return (
		typeof write.html === "string" && (write.layers === null || typeof write.layers === "string")
	);
}

function itemOf(write: ClipboardWrite): ClipboardItem {
	const flavors: Record<string, string> = {
		[TEXT_FLAVOR]: write.html,
		[HTML_FLAVOR]: write.html,
	};
	if (write.layers !== null) {
		flavors[LAYERS_FLAVOR] = write.layers;
	}
	return new ClipboardItem(flavors);
}

async function writeClipboard(value: unknown): Promise<void> {
	if (isClipboardWrite(value)) {
		await clipboard.write([itemOf(value)]);
	}
}

async function readLayers(): Promise<string | null> {
	const items = await clipboard.read();
	const item = items.find((entry) => entry.types.includes(LAYERS_FLAVOR));
	if (item === undefined) {
		return null;
	}
	const blob = await item.getType(LAYERS_FLAVOR);
	return blob instanceof Blob ? blob.text() : null;
}

export function connectClipboard(): void {
	ipcMain.handle(WRITE_CLIPBOARD, (_event, ...args: unknown[]) => writeClipboard(args[0]));
	ipcMain.handle(READ_CLIPBOARD_LAYERS, () => readLayers());
	ipcMain.handle(HAS_CLIPBOARD_LAYERS, () => clipboard.has(LAYERS_FLAVOR));
}
