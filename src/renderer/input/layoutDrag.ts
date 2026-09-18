import type { Layer, LayerId } from "../../document/layer";
import { cellAt, sameCell } from "../../document/layout";
import type { Cell, Direction } from "../../document/layout";
import type { Point } from "../state/camera";
import { centerOf } from "./layerSpace";
import { parentPointOf } from "./targetSpace";
import type { PointerTarget } from "./tool";

export function isLaidOut(target: PointerTarget, parent: LayerId | null): boolean {
	const container = parent === null ? null : target.doc.layer(parent);
	return container !== null && container.layout.kind !== "free";
}

export function flexSlotOf(direction: Direction, others: readonly Layer[], point: Point): number {
	const axis = direction === "row" ? "x" : "y";
	return others.filter((sibling) => centerOf(sibling)[axis] < point[axis]).length;
}

function reorder(target: PointerTarget, layer: Layer, direction: Direction, point: Point): void {
	const ids = target.doc.siblingIds(layer.parent);
	const others = ids.flatMap((id) => (id === layer.id ? [] : (target.doc.layer(id) ?? [])));
	const slot = flexSlotOf(direction, others, point);
	if (slot !== ids.indexOf(layer.id)) {
		target.doc.move(layer.id, layer.parent, slot);
	}
}

function recell(target: PointerTarget, layer: Layer, cell: Cell): void {
	if (!sameCell(layer.slot, cell)) {
		target.doc.update(layer.id, { cell });
	}
}

export function settleInLayout(target: PointerTarget, id: LayerId, canvas: Point): void {
	const layer = target.doc.layer(id);
	if (layer === null || layer.parent === null) {
		return;
	}
	const container = target.doc.layer(layer.parent);
	if (container === null) {
		return;
	}
	const point = parentPointOf(target, id, canvas);
	if (container.layout.kind === "flex") {
		reorder(target, layer, container.layout.direction, point);
	} else if (container.layout.kind === "grid") {
		recell(target, layer, cellAt(container, container.layout, point));
	}
}
