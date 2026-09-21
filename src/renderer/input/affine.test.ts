import { describe, expect, it } from "vitest";
import { applyAffine, applyLinear, rectMap, shiftBy, turnAbout } from "./affine";

const POINT = { x: 10, y: 20 };

function rounded(point: { x: number; y: number }): { x: number; y: number } {
	return { x: Math.round(point.x * 1000) / 1000 + 0, y: Math.round(point.y * 1000) / 1000 + 0 };
}

describe("shiftBy", () => {
	it("moves a point by the delta", () => {
		expect(applyAffine(shiftBy({ x: 5, y: -3 }), POINT)).toEqual({ x: 15, y: 17 });
	});

	it("leaves a direction alone", () => {
		expect(applyLinear(shiftBy({ x: 5, y: -3 }), POINT)).toEqual(POINT);
	});
});

describe("turnAbout", () => {
	it("keeps the pivot in place", () => {
		expect(rounded(applyAffine(turnAbout(POINT, 90), POINT))).toEqual(POINT);
	});

	it("turns a point a quarter turn around the pivot", () => {
		expect(rounded(applyAffine(turnAbout({ x: 0, y: 0 }, 90), { x: 1, y: 0 }))).toEqual({
			x: 0,
			y: 1,
		});
		expect(rounded(applyAffine(turnAbout(POINT, 180), { x: 20, y: 20 }))).toEqual({ x: 0, y: 20 });
	});
});

describe("rectMap", () => {
	it("maps the corners of one box onto the corners of the other", () => {
		const affine = rectMap(
			{ x: 0, y: 0, width: 100, height: 50 },
			{ x: 10, y: 20, width: 200, height: 25 },
		);

		expect(applyAffine(affine, { x: 0, y: 0 })).toEqual({ x: 10, y: 20 });
		expect(applyAffine(affine, { x: 100, y: 50 })).toEqual({ x: 210, y: 45 });
		expect(applyLinear(affine, { x: 1, y: 1 })).toEqual({ x: 2, y: 0.5 });
	});

	it("keeps a box with no width or height in place", () => {
		const affine = rectMap(
			{ x: 5, y: 5, width: 0, height: 0 },
			{ x: 5, y: 5, width: 0, height: 0 },
		);

		expect(applyAffine(affine, { x: 5, y: 5 })).toEqual({ x: 5, y: 5 });
	});
});
