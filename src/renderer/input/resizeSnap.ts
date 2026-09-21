import type { Layer, Rect } from "../../document/layer";
import type { Point } from "../state/camera";
import { handlePointOf } from "./handles";
import type { Handle } from "./handles";
import type { Modifiers } from "./modifiers";
import type { SnapField, SnapSegment } from "./snap";
import { handleAxesOf } from "./snapAxes";
import { snapFieldAround } from "./snapField";
import { NO_SEGMENTS, publishPull, pulledTo } from "./snapPull";
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

const LINE_GRACE = 0.005;

function onTheLine(segments: readonly SnapSegment[], landed: Point): boolean {
	return segments.every((segment) => Math.abs(landed[segment.axis] - segment.at) <= LINE_GRACE);
}

export function snappedResize(
	target: PointerTarget,
	grip: ResizeGrip,
	point: Point,
	modifiers: Modifiers,
): Rect {
	const raw = resizedRect(grip.start, grip.handle, point, modifiers);
	const pull = pullFor(grip, raw);
	const pulled = pulledTo(target, pull, point, modifiers);
	const rect = resizedRect(grip.start, grip.handle, pulled.point, modifiers);
	const honored = onTheLine(pulled.segments, handlePointOf(grip.start, rect, grip.handle));
	publishPull(target, pull, honored ? pulled.segments : NO_SEGMENTS);
	return honored ? rect : raw;
}
