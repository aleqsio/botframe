import { describe, expect, it } from "vitest";
import type { Pose } from "./layer";
import { applyLinear, invertLinear, linearOf, multiplyLinear, poseOf } from "./linear";

const POSES: readonly Pose[] = [
	{ rotation: 0, skewX: 0, skewY: 0, mirrored: false },
	{ rotation: 30, skewX: 0, skewY: 0, mirrored: true },
	{ rotation: -75, skewX: 20, skewY: 0, mirrored: false },
	{ rotation: 120, skewX: -35, skewY: 0, mirrored: true },
	{ rotation: 10, skewX: 0, skewY: 25, mirrored: false },
	{ rotation: -150, skewX: 30, skewY: -40, mirrored: true },
];

describe("poseOf", () => {
	it("gives back the pose that made the linear map, of the two that draw it", () => {
		for (const pose of POSES) {
			expect(poseOf(linearOf(pose), pose)).toEqual(pose);
		}
	});

	it("keeps a turn and a mirror in exact degrees", () => {
		const turned = linearOf({ rotation: 30, skewX: 0, skewY: 0, mirrored: false });
		const mirrored = linearOf({ rotation: 0, skewX: 0, skewY: 0, mirrored: true });
		expect(poseOf(multiplyLinear(mirrored, turned))).toEqual({
			rotation: -30,
			skewX: 0,
			skewY: 0,
			mirrored: true,
		});
	});
});

describe("a chain of linear maps", () => {
	it("gives a turn and two skews that draw the same map when a turned parent holds a skewed layer", () => {
		const outer = linearOf({ rotation: 40, skewX: 0, skewY: 0, mirrored: true });
		const inner = linearOf({ rotation: 30, skewX: 20, skewY: -15, mirrored: false });
		const seen = multiplyLinear(outer, inner);
		const back = linearOf(poseOf(seen));

		for (const key of ["a", "b", "c", "d"] as const) {
			expect(back[key]).toBeCloseTo(seen[key]);
		}
	});
});

describe("linearOf", () => {
	it("leans the y axis along x by the tangent of the skew", () => {
		const leaned = applyLinear(linearOf({ rotation: 0, skewX: 45, skewY: 0, mirrored: false }), {
			x: 0,
			y: 10,
		});
		expect(leaned.x).toBeCloseTo(10);
		expect(leaned.y).toBeCloseTo(10);
	});

	it("gives the point back through the inverse", () => {
		const linear = linearOf({ rotation: 120, skewX: -35, skewY: 0, mirrored: true });
		const back = applyLinear(invertLinear(linear), applyLinear(linear, { x: 3, y: 7 }));
		expect(back.x).toBeCloseTo(3);
		expect(back.y).toBeCloseTo(7);
	});
});
