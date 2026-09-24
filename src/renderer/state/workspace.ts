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

export class Workspace {
	readonly tabs: Slot<readonly Tab[]>;
	readonly active: Slot<Tab>;

	constructor(first: Tab) {
		this.tabs = new Slot<readonly Tab[]>([first]);
		this.active = new Slot(first);
	}

	add(tab: Tab): void {
		this.tabs.set([...this.tabs.get(), tab]);
		this.active.set(tab);
	}

	close(tab: Tab): void {
		const tabs = this.tabs.get();
		const index = tabs.indexOf(tab);
		if (index === -1) {
			return;
		}
		const rest = tabs.filter((held) => held !== tab);
		const next = rest[Math.min(index, rest.length - 1)] ?? Tab.untitled();
		if (this.active.get() === tab) {
			this.active.set(next);
		}
		this.tabs.set(rest.length === 0 ? [next] : rest);
	}
}
