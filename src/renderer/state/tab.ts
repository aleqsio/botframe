import { DesignDocument } from "../../document/document";
import { UNTITLED } from "../../shared/file";
import type { SavedFile } from "../../shared/file";
import { Slot } from "./slot";
import { UserState } from "./userState";

export class Tab {
	readonly id = crypto.randomUUID();
	readonly user = new UserState();
	readonly doc: DesignDocument;
	readonly name: Slot<string>;
	readonly token: Slot<string | null>;
	readonly savedVersion: Slot<string>;

	constructor(doc: DesignDocument, file: SavedFile | null, savedVersion = doc.version()) {
		this.doc = doc;
		this.name = new Slot(file?.name ?? UNTITLED);
		this.token = new Slot(file?.token ?? null);
		this.savedVersion = new Slot(savedVersion);
	}

	static untitled(): Tab {
		return new Tab(DesignDocument.create(), null);
	}

	markSaved(file: SavedFile, version: string): void {
		this.token.set(file.token);
		this.name.set(file.name);
		this.savedVersion.set(version);
	}

	loseFile(): void {
		this.token.set(null);
		this.name.set(UNTITLED);
		this.savedVersion.set("");
	}

	hasChanges(): boolean {
		return this.doc.version() !== this.savedVersion.get();
	}
}
