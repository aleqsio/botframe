import type { Layer, Pose, Rect } from "../../document/layer";
import type { Point } from "../state/camera";
import { centerOf, halfSizeOf, poseInside, toParentPoint } from "./layerSpace";
import { NO_POSE, linearOf } from "../../document/linear";
import type { Modifiers } from "./modifiers";
import { MIN_LAYER_SIZE } from "./transform";

export const DEFAULT_DRAW_SIZE = 100;

export type DrawnRect = Rect & Partial<Pose>;

interface Span {
	start: number;
	size: number;
}

function directionOf(extent: number): number {
	return extent < 0 ? -1 : 1;
}

function squared(extent: Point): Point {
	const side = Math.max(Math.abs(extent.x), Math.abs(extent.y));
	return { x: directionOf(extent.x) * side, y: directionOf(extent.y) * side };
}

function extentOf(origin: Point, point: Point, modifiers: Modifiers): Point {
	const extent = { x: point.x - origin.x, y: point.y - origin.y };
	return modifiers.shift ? squared(extent) : extent;
}

function spanOf(origin: number, extent: number, fromCenter: boolean): Span {
	const reach = Math.abs(extent) * (fromCenter ? 2 : 1);
	const size = Math.max(reach, MIN_LAYER_SIZE);
	if (fromCenter) {
		return { start: origin - size / 2, size };
	}
	return { start: extent < 0 ? origin - size : origin, size };
}

export function drawnRect(origin: Point, point: Point, modifiers: Modifiers): Rect {
	const extent = extentOf(origin, point, modifiers);
	const across = spanOf(origin.x, extent.x, modifiers.alt);
	const down = spanOf(origin.y, extent.y, modifiers.alt);
	return { x: across.start, y: down.start, width: across.size, height: down.size };
}

export function tappedRect(point: Point): Rect {
	return { x: point.x, y: point.y, width: DEFAULT_DRAW_SIZE, height: DEFAULT_DRAW_SIZE };
}

export function levelRect(chain: readonly Layer[], rect: Rect): DrawnRect {
	const center = toParentPoint(chain, centerOf(rect));
	const half = halfSizeOf(rect);
	return {
		x: center.x - half.x,
		y: center.y - half.y,
		width: rect.width,
		height: rect.height,
		...poseInside(chain, linearOf(NO_POSE), NO_POSE),
	};
}
