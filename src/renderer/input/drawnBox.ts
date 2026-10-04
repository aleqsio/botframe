import type { Rect } from "../../document/layer";
import type { Size } from "../../document/length";
import type { Point } from "../state/camera";
import { applyLinear, determinantOf, invertLinear } from "../../document/linear";
import type { Linear } from "../../document/linear";

export interface Affine extends Linear {
	e: number;
	f: number;
}

export interface ClientBox {
	rect: Rect;
	size: Size;
}

export interface BoxRead {
	child: ClientBox;
	parent: ClientBox;
	chain: Linear;
	own: Affine;
	origin: Point;
}

export const IDENTITY: Affine = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

function inverse(linear: Linear): Linear | null {
	const det = determinantOf(linear);
	return det === 0 || !Number.isFinite(det) ? null : invertLinear(linear);
}

function centerOf(rect: Rect): Point {
	return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function halfOf(size: Size): Point {
	return { x: size.width / 2, y: size.height / 2 };
}

function minus(one: Point, two: Point): Point {
	return { x: one.x - two.x, y: one.y - two.y };
}

export function layoutBox(read: BoxRead): Rect | null {
	const undo = inverse(read.chain);
	if (undo === null) {
		return null;
	}
	const parentShift = minus(
		centerOf(read.parent.rect),
		applyLinear(read.chain, halfOf(read.parent.size)),
	);
	const turnedCenter = applyLinear(undo, minus(centerOf(read.child.rect), parentShift));
	const spin = applyLinear(read.own, minus(halfOf(read.child.size), read.origin));
	return {
		x: turnedCenter.x - read.own.e - read.origin.x - spin.x,
		y: turnedCenter.y - read.own.f - read.origin.y - spin.y,
		...read.child.size,
	};
}
