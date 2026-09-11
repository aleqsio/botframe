import type { Layer, Rect } from "../../document/layer";
import type { Point } from "../state/camera";
import { HANDLE_AXIS } from "./handles";
import type { Axis, Handle } from "./handles";
import {
	angleFrom,
	centerOf,
	halfSizeOf,
	normalizeDegrees,
	rotatePoint,
	toLayerPoint,
} from "./layerSpace";
import type { Modifiers } from "./modifiers";
import { ANGLE_SNAP, stepOf } from "./step";

export const MIN_LAYER_SIZE = 1;

function halfExtent(direction: number, half: number, moved: number, fromCenter: boolean): number {
	if (direction === 0) {
		return half;
	}
	const extent = fromCenter ? Math.abs(moved) : (moved * direction + half) / 2;
	return Math.max(extent, MIN_LAYER_SIZE / 2);
}

function aspectScale(next: Point, half: Point, axis: Axis): number {
	const alongX = half.x === 0 ? 1 : next.x / half.x;
	const alongY = half.y === 0 ? 1 : next.y / half.y;
	if (axis.x === 0) {
		return alongY;
	}
	if (axis.y === 0) {
		return alongX;
	}
	return Math.max(alongX, alongY);
}

function withAspect(next: Point, half: Point, axis: Axis): Point {
	const scale = aspectScale(next, half, axis);
	return {
		x: Math.max(half.x * scale, MIN_LAYER_SIZE / 2),
		y: Math.max(half.y * scale, MIN_LAYER_SIZE / 2),
	};
}

function centerShift(direction: number, half: number, next: number, fromCenter: boolean): number {
	return direction === 0 || fromCenter ? 0 : direction * (next - half);
}

export function resizedRect(
	start: Layer,
	handle: Handle,
	point: Point,
	modifiers: Modifiers,
): Rect {
	const axis = HANDLE_AXIS[handle];
	const half = halfSizeOf(start);
	const local = toLayerPoint(start, point);
	const dragged = {
		x: halfExtent(axis.x, half.x, local.x, modifiers.alt),
		y: halfExtent(axis.y, half.y, local.y, modifiers.alt),
	};
	const next = modifiers.shift ? withAspect(dragged, half, axis) : dragged;
	const shift = {
		x: centerShift(axis.x, half.x, next.x, modifiers.alt),
		y: centerShift(axis.y, half.y, next.y, modifiers.alt),
	};
	const pivot = centerOf(start);
	const moved = rotatePoint(shift, start.rotation);
	const center = { x: pivot.x + moved.x, y: pivot.y + moved.y };
	return { x: center.x - next.x, y: center.y - next.y, width: next.x * 2, height: next.y * 2 };
}

export function scaledRect(start: Layer, factor: number): Rect {
	const smallest = Math.min(start.width, start.height);
	const applied = Math.max(factor, Math.min(1, MIN_LAYER_SIZE / smallest));
	const width = start.width * applied;
	const height = start.height * applied;
	const center = centerOf(start);
	return { x: center.x - width / 2, y: center.y - height / 2, width, height };
}

export function rotatedDegrees(
	start: Layer,
	origin: Point,
	point: Point,
	modifiers: Modifiers,
): number {
	const center = centerOf(start);
	const turned = start.rotation + angleFrom(center, point) - angleFrom(center, origin);
	const step = stepOf(ANGLE_SNAP, modifiers);
	return normalizeDegrees(step === 0 ? turned : Math.round(turned / step) * step);
}
