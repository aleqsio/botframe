import type { ClipboardWrite } from "../shared/clipboard";
import type { EditMenuItem } from "../shared/editMenu";

export interface Bridge {
	setEditMenu: (items: readonly EditMenuItem[]) => void;
	onCommand: (listener: (id: string) => void) => void;
	writeClipboard: (write: ClipboardWrite) => Promise<void>;
	readClipboardLayers: () => Promise<string | null>;
	hasClipboardLayers: () => Promise<boolean>;
}

declare global {
	interface Window {
		botframe?: Bridge;
	}
}

export function bridge(): Bridge | null {
	return window.botframe ?? null;
}
