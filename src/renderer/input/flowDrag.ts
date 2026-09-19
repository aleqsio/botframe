import type { Layer, Rect } from "../../document/layer";
import type { DisplayMode } from "../../document/layout";
import { outOfFlow } from "../layerStyle";
import type { Point } from "../state/camera";
import type { LayerMove } from "../state/userState";
import { drawnRead } from "./drawn";
import { recellInGrid } from "./gridDrag";
import { parentPointOf, readerOf } from "./targetSpace";
import type { PointerTarget } from "./tool";

type Axis = "x" | "y";

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

function otherBoxes(target: PointerTarget, layer: Layer): Rect[] {
	const read = drawnRead(readerOf(target));
	return target.doc.siblingIds(layer.parent).flatMap((id) => {
		const sibling = id === layer.id ? null : read(id);
		return sibling === null ? [] : [sibling];
	});
}

function reorderInFlow(
	target: PointerTarget,
	layer: Layer,
	display: "row" | "column",
	point: Point,
): void {
	const wanted = flowIndexOf(otherBoxes(target, layer), display, point);
	const held = target.doc.siblingIds(layer.parent).indexOf(layer.id);
	if (wanted !== held) {
		target.doc.move(layer.id, layer.parent, wanted);
	}
}

export function settleInFlow(target: PointerTarget, move: LayerMove, canvas: Point): void {
	const layer = target.doc.layer(move.id);
	const display = move.parent === null ? null : target.doc.layer(move.parent)?.layout.display;
	const origin = parentPointOf(target, move.id, canvas);
	if (layer === null || display === undefined || !laysOutInFlow(display ?? null, layer)) {
		target.user.lift.set(null);
		return;
	}
	target.user.lift.set({
		id: move.id,
		at: { x: origin.x - move.grab.x, y: origin.y - move.grab.y },
	});
	if (display === "row" || display === "column") {
		reorderInFlow(target, layer, display, origin);
	} else if (display === "grid" && move.parent !== null) {
		recellInGrid(target, layer, move.parent, origin);
	}
}
