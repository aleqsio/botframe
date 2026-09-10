import type { DesignDocument } from "../../document/document";
import { NOTHING_SELECTED } from "../state/userState";
import type { UserState } from "../state/userState";
import type { KeyStroke } from "./layerCommand";

type EditCommandId = "undo" | "redo";

export interface EditCommand {
	id: EditCommandId;
	label: string;
	accelerator: string;
	matches: (stroke: KeyStroke) => boolean;
	apply: (doc: DesignDocument) => boolean;
	enabled: (doc: DesignDocument) => boolean;
}

const UNDO_KEY = "z";
const REDO_KEY = "y";

function onApple(): boolean {
	return navigator.userAgent.includes("Mac");
}

function heldWithAccelerator(stroke: KeyStroke): boolean {
	return (stroke.metaKey || stroke.ctrlKey) && !stroke.altKey;
}

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
		accelerator: "CmdOrCtrl+Z",
		matches: undoStroke,
		apply: (doc) => doc.undo(),
		enabled: (doc) => doc.canUndo(),
	},
	{
		id: "redo",
		label: "Redo",
		accelerator: onApple() ? "Cmd+Shift+Z" : "Ctrl+Y",
		matches: redoStroke,
		apply: (doc) => doc.redo(),
		enabled: (doc) => doc.canRedo(),
	},
];

export function commandForStroke(stroke: KeyStroke): EditCommand | null {
	return EDIT_COMMANDS.find((command) => command.matches(stroke)) ?? null;
}

export function commandById(id: string): EditCommand | null {
	return EDIT_COMMANDS.find((command) => command.id === id) ?? null;
}

export function runEditCommand(
	command: EditCommand,
	doc: DesignDocument,
	user: UserState,
): boolean {
	if (user.dragging.get() || user.draw.get() !== null) {
		return false;
	}
	if (command.apply(doc)) {
		dropStaleIds(doc, user);
	}
	return true;
}
