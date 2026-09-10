import { UndoManager } from "loro-crdt";
import type { LoroDoc } from "loro-crdt";

const ONE_STEP_FOR_EACH_COMMIT = 0;

interface HistoryFlags {
	canUndo: boolean;
	canRedo: boolean;
}

function sameFlags(cached: HistoryFlags, next: HistoryFlags): boolean {
	return cached.canUndo === next.canUndo && cached.canRedo === next.canRedo;
}

export class DocumentHistory {
	readonly #undo: UndoManager;
	#flags: HistoryFlags = { canUndo: false, canRedo: false };

	constructor(doc: LoroDoc) {
		this.#undo = new UndoManager(doc, { mergeInterval: ONE_STEP_FOR_EACH_COMMIT });
	}

	flags(): HistoryFlags {
		return this.#flags;
	}

	undo(): boolean {
		return this.#undo.undo();
	}

	redo(): boolean {
		return this.#undo.redo();
	}

	refresh(): boolean {
		const next = { canUndo: this.#undo.canUndo(), canRedo: this.#undo.canRedo() };
		if (sameFlags(this.#flags, next)) {
			return false;
		}
		this.#flags = next;
		return true;
	}
}
