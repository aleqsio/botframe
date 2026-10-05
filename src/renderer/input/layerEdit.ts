import { clipSourceOf } from "../../document/clips";
import type { DesignDocument } from "../../document/document";
import type { Layer, LayerId } from "../../document/layer";
import { editableVertices } from "../../document/vertices";
import type { UserState } from "../state/userState";
import type { ReadLayer } from "./layerSpace";
import type { PointerTarget } from "./tool";
import { startTextEdit } from "./textEdit";

export interface LayerEdit {
	mode: "path" | "text";
	id: LayerId;
}

type EditSlots = Pick<UserState, "selection" | "pathEdit" | "textEdit">;

function hasVertices(layer: Layer): boolean {
	return editableVertices(layer.geometry, layer) !== null;
}

function ownEditOf(layer: Layer): LayerEdit | null {
	if (layer.geometry.kind === "text") {
		return { mode: "text", id: layer.id };
	}
	return hasVertices(layer) ? { mode: "path", id: layer.id } : null;
}

export function layerEditOf(
	read: ReadLayer,
	layer: Layer,
	editedPath: LayerId | null,
): LayerEdit | null {
	const mask = clipSourceOf(read, layer);
	if (mask !== null && mask.id !== editedPath && hasVertices(mask)) {
		return { mode: "path", id: mask.id };
	}
	return ownEditOf(layer);
}

export function startLayerEdit(slots: EditSlots, edit: LayerEdit): void {
	if (edit.mode === "text") {
		startTextEdit(slots, edit.id);
		return;
	}
	slots.selection.set([edit.id]);
	slots.pathEdit.set(edit.id);
}

export function editSelectedLayer(doc: DesignDocument, slots: EditSlots): boolean {
	const [id, ...others] = slots.selection.get();
	const layer = id === undefined || others.length > 0 ? null : doc.layer(id);
	const edit =
		layer === null ? null : layerEditOf((at) => doc.layer(at), layer, slots.pathEdit.get());
	if (edit === null) {
		return false;
	}
	startLayerEdit(slots, edit);
	return true;
}

export function masksHit(target: PointerTarget): boolean {
	const edited = target.user.pathEdit.get();
	const [id] = target.layerIds;
	const layer = edited === null || id === undefined ? null : target.doc.layer(id);
	return layer !== null && clipSourceOf((at) => target.doc.layer(at), layer)?.id === edited;
}
