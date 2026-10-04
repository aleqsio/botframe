import type { GuideAxis } from "../../document/guides";
import type { Layer, LayerId } from "../../document/layer";
import type { DisplayMode } from "../../document/layout";
import type { Point, StagePoint } from "../state/camera";
import type { LayerMove } from "../state/userState";
import { drawnFrom } from "./drawn";
import type { DrawnBox } from "./drawn";
import { anchoredPlace } from "./layerSpace";
import { NO_POSE } from "../../document/linear";
import type { Modifiers } from "./modifiers";
import { freeAxesOf, placedOn } from "./snapAxes";
import { publishPull, pulledTo } from "./snapPull";
import type { SnapPull } from "./snapPull";
import { snapShapeOf } from "./snapShape";
import { parentPointOf } from "./targetSpace";
import type { PointerTarget } from "./tool";

interface DraggedBox {
	drawn: Layer;
	axes: readonly GuideAxis[];
}

export interface Carry {
	lift: Point;
	placed: boolean;
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

function liftOf(box: DraggedBox, placed: Point, slot: DrawnBox | null): Carry {
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

export function carryLayer(
	target: PointerTarget,
	move: LayerMove,
	point: StagePoint,
	modifiers: Modifiers,
): Carry {
	const layer = target.doc.layer(move.id);
	if (layer === null) {
		return { lift: IN_PLACE, placed: true };
	}
	const display = displayOf(target, move.parent);
	const slot = target.drawn.box(layer);
	const drawn = drawnFrom(layer, display, slot);
	const box = { drawn, axes: freeAxesOf(display, layer.layout.position) };
	const wanted = anchoredPlace(drawn, move.anchor, parentPointOf(target, move.id, point.canvas));
	const pull = pullFor(move, box, wanted);
	const pulled = pulledTo(target, pull, wanted, modifiers);
	publishPull(target, pull, pulled.segments);
	const placed = pulled.point;
	if (box.axes.length > 0) {
		const held = { x: placed.x - drawn.x + layer.x, y: placed.y - drawn.y + layer.y };
		target.doc.update(move.id, placedOn(box.axes, held));
	}
	return liftOf(box, placed, slot);
}
