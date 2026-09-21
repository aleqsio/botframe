import type { DesignDocument } from "../document/document";
import type { EditMenuItem } from "../shared/editMenu";
import { bridge } from "./bridge";
import type { Bridge } from "./bridge";
import type { EditCommand } from "./input/command";
import { EDIT_COMMANDS, commandById, runEditCommand } from "./input/editCommand";
import { LAYOUT_ACTIONS } from "./input/layoutAction";
import type { UserState } from "./state/userState";

const COPY_AS = { id: "copyAs", label: "Copy as", accelerator: "" };
const ARRANGE = { id: "arrange", label: "Arrange", accelerator: "", separatorBefore: true };

const MENU_COMMANDS = EDIT_COMMANDS.filter((command) => command.isFormat !== true);

const CONTEXT_COMMANDS = MENU_COMMANDS.filter((command) => command.group !== "history");

type ReadState = (command: EditCommand) => boolean;

function itemOf(command: EditCommand, isEnabled: ReadState, separator: boolean): EditMenuItem {
	return {
		id: command.id,
		label: command.label,
		accelerator: command.accelerator,
		enabled: isEnabled(command),
		...(separator ? { separatorBefore: true } : {}),
	};
}

function opensGroup(previous: EditCommand | undefined, command: EditCommand): boolean {
	return previous !== undefined && previous.group !== command.group;
}

function groupedItems(commands: readonly EditCommand[], isEnabled: ReadState): EditMenuItem[] {
	return commands.map((command, index) =>
		itemOf(command, isEnabled, opensGroup(commands[index - 1], command)),
	);
}

function formatsOf(isEnabled: ReadState): EditMenuItem[] {
	const formats = EDIT_COMMANDS.filter((command) => command.isFormat === true);
	return formats.map((command) => itemOf(command, isEnabled, false));
}

function copyAsItem(isEnabled: ReadState): EditMenuItem {
	const submenu = formatsOf(isEnabled);
	return { ...COPY_AS, enabled: submenu.some((item) => item.enabled), submenu };
}

function arrangeItem(isEnabled: ReadState): EditMenuItem {
	const submenu = groupedItems(LAYOUT_ACTIONS, isEnabled);
	return { ...ARRANGE, enabled: submenu.some((item) => item.enabled), submenu };
}

function extrasFor(command: EditCommand, isEnabled: ReadState): EditMenuItem[] {
	if (command.id === "copy") {
		return [copyAsItem(isEnabled)];
	}
	return command.id === "delete" ? [arrangeItem(isEnabled)] : [];
}

function itemsOf(commands: readonly EditCommand[], isEnabled: ReadState): EditMenuItem[] {
	return commands.flatMap((command, index) => [
		itemOf(command, isEnabled, opensGroup(commands[index - 1], command)),
		...extrasFor(command, isEnabled),
	]);
}

function stateOf(doc: DesignDocument, user: UserState): ReadState {
	return (command) => command.enabled(doc, user);
}

export function editMenuItems(doc: DesignDocument, user: UserState): readonly EditMenuItem[] {
	return itemsOf(MENU_COMMANDS, stateOf(doc, user));
}

export function contextMenuItems(doc: DesignDocument, user: UserState): readonly EditMenuItem[] {
	return itemsOf(CONTEXT_COMMANDS, stateOf(doc, user));
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
