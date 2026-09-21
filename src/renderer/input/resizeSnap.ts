import type { Layer, Rect } from "../../document/layer";
import type { Point } from "../state/camera";
import { handlePointOf } from "./handles";
import type { Handle } from "./handles";
import type { Modifiers } from "./modifiers";
import type { SnapField } from "./snap";
import { handleAxesOf } from "./snapAxes";
import { snapFieldAround } from "./snapField";
import { pulledPoint } from "./snapPull";
import type { SnapPull } from "./snapPull";
import type { PointerTarget } from "./tool";
import { resizedRect } from "./transform";

export interface ResizeGrip {
	start: Layer;
	handle: Handle;
	field: SnapField;
}

export function resizeGripOf(target: PointerTarget, start: Layer, handle: Handle): ResizeGrip {
	return { start, handle, field: snapFieldAround(target, start.id) };
}

function pullFor(grip: ResizeGrip, rect: Rect): SnapPull {
	return {
		field: grip.field,
		axes: handleAxesOf(grip.handle),
		turn: grip.start.rotation,
		parent: grip.start.parent,
		points: [handlePointOf(grip.start, rect, grip.handle)],
	};
}

export function snappedResize(
	target: PointerTarget,
	grip: ResizeGrip,
	point: Point,
	modifiers: Modifiers,
): Rect {
	const raw = resizedRect(grip.start, grip.handle, point, modifiers);
	const pulled = pulledPoint(target, pullFor(grip, raw), point, modifiers);
	return resizedRect(grip.start, grip.handle, pulled, modifiers);
}
