import type { DesignDocument } from "../document/document";
import type { EditMenuItem } from "../shared/editMenu";
import { EDIT_COMMANDS, commandById, runEditCommand } from "./input/editCommand";
import type { UserState } from "./state/userState";

interface EditMenuBridge {
	setEditMenu: (items: readonly EditMenuItem[]) => void;
	onCommand: (listener: (id: string) => void) => void;
}

declare global {
	interface Window {
		botframe?: EditMenuBridge;
	}
}

function itemsFor(doc: DesignDocument): readonly EditMenuItem[] {
	return EDIT_COMMANDS.map((command) => ({
		id: command.id,
		label: command.label,
		accelerator: command.accelerator,
		enabled: command.enabled(doc),
	}));
}

export function connectEditMenu(doc: DesignDocument, user: UserState): void {
	const bridge = window.botframe;
	if (bridge === undefined) {
		return;
	}
	bridge.setEditMenu(itemsFor(doc));
	doc.subscribeHistory(() => {
		bridge.setEditMenu(itemsFor(doc));
	});
	bridge.onCommand((id) => {
		const command = commandById(id);
		if (command !== null) {
			runEditCommand(command, doc, user);
		}
	});
}
