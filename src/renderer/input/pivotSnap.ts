import type { Layer, LayerId, Rect } from "../../document/layer";
import type { Point } from "../state/camera";
import { NO_INSET } from "./drawn";
import { fromParentPoint, intoLayer, parentChain, visualCenterOf } from "./layerSpace";
import { NO_POSE } from "../../document/linear";
import type { Modifiers } from "./modifiers";
import { snapFieldOf } from "./snap";
import type { SnapField, SnapSegment } from "./snap";
import { BOTH_AXES } from "./snapAxes";
import { publishPull, pulledTo } from "./snapPull";
import type { SnapPull } from "./snapPull";
import { drawnReaderOf } from "./targetSpace";
import type { PointerTarget } from "./tool";

function boxField(span: Pick<Rect, "width" | "height">, points: readonly Point[]): SnapField {
	return snapFieldOf({ points, curves: [], container: { span, inset: NO_INSET, guides: [] } });
}

function pullOf(field: SnapField, parent: LayerId | null, dragged: Point): SnapPull {
	return { field, axes: BOTH_AXES, pose: NO_POSE, parent, points: [dragged] };
}

export function snappedInLayer(
	target: PointerTarget,
	layer: Layer,
	point: Point,
	modifiers: Modifiers,
): Point {
	const local = intoLayer(layer, point);
	const pull = pullOf(boxField(layer, []), layer.id, local);
	const pulled = pulledTo(target, pull, local, modifiers);
	publishPull(target, pull, pulled.segments);
	return pulled.point;
}

function shifted(segment: SnapSegment, box: Rect): SnapSegment {
	const along = segment.axis === "x" ? box.y : box.x;
	const across = segment.axis === "x" ? box.x : box.y;
	return {
		...segment,
		at: segment.at + across,
		from: segment.from + along,
		to: segment.to + along,
	};
}

export interface PivotGroup {
	ids: readonly LayerId[];
	box: Rect;
	field: SnapField;
}

export function pivotGroupOf(
	target: PointerTarget,
	ids: readonly LayerId[],
	box: Rect,
): PivotGroup {
	const read = drawnReaderOf(target);
	const centers = ids.flatMap((id) => {
		const layer = read(id);
		if (layer === null) {
			return [];
		}
		const center = fromParentPoint(parentChain(read, id), visualCenterOf(layer));
		return [{ x: center.x - box.x, y: center.y - box.y }];
	});
	return { ids, box, field: boxField(box, centers) };
}

export function snappedInBox(
	target: PointerTarget,
	{ box, field }: PivotGroup,
	canvas: Point,
	modifiers: Modifiers,
): Point {
	const wanted = { x: canvas.x - box.x, y: canvas.y - box.y };
	const pull = pullOf(field, null, wanted);
	const pulled = pulledTo(target, pull, wanted, modifiers);
	const segments = pulled.segments.map((segment) => shifted(segment, box));
	publishPull(target, pull, segments);
	return { x: pulled.point.x + box.x, y: pulled.point.y + box.y };
}
