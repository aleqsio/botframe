import type { DesignDocument } from "../../document/document";
import type { LayerId } from "../../document/layer";
import { NOTHING_SELECTED } from "../state/userState";
import type { UserState } from "../state/userState";

export type TextEditSlots = Pick<UserState, "selection" | "textEdit">;

export const CREATE_TEXT = "create text";
const EDIT_TEXT = "edit text";
const LINE_BREAK = "\n";

export function editorText(content: string): string {
	return content.endsWith(LINE_BREAK) ? `${content}${LINE_BREAK}` : content;
}

export function editedText(shown: string): string {
	return shown.endsWith(LINE_BREAK) ? shown.slice(0, -LINE_BREAK.length) : shown;
}

export function startTextEdit(slots: TextEditSlots, id: LayerId, message = EDIT_TEXT): void {
	slots.selection.set([id]);
	slots.textEdit.set({ id, message });
}

export function typeText(doc: DesignDocument, id: LayerId, content: string): void {
	const geometry = doc.layer(id)?.geometry;
	if (geometry?.kind === "text" && geometry.content !== content) {
		doc.update(id, { geometry: { ...geometry, content } });
	}
}

export function endTextEdit(doc: DesignDocument, slots: TextEditSlots): void {
	const edit = slots.textEdit.get();
	if (edit === null) {
		return;
	}
	slots.textEdit.set(null);
	const layer = doc.layer(edit.id);
	const empty = layer?.geometry.kind === "text" && layer.geometry.content.trim() === "";
	if (empty && layer.bindings.content === undefined) {
		doc.deleteLayer(edit.id);
		slots.selection.set(NOTHING_SELECTED);
	}
	doc.commit(edit.message);
}
