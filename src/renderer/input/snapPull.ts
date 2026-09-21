import type { GuideAxis } from "../../document/guides";
import type { LayerId } from "../../document/layer";
import type { Point } from "../state/camera";
import { rotatePoint } from "./layerSpace";
import type { Modifiers } from "./modifiers";
import { SNAP_REACH, snapSegmentsOf, snapTo, snappedPoint } from "./snap";
import type { Snap, SnapField, SnapSegment } from "./snap";
import { NO_AXES, snapOn } from "./snapAxes";
import type { PointerTarget } from "./tool";

export interface SnapPull {
	field: SnapField;
	axes: readonly GuideAxis[];
	turn: number;
	parent: LayerId | null;
	points: readonly Point[];
}

interface Travel {
	axes: readonly GuideAxis[];
	carrier: Point | null;
}

const UNIT: Readonly<Record<GuideAxis, Point>> = { x: { x: 1, y: 0 }, y: { x: 0, y: 1 } };
const PARALLEL = 1e-6;

function travelOf(pull: SnapPull): Travel {
	const [only, second] = pull.axes;
	if (only === undefined || second !== undefined) {
		return { axes: pull.axes, carrier: null };
	}
	const along = rotatePoint(UNIT[only], pull.turn);
	const reach = along[only];
	if (Math.abs(reach) < PARALLEL) {
		return { axes: NO_AXES, carrier: null };
	}
	return { axes: pull.axes, carrier: { x: along.x / reach, y: along.y / reach } };
}

function pulledAlong(wanted: Point, travel: Travel, snap: Snap): Point {
	const { carrier } = travel;
	if (carrier === null) {
		return snappedPoint(wanted, snap);
	}
	const delta = (snap.x?.delta ?? 0) + (snap.y?.delta ?? 0);
	return { x: wanted.x + delta * carrier.x, y: wanted.y + delta * carrier.y };
}

export interface Pulled {
	point: Point;
	segments: readonly SnapSegment[];
}

export const NO_SEGMENTS: readonly SnapSegment[] = [];

export function pulledTo(
	target: PointerTarget,
	pull: SnapPull,
	wanted: Point,
	modifiers: Modifiers,
): Pulled {
	if (modifiers.control) {
		return { point: wanted, segments: NO_SEGMENTS };
	}
	const reach = SNAP_REACH / target.user.camera.get().zoom;
	const travel = travelOf(pull);
	const snap = snapOn(travel.axes, snapTo(pull.field, pull.points, reach));
	return {
		point: pulledAlong(wanted, travel, snap),
		segments: snapSegmentsOf(snap, pull.field.span),
	};
}

export function publishPull(
	target: PointerTarget,
	pull: SnapPull,
	segments: readonly SnapSegment[],
): void {
	target.user.snap.set(segments.length === 0 ? null : { parent: pull.parent, segments });
}
