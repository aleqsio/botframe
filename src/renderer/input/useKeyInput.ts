import { useEffect } from "react";
import type { DesignDocument } from "../../document/document";
import type { UserState } from "../state/userState";
import { cancelDraw } from "./drawBehavior";
import { commandForStroke, runEditCommand } from "./editCommand";
import { cancelGroupMove } from "./groupMove";
import { COMMIT_MESSAGES, applyCommand, commandFor } from "./layerCommand";
import { cancelMove } from "./moveDrag";
import type { KeyStroke } from "./layerCommand";
import { isTextField, runTextEdit, textKeyFor } from "./textField";
import { toolFor } from "./toolKey";

const CANCEL_KEY = "Escape";

function isTyping(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLInputElement || target instanceof HTMLSelectElement || isTextField(target)
	);
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

export function handleStroke(doc: DesignDocument, user: UserState, stroke: KeyStroke): boolean {
	if (stroke.key === CANCEL_KEY) {
		user.snap.set(null);
		user.marquee.set(null);
		user.pathEdit.set(null);
		cancelMove(doc, user);
		cancelGroupMove(doc, user);
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
			const edit = isTextField(event.target) ? textKeyFor(event) : null;
			if (edit !== null && !event.defaultPrevented) {
				event.preventDefault();
				runTextEdit(edit);
				return;
			}
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
