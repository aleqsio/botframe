import { DesignDocument } from "../document/document";
import { fileBytes, readFile } from "../document/file";
import { FILE_COMMANDS } from "../shared/file";
import type { FileCommand } from "../shared/file";
import { bridge } from "./bridge";
import type { Bridge } from "./bridge";
import type { UserState } from "./state/userState";

const NOT_A_FILE = "The file is not a botframe document. A new document opens.";

async function save(shell: Bridge, doc: DesignDocument, user: UserState, saveAs: boolean) {
	const name = await shell.saveFile(fileBytes(doc), saveAs);
	if (name !== null) {
		user.fileName.set(name);
	}
}

export function runFileCommand(command: FileCommand, doc: DesignDocument, user: UserState): void {
	const shell = bridge();
	if (shell === null) {
		return;
	}
	if (command.id === "open") {
		void shell.openFile(!doc.canUndo() && !doc.canRedo());
		return;
	}
	void save(shell, doc, user, command.id === "saveAs");
}

export function connectFileMenu(doc: DesignDocument, user: UserState): void {
	bridge()?.onCommand((id) => {
		const command = FILE_COMMANDS.find((entry) => entry.id === id);
		if (command !== undefined) {
			runFileCommand(command, doc, user);
		}
	});
}

export async function startDocument(user: UserState): Promise<DesignDocument> {
	const shell = bridge();
	const opened = shell === null ? null : await shell.loadFile();
	if (shell === null || opened === null) {
		return DesignDocument.create();
	}
	const doc = readFile(opened.bytes);
	if (doc === null) {
		shell.forgetFile();
		window.alert(NOT_A_FILE);
		return DesignDocument.create();
	}
	user.fileName.set(opened.name);
	return doc;
}
