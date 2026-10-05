import type { Layer, LayerId, Rect } from "../../document/layer";
import type { DisplayMode } from "../../document/layout";
import { outOfFlow } from "../layerStyle";
import type { Point } from "../state/camera";
import { movedIds } from "../state/userState";
import type { LayerMove } from "../state/userState";
import { recellInGrid } from "./gridDrag";
import type { Carry } from "./moveCarry";
import { drawnReaderOf, parentPointOf } from "./targetSpace";
import type { PointerTarget } from "./tool";

type Axis = "x" | "y";

interface FlowPlace {
	display: "row" | "column";
	point: Point;
}

const MAIN_AXIS: Readonly<Record<"row" | "column", Axis>> = { row: "x", column: "y" };
const SIZE_OF: Readonly<Record<Axis, "width" | "height">> = { x: "width", y: "height" };

function middleOn(box: Rect, axis: Axis): number {
	return box[axis] + box[SIZE_OF[axis]] / 2;
}

function beforeThePoint(box: Rect, point: Point, main: Axis, cross: Axis): boolean {
	const far = box[cross] + box[SIZE_OF[cross]];
	if (point[cross] > far) {
		return true;
	}
	return point[cross] < box[cross] ? false : middleOn(box, main) < point[main];
}

export function flowIndexOf(
	boxes: readonly Rect[],
	display: "row" | "column",
	point: Point,
): number {
	const main = MAIN_AXIS[display];
	const cross = main === "x" ? "y" : "x";
	return boxes.filter((box) => beforeThePoint(box, point, main, cross)).length;
}

function laysOutInFlow(display: DisplayMode | null, layer: Layer): boolean {
	return display !== null && display !== "block" && !outOfFlow(display, layer.layout.position);
}

function boxesOf(target: PointerTarget, ids: readonly LayerId[]): Rect[] {
	const read = drawnReaderOf(target);
	return ids.flatMap((id) => read(id) ?? []);
}

function arranged(
	target: PointerTarget,
	parent: LayerId | null,
	order: readonly LayerId[],
): boolean {
	let changed = false;
	for (const [index, id] of order.entries()) {
		if (target.doc.siblingIds(parent)[index] !== id) {
			changed = target.doc.move(id, parent, index) || changed;
		}
	}
	return changed;
}

function reorderInFlow(
	target: PointerTarget,
	move: LayerMove,
	layer: Layer,
	place: FlowPlace,
): boolean {
	const moved = new Set(movedIds(move));
	const siblings = target.doc.siblingIds(layer.parent);
	const others = siblings.filter((id) => !moved.has(id));
	const block = siblings.filter((id) => moved.has(id));
	const wanted = flowIndexOf(boxesOf(target, others), place.display, place.point);
	const order = [...others.slice(0, wanted), ...block, ...others.slice(wanted)];
	return arranged(target, layer.parent, order);
}

function flowDisplayOf(target: PointerTarget, move: LayerMove, layer: Layer): DisplayMode | null {
	const parent = move.parent === null ? null : target.doc.layer(move.parent);
	const display = parent?.layout.display ?? null;
	return laysOutInFlow(display, layer) ? display : null;
}

function replaceInFlow(
	target: PointerTarget,
	move: LayerMove,
	layer: Layer,
	{ display, point }: { display: DisplayMode; point: Point },
): boolean {
	if (display === "row" || display === "column") {
		return reorderInFlow(target, move, layer, { display, point });
	}
	return (
		display === "grid" && layer.parent !== null && recellInGrid(target, layer, layer.parent, point)
	);
}

export function settleInFlow(
	target: PointerTarget,
	move: LayerMove,
	canvas: Point,
	carry: Carry,
): boolean {
	const layer = target.doc.layer(move.id);
	const display = layer === null ? null : flowDisplayOf(target, move, layer);
	if (layer === null || display === null) {
		target.user.lift.set(null);
		return false;
	}
	const origin = parentPointOf(target, move.id, canvas);
	target.user.lift.set({ id: move.id, at: carry.lift });
	const replaced = replaceInFlow(target, move, layer, { display, point: origin });
	return replaced || !carry.placed;
}
