import type { DesignDocument } from "../document/document";
import type { EditMenuItem } from "../shared/editMenu";
import { bridge } from "./bridge";
import { EDIT_COMMANDS, commandById, runEditCommand } from "./input/editCommand";
import type { UserState } from "./state/userState";

function itemsFor(doc: DesignDocument): readonly EditMenuItem[] {
	return EDIT_COMMANDS.map((command) => ({
		id: command.id,
		label: command.label,
		accelerator: command.accelerator,
		enabled: command.enabled(doc),
	}));
}

export function connectEditMenu(doc: DesignDocument, user: UserState): void {
	const shell = bridge();
	if (shell === null) {
		return;
	}
	shell.setEditMenu(itemsFor(doc));
	doc.subscribeHistory(() => {
		shell.setEditMenu(itemsFor(doc));
	});
	shell.onCommand((id) => {
		const command = commandById(id);
		if (command !== null) {
			runEditCommand(command, doc, user);
		}
	});
}
