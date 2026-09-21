import type { DesignDocument } from "../../document/document";
import type { UserState } from "../state/userState";
import type { KeyStroke } from "./layerCommand";

export type CommandGroup =
	| "history"
	| "clipboard"
	| "layer"
	| "align"
	| "spread"
	| "place"
	| "turn";

export interface EditCommand {
	id: string;
	label: string;
	group: CommandGroup;
	accelerator: string;
	matches: (stroke: KeyStroke) => boolean;
	apply: (doc: DesignDocument, user: UserState) => boolean;
	enabled: (doc: DesignDocument, user: UserState) => boolean;
	isFormat?: boolean;
}

export function onApple(): boolean {
	return navigator.userAgent.includes("Mac");
}

export function heldWithAccelerator(stroke: KeyStroke): boolean {
	return (stroke.metaKey || stroke.ctrlKey) && !stroke.altKey;
}

export function plainStroke(key: string): (stroke: KeyStroke) => boolean {
	return (stroke) =>
		heldWithAccelerator(stroke) && !stroke.shiftKey && stroke.key.toLowerCase() === key;
}

export function never(): boolean {
	return false;
}
