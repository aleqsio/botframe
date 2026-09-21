import type { GuideAxis } from "../../document/guides";
import type { Layer, LayerId } from "../../document/layer";
import type { DisplayMode } from "../../document/layout";
import type { Point, StagePoint } from "../state/camera";
import type { LayerMove } from "../state/userState";
import { drawnFrom } from "./drawn";
import type { DrawnBox } from "./drawn";
import { anchoredPlace } from "./layerSpace";
import type { Modifiers } from "./modifiers";
import { SNAP_REACH, snapSegmentsOf, snapTo, snappedPoint } from "./snap";
import { freeAxesOf, placedOn, snapOn } from "./snapAxes";
import { snapShapeOf } from "./snapShape";
import { parentPointOf } from "./targetSpace";
import type { PointerTarget } from "./tool";

interface DraggedBox {
	drawn: Layer;
	axes: readonly GuideAxis[];
}

const IN_PLACE: Point = { x: 0, y: 0 };

function displayOf(target: PointerTarget, parent: LayerId | null): DisplayMode | null {
	return parent === null ? null : (target.doc.layer(parent)?.layout.display ?? null);
}

function snappedPlace(
	target: PointerTarget,
	move: LayerMove,
	box: DraggedBox,
	wanted: Point,
): Point {
	const reach = SNAP_REACH / target.user.camera.get().zoom;
	const points = snapShapeOf({ ...box.drawn, ...wanted }).points;
	const snap = snapOn(box.axes, snapTo(move.field, points, reach));
	const segments = snapSegmentsOf(snap, move.field.span);
	target.user.snap.set(segments.length === 0 ? null : { parent: box.drawn.parent, segments });
	return snappedPoint(wanted, snap);
}

function liftOf(box: DraggedBox, placed: Point, slot: DrawnBox | null): Point {
	if (slot === null || !slot.placed) {
		return IN_PLACE;
	}
	return {
		x: box.axes.includes("x") ? 0 : placed.x - box.drawn.x,
		y: box.axes.includes("y") ? 0 : placed.y - box.drawn.y,
	};
}

export function carryLayer(
	target: PointerTarget,
	move: LayerMove,
	point: StagePoint,
	modifiers: Modifiers,
): Point {
	const layer = target.doc.layer(move.id);
	if (layer === null) {
		return IN_PLACE;
	}
	const display = displayOf(target, move.parent);
	const slot = target.drawn.box(layer);
	const drawn = drawnFrom(layer, display, slot);
	const box = { drawn, axes: freeAxesOf(display, layer.layout.position) };
	const wanted = anchoredPlace(drawn, move.anchor, parentPointOf(target, move.id, point.canvas));
	if (modifiers.control) {
		target.user.snap.set(null);
	}
	const placed = modifiers.control ? wanted : snappedPlace(target, move, box, wanted);
	if (box.axes.length > 0) {
		const held = { x: placed.x - drawn.x + layer.x, y: placed.y - drawn.y + layer.y };
		target.doc.update(move.id, placedOn(box.axes, held));
	}
	return liftOf(box, placed, slot);
}
