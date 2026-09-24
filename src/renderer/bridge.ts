import type { ClipboardWrite } from "../shared/clipboard";
import type { EditMenuItem } from "../shared/editMenu";
import type { OpenedFile } from "../shared/file";

export interface Bridge {
	setEditMenu: (items: readonly EditMenuItem[]) => void;
	onCommand: (listener: (id: string) => void) => void;
	writeClipboard: (write: ClipboardWrite) => Promise<void>;
	readClipboardLayers: () => Promise<string | null>;
	hasClipboardLayers: () => Promise<boolean>;
	openFile: (pristine: boolean) => Promise<void>;
	saveFile: (bytes: Uint8Array, saveAs: boolean) => Promise<string | null>;
	loadFile: () => Promise<OpenedFile | null>;
	forgetFile: () => void;
}

declare global {
	interface Window {
		botframe?: Bridge;
	}
}

export function bridge(): Bridge | null {
	return window.botframe ?? null;
}
