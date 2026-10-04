import type { Rect } from "./layer";
import type { Origin, Pose } from "./layer";
import type { Size } from "./length";
import { applyLinear, invertLinear, linearOf } from "./linear";
import type { Point } from "./linear";

export interface Turned extends Size, Pose {
	origin: Origin;
}

export type Placed = Turned & Rect;

export function pivotOf(layer: Turned): Point {
	return { x: layer.origin.x * layer.width, y: layer.origin.y * layer.height };
}

export function posePoint(point: Point, pose: Pose): Point {
	return applyLinear(linearOf(pose), point);
}

function unposePoint(point: Point, pose: Pose): Point {
	return applyLinear(invertLinear(linearOf(pose)), point);
}

export function intoLayer(layer: Placed, point: Point): Point {
	const pivot = pivotOf(layer);
	const turned = unposePoint(
		{ x: point.x - layer.x - pivot.x, y: point.y - layer.y - pivot.y },
		layer,
	);
	return { x: turned.x + pivot.x, y: turned.y + pivot.y };
}

export function outOfLayer(layer: Placed, local: Point): Point {
	const pivot = pivotOf(layer);
	const turned = posePoint({ x: local.x - pivot.x, y: local.y - pivot.y }, layer);
	return { x: layer.x + pivot.x + turned.x, y: layer.y + pivot.y + turned.y };
}

export type Corners = readonly [Point, Point, Point, Point];

export function cornersOf(box: Size): Corners {
	return [
		{ x: 0, y: 0 },
		{ x: box.width, y: 0 },
		{ x: box.width, y: box.height },
		{ x: 0, y: box.height },
	];
}

export function hullOf(points: readonly [Point, ...Point[]]): Rect {
	let [low] = points;
	let high = low;
	for (const point of points) {
		low = { x: Math.min(low.x, point.x), y: Math.min(low.y, point.y) };
		high = { x: Math.max(high.x, point.x), y: Math.max(high.y, point.y) };
	}
	return { x: low.x, y: low.y, width: high.x - low.x, height: high.y - low.y };
}

export function turnedBounds(layer: Turned): Rect {
	const flat = { ...layer, x: 0, y: 0 };
	const [first, ...rest] = cornersOf(layer);
	return hullOf([outOfLayer(flat, first), ...rest.map((corner) => outOfLayer(flat, corner))]);
}

export function anchoredPlace(layer: Turned, anchor: Point, point: Point): Point {
	const pivot = pivotOf(layer);
	const turned = posePoint(
		{ x: anchor.x * layer.width - pivot.x, y: anchor.y * layer.height - pivot.y },
		layer,
	);
	return { x: point.x - pivot.x - turned.x, y: point.y - pivot.y - turned.y };
}
