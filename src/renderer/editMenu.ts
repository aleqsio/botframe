import type { DesignDocument } from "../document/document";
import type { EditMenuItem } from "../shared/editMenu";
import { bridge } from "./bridge";
import type { Bridge } from "./bridge";
import { EDIT_COMMANDS, commandById, runEditCommand } from "./input/editCommand";
import type { EditCommand } from "./input/editCommand";
import type { UserState } from "./state/userState";

const COPY_AS = { id: "copyAs", label: "Copy as", accelerator: "" };

type ReadState = (command: EditCommand) => boolean;

function itemOf(command: EditCommand, isEnabled: ReadState): EditMenuItem {
	return {
		id: command.id,
		label: command.label,
		accelerator: command.accelerator,
		enabled: isEnabled(command),
		...(command.separatorBefore === true ? { separatorBefore: true } : {}),
	};
}

function formatsOf(isEnabled: ReadState): EditMenuItem[] {
	const formats = EDIT_COMMANDS.filter((command) => command.isFormat === true);
	return formats.map((command) => itemOf(command, isEnabled));
}

function copyAsItem(isEnabled: ReadState): EditMenuItem {
	const submenu = formatsOf(isEnabled);
	return { ...COPY_AS, enabled: submenu.some((item) => item.enabled), submenu };
}

export function editMenuItems(doc: DesignDocument, user: UserState): readonly EditMenuItem[] {
	const isEnabled: ReadState = (command) => command.enabled(doc, user);
	return EDIT_COMMANDS.filter((command) => command.isFormat !== true).flatMap((command) =>
		command.id === "copy"
			? [itemOf(command, isEnabled), copyAsItem(isEnabled)]
			: [itemOf(command, isEnabled)],
	);
}

function pushMenu(shell: Bridge, doc: DesignDocument, user: UserState): void {
	shell.setEditMenu(editMenuItems(doc, user));
}

export function connectEditMenu(doc: DesignDocument, user: UserState): void {
	const shell = bridge();
	if (shell === null) {
		return;
	}
	const push = (): void => {
		pushMenu(shell, doc, user);
	};
	push();
	doc.subscribeHistory(push);
	user.selection.subscribe(push);
	user.pasteReady.subscribe(push);
	shell.onCommand((id) => {
		const command = commandById(id);
		if (command !== null) {
			runEditCommand(command, doc, user);
		}
	});
}
