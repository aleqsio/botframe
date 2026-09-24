import { DesignDocument } from "../../document/document";
import { UNTITLED } from "../../shared/file";
import type { SavedFile } from "../../shared/file";
import { Slot } from "./slot";
import { UserState } from "./userState";

export class Tab {
	readonly id = crypto.randomUUID();
	readonly user = new UserState();
	readonly doc: DesignDocument;
	readonly file: Slot<SavedFile | null>;
	#savedVersion: string;

	constructor(doc: DesignDocument, file: SavedFile | null) {
		this.doc = doc;
		this.file = new Slot(file);
		this.#savedVersion = doc.version();
	}

	static untitled(): Tab {
		return new Tab(DesignDocument.create(), null);
	}

	markSaved(file: SavedFile, version: string): void {
		this.file.set(file);
		this.#savedVersion = version;
	}

	loseFile(): void {
		this.file.set(null);
		this.#savedVersion = "";
	}

	hasChanges(): boolean {
		return this.doc.version() !== this.#savedVersion;
	}
}

export function tabName(file: SavedFile | null): string {
	return file?.name ?? UNTITLED;
}
