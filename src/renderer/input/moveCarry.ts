import type { GuideAxis } from "../../document/guides";
import type { Layer, LayerId } from "../../document/layer";
import type { DisplayMode } from "../../document/layout";
import type { Point, StagePoint } from "../state/camera";
import type { LayerMove } from "../state/userState";
import type { Modifiers } from "./modifiers";
import { SNAP_REACH, snapSegmentsOf, snapTo, snappedPoint } from "./snap";
import { freeAxesOf, placedOn, snapOn } from "./snapAxes";
import { snapShapeOf } from "./snapShape";
import { drawnReaderOf, parentPointOf } from "./targetSpace";
import type { PointerTarget } from "./tool";

interface DraggedBox {
	drawn: Layer;
	axes: readonly GuideAxis[];
}

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

export function carryLayer(
	target: PointerTarget,
	move: LayerMove,
	point: StagePoint,
	modifiers: Modifiers,
): void {
	const layer = target.doc.layer(move.id);
	const drawn = drawnReaderOf(target)(move.id);
	if (layer === null || drawn === null) {
		return;
	}
	const box = {
		drawn,
		axes: freeAxesOf(displayOf(target, move.parent), layer.layout.position),
	};
	const origin = parentPointOf(target, move.id, point.canvas);
	const slot = { x: drawn.x - layer.x, y: drawn.y - layer.y };
	const wanted = { x: origin.x - move.offset.x + slot.x, y: origin.y - move.offset.y + slot.y };
	if (modifiers.control) {
		target.user.snap.set(null);
	}
	const placed = modifiers.control ? wanted : snappedPlace(target, move, box, wanted);
	if (box.axes.length > 0) {
		target.doc.update(move.id, placedOn(box.axes, { x: placed.x - slot.x, y: placed.y - slot.y }));
	}
}
