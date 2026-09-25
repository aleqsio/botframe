import type { ClipboardWrite } from "../shared/clipboard";
import type { EditMenuItem } from "../shared/editMenu";
import type { OpenedFile, SavedFile } from "../shared/file";

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

export function bridge(): Bridge | null {
	return window.botframe ?? null;
}
