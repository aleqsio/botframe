import type { Layer, LayerId, Rect } from "../../document/layer";
import type { Point } from "../state/camera";
import { partOf } from "./groupResize";
import { intoLayer } from "./layerSpace";
import type { Modifiers } from "./modifiers";
import { snapFieldOf } from "./snap";
import type { SnapSegment } from "./snap";
import { BOTH_AXES } from "./snapAxes";
import { publishPull, pulledTo } from "./snapPull";
import type { SnapPull } from "./snapPull";
import { drawnReaderOf } from "./targetSpace";
import type { PointerTarget } from "./tool";

const NO_INSET = { top: 0, right: 0, bottom: 0, left: 0 };

function boxPull(
	span: Pick<Rect, "width" | "height">,
	points: readonly Point[],
	parent: LayerId | null,
): SnapPull {
	const container = { span, inset: NO_INSET, guides: [] };
	return {
		field: snapFieldOf({ points, curves: [], container }),
		axes: BOTH_AXES,
		turn: 0,
		parent,
		points: [],
	};
}

export function snappedInLayer(
	target: PointerTarget,
	layer: Layer,
	point: Point,
	modifiers: Modifiers,
): Point {
	const local = intoLayer(layer, point);
	const pull = { ...boxPull(layer, [], layer.id), points: [local] };
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
}

export function snappedInBox(
	target: PointerTarget,
	{ ids, box }: PivotGroup,
	canvas: Point,
	modifiers: Modifiers,
): Point {
	const read = drawnReaderOf(target);
	const centers = ids.flatMap((id) =>
		partOf(read, id).map(({ center }) => ({ x: center.x - box.x, y: center.y - box.y })),
	);
	const wanted = { x: canvas.x - box.x, y: canvas.y - box.y };
	const pull = { ...boxPull(box, centers, null), points: [wanted] };
	const pulled = pulledTo(target, pull, wanted, modifiers);
	const segments = pulled.segments.map((segment) => shifted(segment, box));
	target.user.snap.set(segments.length === 0 ? null : { parent: null, segments });
	return { x: pulled.point.x + box.x, y: pulled.point.y + box.y };
}
