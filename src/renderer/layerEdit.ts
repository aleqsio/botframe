import type { DesignDocument } from "../document/document";
import type { LayerId } from "../document/layer";
import { PASTE_OFFSET, shiftNode } from "./paste";
import type { UserState } from "./state/userState";

function copyOf(doc: DesignDocument, id: LayerId): LayerId | null {
	const node = doc.readSubtree(id);
	if (node === null) {
		return null;
	}
	return doc.createSubtree(shiftNode(node, PASTE_OFFSET), doc.layer(id)?.parent ?? null);
}

export function deleteSelection(doc: DesignDocument, user: UserState): boolean {
	const selection = user.selection.get();
	if (selection.length === 0) {
		return false;
	}
	for (const id of selection) {
		doc.deleteLayer(id);
	}
	doc.commit("delete layers");
	return true;
}

export function duplicateSelection(doc: DesignDocument, user: UserState): boolean {
	const copies = user.selection.get().flatMap((id) => copyOf(doc, id) ?? []);
	if (copies.length === 0) {
		return false;
	}
	user.selection.set(copies);
	doc.commit("duplicate layers");
	return true;
}
