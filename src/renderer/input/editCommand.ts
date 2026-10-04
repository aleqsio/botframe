import type { DesignDocument } from "../../document/document";
import { copyAsHtml, copySelection, cutSelection, pasteFromClipboard } from "../clipboard";
import { deleteSelection, duplicateSelection } from "../layerEdit";
import { canGroup, canUngroup, groupSelection, ungroupSelection } from "../layerGroup";
import { NOTHING_SELECTED } from "../state/userState";
import type { UserState } from "../state/userState";
import { heldWithAccelerator, never, onApple, plainStroke } from "./command";
import type { EditCommand } from "./command";
import type { KeyStroke } from "./layerCommand";
import { LAYOUT_ACTIONS } from "./layoutAction";

const UNDO_KEY = "z";
const REDO_KEY = "y";
const CUT_KEY = "x";
const COPY_KEY = "c";
const PASTE_KEY = "v";
const DUPLICATE_KEY = "d";
const GROUP_KEY = "g";
const REMOVE_KEYS: ReadonlySet<string> = new Set(["Delete", "Backspace"]);

function undoStroke(stroke: KeyStroke): boolean {
	return heldWithAccelerator(stroke) && !stroke.shiftKey && stroke.key.toLowerCase() === UNDO_KEY;
}

function redoStroke(stroke: KeyStroke): boolean {
	if (!heldWithAccelerator(stroke)) {
		return false;
	}
	const key = stroke.key.toLowerCase();
	return stroke.shiftKey ? key === UNDO_KEY : key === REDO_KEY;
}

function removeStroke(stroke: KeyStroke): boolean {
	return !heldWithAccelerator(stroke) && !stroke.altKey && REMOVE_KEYS.has(stroke.key);
}

function ungroupStroke(stroke: KeyStroke): boolean {
	return (
		stroke.shiftKey &&
		!stroke.metaKey &&
		!stroke.ctrlKey &&
		!stroke.altKey &&
		stroke.key.toLowerCase() === GROUP_KEY
	);
}

function hasSelection(_doc: DesignDocument, user: UserState): boolean {
	return user.selection.get().length > 0;
}

function dropStaleIds(doc: DesignDocument, user: UserState): void {
	user.menu.set(null);
	const selection = user.selection.get();
	const live = selection.filter((id) => doc.layer(id) !== null);
	if (live.length !== selection.length) {
		user.selection.set(live.length === 0 ? NOTHING_SELECTED : live);
	}
}

export const EDIT_COMMANDS: readonly EditCommand[] = [
	{
		id: "undo",
		label: "Undo",
		group: "history",
		accelerator: "CmdOrCtrl+Z",
		matches: undoStroke,
		apply: (doc) => doc.undo(),
		enabled: (doc) => doc.canUndo(),
	},
	{
		id: "redo",
		label: "Redo",
		group: "history",
		accelerator: onApple() ? "Cmd+Shift+Z" : "Ctrl+Y",
		matches: redoStroke,
		apply: (doc) => doc.redo(),
		enabled: (doc) => doc.canRedo(),
	},
	{
		id: "cut",
		label: "Cut",
		group: "clipboard",
		accelerator: "CmdOrCtrl+X",
		matches: plainStroke(CUT_KEY),
		apply: cutSelection,
		enabled: hasSelection,
	},
	{
		id: "copy",
		label: "Copy",
		group: "clipboard",
		accelerator: "CmdOrCtrl+C",
		matches: plainStroke(COPY_KEY),
		apply: copySelection,
		enabled: hasSelection,
	},
	{
		id: "copyAsHtml",
		label: "HTML",
		group: "clipboard",
		accelerator: "",
		matches: never,
		apply: copyAsHtml,
		enabled: hasSelection,
		isFormat: true,
	},
	{
		id: "paste",
		label: "Paste",
		group: "clipboard",
		accelerator: "CmdOrCtrl+V",
		matches: plainStroke(PASTE_KEY),
		apply: pasteFromClipboard,
		enabled: (_doc, user) => user.pasteReady.get(),
	},
	{
		id: "duplicate",
		label: "Duplicate",
		group: "layer",
		accelerator: "CmdOrCtrl+D",
		matches: plainStroke(DUPLICATE_KEY),
		apply: duplicateSelection,
		enabled: hasSelection,
	},
	{
		id: "group",
		label: "Group",
		group: "layer",
		accelerator: "CmdOrCtrl+G",
		matches: plainStroke(GROUP_KEY),
		apply: groupSelection,
		enabled: canGroup,
	},
	{
		id: "ungroup",
		label: "Ungroup",
		group: "layer",
		accelerator: "Shift+G",
		matches: ungroupStroke,
		apply: ungroupSelection,
		enabled: canUngroup,
	},
	{
		id: "delete",
		label: "Delete",
		group: "layer",
		accelerator: onApple() ? "Backspace" : "Delete",
		matches: removeStroke,
		apply: deleteSelection,
		enabled: hasSelection,
	},
];

const ALL_COMMANDS: readonly EditCommand[] = [...EDIT_COMMANDS, ...LAYOUT_ACTIONS];

export function commandForStroke(stroke: KeyStroke): EditCommand | null {
	return ALL_COMMANDS.find((command) => command.matches(stroke)) ?? null;
}

export function commandById(id: string): EditCommand | null {
	return ALL_COMMANDS.find((command) => command.id === id) ?? null;
}

export function runEditCommand(
	command: EditCommand,
	doc: DesignDocument,
	user: UserState,
): boolean {
	if (user.dragging.get() || user.draw.get() !== null || user.rowDrag.get() !== null) {
		return false;
	}
	if (!command.enabled(doc, user)) {
		return false;
	}
	if (command.apply(doc, user)) {
		dropStaleIds(doc, user);
	}
	return true;
}
