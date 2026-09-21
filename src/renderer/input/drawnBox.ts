import type { Rect } from "../../document/layer";
import type { Size } from "../../document/length";
import type { Point } from "../state/camera";

export interface Linear {
	a: number;
	b: number;
	c: number;
	d: number;
}

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

function apply(linear: Linear, point: Point): Point {
	return {
		x: linear.a * point.x + linear.c * point.y,
		y: linear.b * point.x + linear.d * point.y,
	};
}

export function multiply(outer: Linear, inner: Linear): Linear {
	return {
		a: outer.a * inner.a + outer.c * inner.b,
		b: outer.b * inner.a + outer.d * inner.b,
		c: outer.a * inner.c + outer.c * inner.d,
		d: outer.b * inner.c + outer.d * inner.d,
	};
}

function inverse(linear: Linear): Linear | null {
	const det = linear.a * linear.d - linear.b * linear.c;
	if (det === 0 || !Number.isFinite(det)) {
		return null;
	}
	return { a: linear.d / det, b: -linear.b / det, c: -linear.c / det, d: linear.a / det };
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
		apply(read.chain, halfOf(read.parent.size)),
	);
	const turnedCenter = apply(undo, minus(centerOf(read.child.rect), parentShift));
	const spin = apply(read.own, minus(halfOf(read.child.size), read.origin));
	return {
		x: turnedCenter.x - read.own.e - read.origin.x - spin.x,
		y: turnedCenter.y - read.own.f - read.origin.y - spin.y,
		...read.child.size,
	};
}
