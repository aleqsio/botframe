import type { GuideAxis } from "../../document/guides";
import type { LayerId } from "../../document/layer";
import type { Point } from "../state/camera";
import { rotatePoint } from "./layerSpace";
import type { Modifiers } from "./modifiers";
import { SNAP_REACH, snapSegmentsOf, snapTo, snappedPoint } from "./snap";
import type { Snap, SnapField } from "./snap";
import { snapOn } from "./snapAxes";
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

const NO_AXES: readonly GuideAxis[] = [];
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

function alongCarrier(wanted: Point, carrier: Point, snap: Snap): Point {
	const delta = (snap.x?.delta ?? 0) + (snap.y?.delta ?? 0);
	return { x: wanted.x + delta * carrier.x, y: wanted.y + delta * carrier.y };
}

function pulledAlong(wanted: Point, travel: Travel, snap: Snap): Point {
	return travel.carrier === null
		? snappedPoint(wanted, snap)
		: alongCarrier(wanted, travel.carrier, snap);
}

export function pulledPoint(
	target: PointerTarget,
	pull: SnapPull,
	wanted: Point,
	modifiers: Modifiers,
): Point {
	if (modifiers.control) {
		target.user.snap.set(null);
		return wanted;
	}
	const reach = SNAP_REACH / target.user.camera.get().zoom;
	const travel = travelOf(pull);
	const snap = snapOn(travel.axes, snapTo(pull.field, pull.points, reach));
	const segments = snapSegmentsOf(snap, pull.field.span);
	target.user.snap.set(segments.length === 0 ? null : { parent: pull.parent, segments });
	return pulledAlong(wanted, travel, snap);
}
