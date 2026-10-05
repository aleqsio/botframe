import type { AgentReply } from "../shared/agent";
import type { ClipboardWrite } from "../shared/clipboard";
import { EXPORT_PAGE_HASH } from "../shared/exportFile";
import type { CaptureRect, ExportScene, ExportedFile, PageSize } from "../shared/exportFile";
import type { EditMenuItem } from "../shared/editMenu";
import { FILE_COMMANDS } from "../shared/file";
import type { OpenedFile, SavedFile } from "../shared/file";
import type { FetchedMedia } from "../shared/media";
import { heldWithAccelerator } from "./input/command";
import { readClipboardLayers, writesLayers, writeClipboard } from "./webClipboard";
import { openFile, renameFile, saveFile } from "./webFiles";

export interface Bridge {
	setEditMenu: (items: readonly EditMenuItem[]) => void;
	onCommand: (listener: (id: string) => void) => void;
	writeClipboard: (write: ClipboardWrite) => Promise<void>;
	readClipboardLayers: () => Promise<string | null>;
	hasClipboardLayers: () => Promise<boolean>;
	openFile: () => Promise<OpenedFile | null>;
	saveFile: (
		bytes: Uint8Array,
		token: string | null,
		name: string,
		saveAs: boolean,
	) => Promise<SavedFile | null>;
	renameFile: (token: string, name: string) => Promise<SavedFile | null>;
	fetchMedia: (url: string) => Promise<FetchedMedia | null>;
	renderExport: (scene: ExportScene) => Promise<Uint8Array>;
	serveExport: (run: (call: unknown) => Promise<AgentReply>) => void;
	capturePage: (rect: CaptureRect) => Promise<Uint8Array | null>;
	printPage: (size: PageSize) => Promise<Uint8Array | null>;
	saveExports: (files: readonly ExportedFile[]) => Promise<number>;
	serveAgent: (run: (call: unknown) => Promise<AgentReply>) => void;
}

declare global {
	interface Window {
		botframe?: Bridge;
	}
}

const NEEDS_DESKTOP = "Export needs the desktop app. The website cannot capture the page.";

const SHIFT = "Shift";

function matchesAccelerator(accelerator: string | undefined, event: KeyboardEvent): boolean {
	if (accelerator === undefined) {
		return false;
	}
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
	renameFile,
	fetchMedia: () => Promise.resolve(null),
	renderExport: () => Promise.reject(new Error(NEEDS_DESKTOP)),
	serveExport: () => {},
	capturePage: () => Promise.resolve(null),
	printPage: () => Promise.resolve(null),
	saveExports: () => Promise.resolve(0),
	serveAgent: () => {},
};

export function isExportPage(): boolean {
	return window.location.hash === `#${EXPORT_PAGE_HASH}`;
}

export function inBrowser(): boolean {
	return window.botframe === undefined;
}

export function bridge(): Bridge {
	return window.botframe ?? WEB;
}
