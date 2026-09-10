import { useEffect } from "react";
import type { DesignDocument } from "../../document/document";
import type { UserState } from "../state/userState";
import { COMMIT_MESSAGES, applyCommand, commandFor } from "./layerCommand";

export function useKeyInput(doc: DesignDocument, user: UserState): void {
	useEffect(() => {
		function onKeyDown(event: KeyboardEvent): void {
			if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
				return;
			}
			const command = commandFor(event);
			const [id] = user.selection.get();
			const layer = command === null || id === undefined ? null : doc.layer(id);
			if (command === null || layer === null) {
				return;
			}
			event.preventDefault();
			applyCommand(doc, layer, command);
			doc.commit(COMMIT_MESSAGES[command.kind]);
		}

		window.addEventListener("keydown", onKeyDown);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [doc, user]);
}
