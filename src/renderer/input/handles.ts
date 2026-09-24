import type { Layer, Rect } from "../../document/layer";
import type { Point } from "../state/camera";
import { fromParentPoint, halfSizeOf, toLayerPoint } from "./layerSpace";
import type { Placed } from "./layerSpace";

export const HANDLE_SIZE = 8;
export const CORNER_GRACE = 11;
export const EDGE_GRACE = 7;
export const ROTATE_REACH = 34;

type Vertical = "n" | "s";
type Horizontal = "w" | "e";
type ZoneMode = "resize" | "rotate";

export type Corner = `${Vertical}${Horizontal}`;
export type Handle = Corner | Vertical | Horizontal;

export interface HandleZone {
	mode: ZoneMode;
	handle: Handle;
}

export interface Axis {
	x: number;
	y: number;
}

export const CORNERS: readonly Corner[] = ["nw", "ne", "se", "sw"];

export const HANDLE_AXIS: Readonly<Record<Handle, Axis>> = {
	nw: { x: -1, y: -1 },
	n: { x: 0, y: -1 },
	ne: { x: 1, y: -1 },
	e: { x: 1, y: 0 },
	se: { x: 1, y: 1 },
	s: { x: 0, y: 1 },
	sw: { x: -1, y: 1 },
	w: { x: -1, y: 0 },
};

function alongEdge(direction: number, extent: number): number {
	return ((direction + 1) / 2) * extent;
}

export function handlePointOf(start: Layer, rect: Rect, handle: Handle): Point {
	const axis = HANDLE_AXIS[handle];
	const local = { x: alongEdge(axis.x, rect.width), y: alongEdge(axis.y, rect.height) };
	return fromParentPoint([{ ...start, ...rect }], local);
}

function cornerOf(local: Point): Corner {
	const vertical: Vertical = local.y < 0 ? "n" : "s";
	const horizontal: Horizontal = local.x < 0 ? "w" : "e";
	return `${vertical}${horizontal}`;
}

function cornerReach(local: Point, half: Point): number {
	return Math.hypot(Math.abs(local.x) - half.x, Math.abs(local.y) - half.y);
}

function edgeOf(local: Point, half: Point, grace: number): Handle | null {
	const alongX = Math.abs(local.x) <= half.x + grace;
	const alongY = Math.abs(local.y) <= half.y + grace;
	if (alongX && Math.abs(Math.abs(local.y) - half.y) <= grace) {
		return local.y < 0 ? "n" : "s";
	}
	if (alongY && Math.abs(Math.abs(local.x) - half.x) <= grace) {
		return local.x < 0 ? "w" : "e";
	}
	return null;
}

function isOutside(local: Point, half: Point): boolean {
	return Math.abs(local.x) > half.x || Math.abs(local.y) > half.y;
}

export function zoneAt(layer: Placed, point: Point, zoom: number): HandleZone | null {
	const local = toLayerPoint(layer, point);
	const half = halfSizeOf(layer);
	const reach = cornerReach(local, half);
	if (reach <= CORNER_GRACE / zoom) {
		return { mode: "resize", handle: cornerOf(local) };
	}
	const edge = edgeOf(local, half, EDGE_GRACE / zoom);
	if (edge !== null) {
		return { mode: "resize", handle: edge };
	}
	if (isOutside(local, half) && reach <= ROTATE_REACH / zoom) {
		return { mode: "rotate", handle: cornerOf(local) };
	}
	return null;
}
