import type { Layer, LayerId } from "../../document/layer";
import { heldPlacement, insideSubtree } from "./dropTarget";
import type { Placement } from "./dropTarget";
import { layerChain, parentChain } from "./layerSpace";
import type { ReadLayer } from "./layerSpace";

export type RowPlace = "before" | "after" | "inside";

export type RowMark = RowPlace | "dragged";

export interface RowTarget {
	id: LayerId;
	place: RowPlace;
}

export interface RowDrag {
	id: LayerId;
	target: RowTarget | null;
}

export interface RowMove {
	parent: LayerId | null;
	index: number;
}

export interface RowTree {
	read: ReadLayer;
	childIds: (parent: LayerId | null) => readonly LayerId[];
}

const EDGE_PART = 0.25;

export function rowPlaceOf(offset: number, height: number): RowPlace {
	const part = offset / height;
	if (part < EDGE_PART) {
		return "before";
	}
	return part < 1 - EDGE_PART ? "inside" : "after";
}

function indexAfterLift(siblings: readonly LayerId[], dragged: LayerId, slot: number): number {
	const from = siblings.indexOf(dragged);
	return from >= 0 && from < slot ? slot - 1 : slot;
}

function insideMove(dragged: LayerId, parent: LayerId, tree: RowTree): RowMove {
	const children = tree.childIds(parent);
	return { parent, index: indexAfterLift(children, dragged, children.length) };
}

function siblingMove(dragged: LayerId, row: Layer, place: RowPlace, tree: RowTree): RowMove | null {
	const siblings = tree.childIds(row.parent);
	const at = siblings.indexOf(row.id);
	if (at < 0) {
		return null;
	}
	const slot = place === "after" ? at + 1 : at;
	return { parent: row.parent, index: indexAfterLift(siblings, dragged, slot) };
}

export function rowMoveOf(dragged: LayerId, target: RowTarget, tree: RowTree): RowMove | null {
	const row = tree.read(target.id);
	if (row === null || insideSubtree(tree.read, target.id, dragged)) {
		return null;
	}
	return target.place === "inside"
		? insideMove(dragged, row.id, tree)
		: siblingMove(dragged, row, target.place, tree);
}

export function rowMarkOf(drag: RowDrag | null, id: LayerId): RowMark | null {
	if (drag === null) {
		return null;
	}
	if (drag.id === id) {
		return "dragged";
	}
	const target = drag.target;
	return target !== null && target.id === id ? target.place : null;
}

export function carriedPlacement(
	read: ReadLayer,
	id: LayerId,
	parent: LayerId | null,
): Placement | null {
	const layer = read(id);
	if (layer === null || layer.parent === parent) {
		return null;
	}
	return heldPlacement(layer, parentChain(read, id), layerChain(read, parent));
}
