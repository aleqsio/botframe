import type { GuideAxis } from "../../document/guides";
import type { Layer, LayerId } from "../../document/layer";
import type { DisplayMode } from "../../document/layout";
import type { Point, StagePoint } from "../state/camera";
import type { LayerMove } from "../state/userState";
import { drawnFrom } from "./drawn";
import type { DrawnBox } from "./drawn";
import { anchoredPlace, fromParentPoint } from "./layerSpace";
import { NO_POSE } from "../../document/linear";
import type { Modifiers } from "./modifiers";
import { freeAxesOf, placedOn } from "./snapAxes";
import { publishPull, pulledTo } from "./snapPull";
import type { SnapPull } from "./snapPull";
import { snapShapeOf } from "./snapShape";
import { parentChainOf, parentPointOf } from "./targetSpace";
import type { PointerTarget } from "./tool";

interface DraggedBox {
	drawn: Layer;
	axes: readonly GuideAxis[];
}

export interface Carry {
	lift: Point;
	placed: boolean;
	shift: Point;
}

const IN_PLACE: Point = { x: 0, y: 0 };

function displayOf(target: PointerTarget, parent: LayerId | null): DisplayMode | null {
	return parent === null ? null : (target.doc.layer(parent)?.layout.display ?? null);
}

function pullFor(move: LayerMove, box: DraggedBox, wanted: Point): SnapPull {
	return {
		field: move.field,
		axes: box.axes,
		pose: NO_POSE,
		parent: box.drawn.parent,
		points: snapShapeOf({ ...box.drawn, ...wanted }).points,
	};
}

function liftOf(box: DraggedBox, placed: Point, slot: DrawnBox | null): Omit<Carry, "shift"> {
	if (slot === null || !slot.placed) {
		return { lift: IN_PLACE, placed: slot === null };
	}
	return {
		lift: {
			x: box.axes.includes("x") ? 0 : placed.x - box.drawn.x,
			y: box.axes.includes("y") ? 0 : placed.y - box.drawn.y,
		},
		placed: true,
	};
}

function boxOf(target: PointerTarget, layer: Layer, parent: LayerId | null): DraggedBox {
	const display = displayOf(target, parent);
	const drawn = drawnFrom(layer, display, target.drawn.box(layer));
	return { drawn, axes: freeAxesOf(display, layer.layout.position) };
}

function holdAt(target: PointerTarget, layer: Layer, box: DraggedBox, placed: Point): void {
	if (box.axes.length > 0) {
		const held = { x: placed.x - box.drawn.x + layer.x, y: placed.y - box.drawn.y + layer.y };
		target.doc.update(layer.id, placedOn(box.axes, held));
	}
}

function snapShift(target: PointerTarget, box: DraggedBox, wanted: Point, placed: Point): Point {
	const parents = parentChainOf(target, box.drawn.id);
	const from = fromParentPoint(parents, wanted);
	const to = fromParentPoint(parents, {
		x: box.axes.includes("x") ? placed.x : wanted.x,
		y: box.axes.includes("y") ? placed.y : wanted.y,
	});
	return { x: to.x - from.x, y: to.y - from.y };
}

export function carryFollowers(target: PointerTarget, move: LayerMove, canvas: Point): void {
	for (const follower of move.followers) {
		const layer = target.doc.layer(follower.id);
		if (layer !== null) {
			const box = boxOf(target, layer, layer.parent);
			const point = parentPointOf(target, layer.id, canvas);
			holdAt(target, layer, box, anchoredPlace(box.drawn, follower.anchor, point));
		}
	}
}

export function carryLayer(
	target: PointerTarget,
	move: LayerMove,
	point: StagePoint,
	modifiers: Modifiers,
): Carry {
	const layer = target.doc.layer(move.id);
	if (layer === null) {
		return { lift: IN_PLACE, placed: true, shift: IN_PLACE };
	}
	const box = boxOf(target, layer, move.parent);
	const wanted = anchoredPlace(
		box.drawn,
		move.anchor,
		parentPointOf(target, move.id, point.canvas),
	);
	const pull = pullFor(move, box, wanted);
	const pulled = pulledTo(target, pull, wanted, modifiers);
	publishPull(target, pull, pulled.segments);
	const placed = pulled.point;
	holdAt(target, layer, box, placed);
	const shift = snapShift(target, box, wanted, placed);
	return { ...liftOf(box, placed, target.drawn.box(layer)), shift };
}
