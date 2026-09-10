import { useEffect } from "react";
import type { DesignDocument } from "../../document/document";
import type { UserState } from "../state/userState";
import { cancelDraw } from "./drawBehavior";
import { COMMIT_MESSAGES, applyCommand, commandFor } from "./layerCommand";
import type { KeyStroke } from "./layerCommand";
import { toolFor } from "./toolKey";

const CANCEL_KEY = "Escape";

function isTyping(target: EventTarget | null): boolean {
	return target instanceof HTMLInputElement || target instanceof HTMLSelectElement;
}

function transformLayer(doc: DesignDocument, user: UserState, stroke: KeyStroke): boolean {
	const command = commandFor(stroke);
	const [id] = user.selection.get();
	const layer = command === null || id === undefined ? null : doc.layer(id);
	if (command === null || layer === null) {
		return false;
	}
	applyCommand(doc, layer, command);
	doc.commit(COMMIT_MESSAGES[command.kind]);
	return true;
}

function handleStroke(doc: DesignDocument, user: UserState, stroke: KeyStroke): boolean {
	if (stroke.key === CANCEL_KEY) {
		cancelDraw(doc, user);
		return true;
	}
	if (user.dragging.get()) {
		return false;
	}
	const tool = toolFor(stroke);
	if (tool !== null) {
		user.tool.set(tool);
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
