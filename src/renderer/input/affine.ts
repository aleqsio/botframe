import type { Rect } from "../../document/layer";
import type { Point } from "../state/camera";
import { rotatePoint } from "./layerSpace";

export interface Affine {
	a: number;
	b: number;
	c: number;
	d: number;
	e: number;
	f: number;
}

export function shiftBy(delta: Point): Affine {
	return { a: 1, b: 0, c: 0, d: 1, e: delta.x, f: delta.y };
}

export function turnAbout(pivot: Point, degrees: number): Affine {
	const x = rotatePoint({ x: 1, y: 0 }, degrees);
	const y = rotatePoint({ x: 0, y: 1 }, degrees);
	const moved = rotatePoint(pivot, degrees);
	return { a: x.x, b: x.y, c: y.x, d: y.y, e: pivot.x - moved.x, f: pivot.y - moved.y };
}

export function rectMap(from: Rect, to: Rect): Affine {
	const a = from.width === 0 ? 1 : to.width / from.width;
	const d = from.height === 0 ? 1 : to.height / from.height;
	return { a, b: 0, c: 0, d, e: to.x - a * from.x, f: to.y - d * from.y };
}

export function applyLinear(affine: Affine, vector: Point): Point {
	return {
		x: affine.a * vector.x + affine.c * vector.y,
		y: affine.b * vector.x + affine.d * vector.y,
	};
}

export function applyAffine(affine: Affine, point: Point): Point {
	const moved = applyLinear(affine, point);
	return { x: moved.x + affine.e, y: moved.y + affine.f };
}
