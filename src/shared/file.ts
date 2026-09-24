export const OPEN_FILE = "file:open";
export const SAVE_FILE = "file:save";
export const LOAD_FILE = "file:load";
export const FORGET_FILE = "file:forget";

export const FILE_EXTENSION = "botframe";
export const UNTITLED = "Untitled";

export interface FileCommand {
	id: "open" | "save" | "saveAs";
	label: string;
	accelerator: string;
}

export const FILE_COMMANDS: readonly FileCommand[] = [
	{ id: "open", label: "Open…", accelerator: "CmdOrCtrl+O" },
	{ id: "save", label: "Save", accelerator: "CmdOrCtrl+S" },
	{ id: "saveAs", label: "Save As…", accelerator: "CmdOrCtrl+Shift+S" },
];

export interface OpenedFile {
	name: string;
	bytes: Uint8Array;
}
