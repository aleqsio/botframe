import { fileBytes, readFile } from "../document/file";
import { FILE_COMMANDS } from "../shared/file";
import type { FileCommand } from "../shared/file";
import { bridge, inBrowser } from "./bridge";
import type { Bridge } from "./bridge";
import { Tab } from "./state/tab";
import type { Workspace } from "./state/workspace";

const NOT_A_FILE = "The file is not a botframe document.";

function closePrompt(tab: Tab): string {
	return `Close ${tab.name.get()}? The changes that are not saved are lost.`;
}

function holdersOf(workspace: Workspace, token: string): readonly Tab[] {
	return workspace.tabs.get().filter((tab) => tab.token.get() === token);
}

const renames = new WeakMap<Tab, Promise<void>>();

async function save(shell: Bridge, workspace: Workspace, saveAs: boolean): Promise<void> {
	const tab = workspace.active.get();
	await renames.get(tab);
	const version = tab.doc.version();
	const saved = await shell.saveFile(fileBytes(tab.doc), tab.token.get(), tab.name.get(), saveAs);
	if (saved === null) {
		return;
	}
	for (const held of holdersOf(workspace, saved.token)) {
		held.loseFile();
	}
	tab.markSaved(saved, version);
}

async function open(shell: Bridge, workspace: Workspace): Promise<void> {
	const opened = await shell.openFile();
	if (opened === null) {
		return;
	}
	const [held] = holdersOf(workspace, opened.token);
	if (held !== undefined) {
		workspace.active.set(held);
		return;
	}
	const doc = readFile(opened.bytes);
	if (doc === null) {
		window.alert(NOT_A_FILE);
		return;
	}
	workspace.add(new Tab(doc, { token: opened.token, name: opened.name }));
}

async function applyRename(tab: Tab, name: string): Promise<void> {
	const token = tab.token.get();
	if (token === null) {
		tab.name.set(name);
		return;
	}
	const renamed = await bridge().renameFile(token, name);
	if (renamed !== null) {
		tab.name.set(renamed.name);
	}
}

export function renameTab(tab: Tab, name: string): Promise<void> {
	const next = (renames.get(tab) ?? Promise.resolve()).then(() => applyRename(tab, name));
	renames.set(
		tab,
		next.catch(() => {}),
	);
	return next;
}

export function closeTab(workspace: Workspace, tab: Tab): void {
	if (tab.hasChanges() && !window.confirm(closePrompt(tab))) {
		return;
	}
	workspace.close(tab);
}

function runOnShell(command: FileCommand, workspace: Workspace): void {
	const shell = bridge();
	if (command.id === "open") {
		void open(shell, workspace);
		return;
	}
	void save(shell, workspace, command.id === "saveAs");
}

export function runFileCommand(command: FileCommand, workspace: Workspace): void {
	if (document.activeElement instanceof HTMLElement) {
		document.activeElement.blur();
	}
	if (command.id === "newTab") {
		workspace.add(Tab.untitled());
		return;
	}
	if (command.id === "closeTab") {
		closeTab(workspace, workspace.active.get());
		return;
	}
	runOnShell(command, workspace);
}

function guardUnload(workspace: Workspace): void {
	window.addEventListener("beforeunload", (event) => {
		if (workspace.tabs.get().some((tab) => tab.hasChanges())) {
			event.preventDefault();
		}
	});
}

export function connectFileMenu(workspace: Workspace): void {
	if (inBrowser()) {
		guardUnload(workspace);
	}
	bridge().onCommand((id) => {
		const command = FILE_COMMANDS.find((entry) => entry.id === id);
		if (command !== undefined) {
			runFileCommand(command, workspace);
		}
	});
}
