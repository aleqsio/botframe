import type { GuideAxis } from "../../document/guides";
import type { LayerId } from "../../document/layer";
import type { Point } from "../state/camera";
import type { Modifiers } from "./modifiers";
import { SNAP_REACH, snapSegmentsOf, snapTo, snappedPoint } from "./snap";
import type { SnapField } from "./snap";
import { snapOn } from "./snapAxes";
import type { PointerTarget } from "./tool";

export interface SnapPull {
	field: SnapField;
	axes: readonly GuideAxis[];
	parent: LayerId | null;
	points: readonly Point[];
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
	const snap = snapOn(pull.axes, snapTo(pull.field, pull.points, reach));
	const segments = snapSegmentsOf(snap, pull.field.span);
	target.user.snap.set(segments.length === 0 ? null : { parent: pull.parent, segments });
	return snappedPoint(wanted, snap);
}
