export const OPEN_FILE = "file:open";
export const SAVE_FILE = "file:save";
export const RENAME_FILE = "file:rename";

export const FILE_EXTENSION = "botframe";
export const UNTITLED = "Untitled";
export const WELCOME = "Welcome";
export const FILE_NAME = /^(?!\s*\.{0,2}\s*$)[^\\/]+$/u;

export interface FileCommand {
	id: "newTab" | "open" | "welcome" | "save" | "saveAs" | "closeTab";
	label: string;
	accelerator: string;
	separatorBefore?: boolean;
}

export const FILE_COMMANDS: readonly FileCommand[] = [
	{ id: "newTab", label: "New Tab", accelerator: "CmdOrCtrl+T" },
	{ id: "open", label: "Open…", accelerator: "CmdOrCtrl+O" },
	{ id: "welcome", label: "Open Welcome Project", accelerator: "" },
	{ id: "save", label: "Save", accelerator: "CmdOrCtrl+S", separatorBefore: true },
	{ id: "saveAs", label: "Save As…", accelerator: "CmdOrCtrl+Shift+S" },
	{ id: "closeTab", label: "Close Tab", accelerator: "CmdOrCtrl+W", separatorBefore: true },
];

export interface SavedFile {
	token: string;
	name: string;
}

export interface OpenedFile extends SavedFile {
	bytes: Uint8Array;
}
