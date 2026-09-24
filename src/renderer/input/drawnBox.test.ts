import { describe, expect, it } from "vitest";
import type { Rect } from "../../document/layer";
import type { Point } from "../state/camera";
import { IDENTITY, layoutBox } from "./drawnBox";
import type { Affine, BoxRead, ClientBox } from "./drawnBox";
import { multiplyLinear } from "./linear";
import type { Linear } from "./linear";

const PARENT_SIZE = { width: 100, height: 60 };
const THIRD = 100 / 3;
const CHILD_SIZE = { width: THIRD, height: 60 };
const RADIANS = Math.PI / 180;
const DIGITS = 6;

interface Space {
	chain: Linear;
	shift: Point;
	own: Affine;
	origin: Point;
}

const STILL: Space = {
	chain: IDENTITY,
	shift: { x: 0, y: 0 },
	own: IDENTITY,
	origin: { x: 0, y: 0 },
};

function turn(degrees: number): Linear {
	const cos = Math.cos(degrees * RADIANS);
	const sin = Math.sin(degrees * RADIANS);
	return { a: cos, b: sin, c: -sin, d: cos };
}

function scale(factor: number): Linear {
	return { a: factor, b: 0, c: 0, d: factor };
}

function mapped(linear: Linear, shift: Point, point: Point): Point {
	return {
		x: linear.a * point.x + linear.c * point.y + shift.x,
		y: linear.b * point.x + linear.d * point.y + shift.y,
	};
}

function boundsOf(rect: Rect, linear: Linear, shift: Point): Rect {
	const corners = [
		{ x: rect.x, y: rect.y },
		{ x: rect.x + rect.width, y: rect.y },
		{ x: rect.x, y: rect.y + rect.height },
		{ x: rect.x + rect.width, y: rect.y + rect.height },
	].map((corner) => mapped(linear, shift, corner));
	const xs = corners.map((corner) => corner.x);
	const ys = corners.map((corner) => corner.y);
	const x = Math.min(...xs);
	const y = Math.min(...ys);
	return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

function closeTo(rect: Rect): Record<keyof Rect, unknown> {
	return {
		x: expect.closeTo(rect.x, DIGITS),
		y: expect.closeTo(rect.y, DIGITS),
		width: expect.closeTo(rect.width, DIGITS),
		height: expect.closeTo(rect.height, DIGITS),
	};
}

function parentOn(chain: Linear, shift: Point): ClientBox {
	return {
		rect: boundsOf({ x: 0, y: 0, ...PARENT_SIZE }, chain, shift),
		size: PARENT_SIZE,
	};
}

function readOf(box: Rect, space: Space): BoxRead {
	const { chain, shift, own, origin } = space;
	const turned = boundsOf(box, { a: own.a, b: own.b, c: own.c, d: own.d }, { x: 0, y: 0 });
	const pivot = mapped(own, { x: 0, y: 0 }, { x: box.x + origin.x, y: box.y + origin.y });
	const placed = {
		...turned,
		x: turned.x + box.x + origin.x + own.e - pivot.x,
		y: turned.y + box.y + origin.y + own.f - pivot.y,
	};
	return {
		child: { rect: boundsOf(placed, chain, shift), size: box },
		parent: parentOn(chain, shift),
		chain,
		own,
		origin,
	};
}

describe("layoutBox", () => {
	it("reads a fractional box straight from the client rects when nothing is transformed", () => {
		const box = { x: THIRD, y: 0, ...CHILD_SIZE };

		expect(layoutBox(readOf(box, STILL))).toEqual(closeTo(box));
	});

	it("undoes the zoom and the pan of the viewport", () => {
		const box = { x: THIRD, y: 0, ...CHILD_SIZE };
		const zoomed = { ...STILL, chain: scale(32), shift: { x: 5, y: 7 } };

		expect(layoutBox(readOf(box, zoomed))).toEqual(closeTo(box));
	});

	it("takes the lift of a dragged child out of its rect", () => {
		const box = { x: THIRD, y: 0, ...CHILD_SIZE };
		const lifted = { ...STILL, own: { ...IDENTITY, e: 70, f: -3 } };

		expect(layoutBox(readOf(box, lifted))).toEqual(closeTo(box));
	});

	it("takes the turn of a child about its origin out of its rect", () => {
		const box = { x: 10, y: 10, width: 40, height: 20 };
		const turned = { ...STILL, own: { ...turn(90), e: 0, f: 0 }, origin: { x: 40, y: 0 } };
		const read = readOf(box, turned);

		expect(read.child.rect).toEqual(closeTo({ x: 30, y: -30, width: 20, height: 40 }));
		expect(layoutBox(read)).toEqual(closeTo(box));
	});

	it("undoes a turned and zoomed parent chain around a lifted and turned child", () => {
		const box = { x: 10, y: 20, width: 30, height: 50 };
		const space = {
			chain: multiplyLinear(scale(2), turn(30)),
			shift: { x: 100, y: 50 },
			own: { ...turn(45), e: 12, f: -8 },
			origin: { x: 15, y: 25 },
		};

		expect(layoutBox(readOf(box, space))).toEqual(closeTo(box));
	});

	it("gives no box when the chain cannot be undone", () => {
		const box = { x: 0, y: 0, ...CHILD_SIZE };

		expect(layoutBox(readOf(box, { ...STILL, chain: scale(0) }))).toBeNull();
	});
});
