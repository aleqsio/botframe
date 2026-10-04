import { fileBytes, readFile } from "../document/file";
import { FILE_COMMANDS } from "../shared/file";
import type { FileCommand } from "../shared/file";
import { bridge, inBrowser } from "./bridge";
import type { Bridge } from "./bridge";
import { Tab, tabName } from "./state/tab";
import type { Workspace } from "./state/workspace";

const NOT_A_FILE = "The file is not a botframe document.";

function closePrompt(tab: Tab): string {
	return `Close ${tabName(tab.file.get())}? The changes that are not saved are lost.`;
}

function holdersOf(workspace: Workspace, token: string): readonly Tab[] {
	return workspace.tabs.get().filter((tab) => tab.file.get()?.token === token);
}

async function save(shell: Bridge, workspace: Workspace, saveAs: boolean): Promise<void> {
	const tab = workspace.active.get();
	const version = tab.doc.version();
	const saved = await shell.saveFile(fileBytes(tab.doc), tab.file.get()?.token ?? null, saveAs);
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
