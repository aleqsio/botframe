import { useEffect } from "react";
import type { DesignDocument } from "../../document/document";
import type { UserState } from "../state/userState";
import { cancelDraw } from "./drawBehavior";
import { commandForStroke, runEditCommand } from "./editCommand";
import { COMMIT_MESSAGES, applyCommand, commandFor } from "./layerCommand";
import { cancelMove } from "./moveDrag";
import type { KeyStroke } from "./layerCommand";
import { toolFor } from "./toolKey";

const CANCEL_KEY = "Escape";

function isTyping(target: EventTarget | null): boolean {
	return target instanceof HTMLInputElement || target instanceof HTMLSelectElement;
}

function transformLayer(doc: DesignDocument, user: UserState, stroke: KeyStroke): boolean {
	const command = commandFor(stroke);
	const layers = user.selection.get().flatMap((id) => doc.layer(id) ?? []);
	if (command === null || layers.length === 0) {
		return false;
	}
	for (const layer of layers) {
		applyCommand(doc, layer, command);
	}
	doc.commit(COMMIT_MESSAGES[command.kind]);
	return true;
}

function handleStroke(doc: DesignDocument, user: UserState, stroke: KeyStroke): boolean {
	if (stroke.key === CANCEL_KEY) {
		cancelMove(doc, user);
		cancelDraw(doc, user);
		return true;
	}
	const edit = commandForStroke(stroke);
	if (edit !== null) {
		return runEditCommand(edit, doc, user);
	}
	if (user.dragging.get()) {
		return false;
	}
	const tool = toolFor(stroke);
	if (tool !== null) {
		user.tool.set(tool);
		user.highlight.set(null);
		return true;
	}
	return transformLayer(doc, user, stroke);
}

export function useKeyInput(doc: DesignDocument, user: UserState): void {
	useEffect(() => {
		function onKeyDown(event: KeyboardEvent): void {
			if (event.defaultPrevented || isTyping(event.target)) {
				return;
			}
			if (handleStroke(doc, user, event)) {
				event.preventDefault();
			}
		}

		window.addEventListener("keydown", onKeyDown);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [doc, user]);
}
