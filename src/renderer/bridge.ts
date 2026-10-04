import type { ClipboardWrite } from "../shared/clipboard";
import type { EditMenuItem } from "../shared/editMenu";
import { FILE_COMMANDS } from "../shared/file";
import type { OpenedFile, SavedFile } from "../shared/file";
import { heldWithAccelerator } from "./input/command";
import { readClipboardLayers, writesLayers, writeClipboard } from "./webClipboard";
import { openFile, saveFile } from "./webFiles";

export interface Bridge {
	setEditMenu: (items: readonly EditMenuItem[]) => void;
	onCommand: (listener: (id: string) => void) => void;
	writeClipboard: (write: ClipboardWrite) => Promise<void>;
	readClipboardLayers: () => Promise<string | null>;
	hasClipboardLayers: () => Promise<boolean>;
	openFile: () => Promise<OpenedFile | null>;
	saveFile: (bytes: Uint8Array, token: string | null, saveAs: boolean) => Promise<SavedFile | null>;
}

declare global {
	interface Window {
		botframe?: Bridge;
	}
}

const SHIFT = "Shift";

function matchesAccelerator(accelerator: string, event: KeyboardEvent): boolean {
	const parts = accelerator.split("+");
	return (
		heldWithAccelerator(event) &&
		event.shiftKey === parts.includes(SHIFT) &&
		event.key.toLowerCase() === parts.at(-1)?.toLowerCase()
	);
}

function onFileKey(listener: (id: string) => void): void {
	window.addEventListener("keydown", (event) => {
		const command = FILE_COMMANDS.find((entry) => matchesAccelerator(entry.accelerator, event));
		if (command === undefined) {
			return;
		}
		event.preventDefault();
		if (!event.repeat) {
			listener(command.id);
		}
	});
}

const WEB: Bridge = {
	setEditMenu: () => {},
	onCommand: onFileKey,
	writeClipboard,
	readClipboardLayers,
	hasClipboardLayers: () => Promise.resolve(writesLayers()),
	openFile,
	saveFile,
};

export function inBrowser(): boolean {
	return window.botframe === undefined;
}

export function bridge(): Bridge {
	return window.botframe ?? WEB;
}
