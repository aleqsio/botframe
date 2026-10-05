import { describe, expect, it } from "vitest";
import { pixelBox } from "../../document/documentFixtures";
import { SKEW_LIMIT } from "../../document/layer";
import type { Layer } from "../../document/layer";
import type { Point } from "../state/camera";
import { outOfLayer } from "./layerSpace";
import { NO_MODIFIERS } from "./modifiers";
import type { Modifiers } from "./modifiers";
import { SKEW_OFFSET, skewMarksOf, skewZoneAt, skewedPatch } from "./skewHandle";
import type { SkewGrip } from "./skewHandle";

const BOX = { x: 100, y: 100, width: 200, height: 100 };
const LAYER: Layer = {
	id: "1@1",
	...BOX,
	...pixelBox(BOX),
	rotation: 0,
	skewX: 0,
	skewY: 0,
	mirrored: false,
	fill: "#000000",
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: false },
	name: "",
	clip: false,
	parent: null,
};
const TOP_HANDLE = { x: 200, y: 100 - SKEW_OFFSET };
const RIGHT_HANDLE = { x: 300 + SKEW_OFFSET, y: 150 };
const NOWHERE = { x: 0, y: 0 };
const ALT: Modifiers = { ...NO_MODIFIERS, alt: true };
const SHIFT: Modifiers = { ...NO_MODIFIERS, shift: true };

function rounded(point: Point): Point {
	return { x: Math.round(point.x * 1e6) / 1e6 + 0, y: Math.round(point.y * 1e6) / 1e6 + 0 };
}

function grab(start: Layer, edge: SkewGrip["edge"], from: Point): SkewGrip {
	return { start, edge, from };
}

function applied(grip: SkewGrip, to: Point, modifiers: Modifiers = NO_MODIFIERS): Layer {
	return { ...grip.start, ...skewedPatch(grip, to, modifiers) };
}

function markOf(layer: Layer, edge: SkewGrip["edge"]): { at: Point; outward: Point } {
	return (
		skewMarksOf([layer], 1).find((mark) => mark.edge === edge) ?? { at: NOWHERE, outward: NOWHERE }
	);
}

describe("skewZoneAt", () => {
	it("takes the middle of each edge, a short way out from the edge", () => {
		expect(skewZoneAt([LAYER], TOP_HANDLE, 1)).toEqual({ mode: "skew", handle: "n" });
		expect(skewZoneAt([LAYER], { x: 200, y: 200 + SKEW_OFFSET }, 1)?.handle).toBe("s");
		expect(skewZoneAt([LAYER], RIGHT_HANDLE, 1)?.handle).toBe("e");
		expect(skewZoneAt([LAYER], { x: 100 - SKEW_OFFSET, y: 150 }, 1)?.handle).toBe("w");
	});

	it("keeps the distance from the edge the same on the screen at each zoom", () => {
		expect(skewZoneAt([LAYER], { x: 200, y: 100 - SKEW_OFFSET / 4 }, 4)).not.toBeNull();
		expect(skewZoneAt([LAYER], TOP_HANDLE, 4)).toBeNull();
	});

	it("shows no mark on an edge too short to hold one outside the rotate zone", () => {
		const small = { ...LAYER, width: 40, height: 30 };

		expect(skewMarksOf([small], 1)).toEqual([]);
		expect(skewMarksOf([small], 2)).toHaveLength(4);
		expect(skewZoneAt([small], { x: 120, y: 100 - SKEW_OFFSET }, 1)).toBeNull();
	});

	it("does not take the edge itself or the middle of the layer", () => {
		expect(skewZoneAt([LAYER], { x: 200, y: 100 }, 1)).toBeNull();
		expect(skewZoneAt([LAYER], { x: 200, y: 150 }, 1)).toBeNull();
	});
});

describe("skewMarksOf", () => {
	it("puts each mark straight out from its edge, also when the layer leans", () => {
		const leaned = { ...LAYER, skewX: 45 };
		const top = markOf(leaned, "n");

		expect(rounded(top.outward)).toEqual({ x: 0, y: -1 });
		expect(rounded(top.at)).toEqual(rounded(outOfLayer(leaned, { x: 100, y: 0 })));
	});

	it("turns the marks of the top and the bottom edge with a vertical skew", () => {
		const leaned = { ...LAYER, skewY: 45 };

		expect(rounded(markOf(leaned, "e").outward)).toEqual({ x: 1, y: 0 });
		expect(markOf(leaned, "n").outward.x).toBeCloseTo(Math.SQRT1_2);
		expect(markOf(leaned, "n").outward.y).toBeCloseTo(-Math.SQRT1_2);
	});
});

describe("skewedPatch", () => {
	it("leans the top edge after the pointer and holds the bottom edge in place", () => {
		const moved = { x: TOP_HANDLE.x + 100, y: TOP_HANDLE.y };

		const placed = applied(grab(LAYER, "n", TOP_HANDLE), moved);

		expect(placed.skewX).toBeCloseTo(-45);
		expect(rounded(outOfLayer(placed, { x: 100, y: 100 }))).toEqual({ x: 200, y: 200 });
		expect(rounded(outOfLayer(placed, { x: 100, y: 0 }))).toEqual({ x: 300, y: 100 });
	});

	it("leans the right edge down after the pointer and holds the left edge in place", () => {
		const moved = { x: RIGHT_HANDLE.x, y: RIGHT_HANDLE.y + 50 };

		const placed = applied(grab(LAYER, "e", RIGHT_HANDLE), moved);

		expect(placed.skewY).toBeCloseTo(14.04, 1);
		expect(rounded(outOfLayer(placed, { x: 0, y: 50 }))).toEqual({ x: 100, y: 150 });
		expect(rounded(outOfLayer(placed, { x: 200, y: 50 }))).toEqual({ x: 300, y: 200 });
	});

	it("leans both edges about the middle with alt, and does not step the skew", () => {
		const placed = applied(grab(LAYER, "n", TOP_HANDLE), { x: TOP_HANDLE.x + 12, y: 0 }, ALT);

		expect(placed.skewX).toBeCloseTo(-13.5, 0);
		expect(rounded(outOfLayer(placed, { x: 100, y: 50 }))).toEqual({ x: 200, y: 150 });
	});

	it("leans a mirrored layer after the pointer on each axis", () => {
		const mirrored = { ...LAYER, mirrored: true };
		const top = applied(grab(mirrored, "n", TOP_HANDLE), { x: TOP_HANDLE.x + 100, y: 0 });
		const right = applied(grab(mirrored, "w", RIGHT_HANDLE), {
			x: RIGHT_HANDLE.x,
			y: RIGHT_HANDLE.y + 50,
		});

		expect(rounded(outOfLayer(top, { x: 100, y: 0 }))).toEqual({ x: 300, y: 100 });
		expect(rounded(outOfLayer(right, { x: 0, y: 50 }))).toEqual({ x: 300, y: 200 });
	});

	it("steps the skew with shift", () => {
		const placed = applied(grab(LAYER, "n", TOP_HANDLE), { x: TOP_HANDLE.x + 30, y: 0 }, SHIFT);

		expect(Math.abs(placed.skewX) % 5).toBe(0);
	});

	it("holds the skew inside the limit of the document", () => {
		const placed = applied(grab(LAYER, "n", TOP_HANDLE), { x: TOP_HANDLE.x + 1e6, y: 0 });

		expect(placed.skewX).toBe(-SKEW_LIMIT);
	});

	it("follows the pointer along the edge of a turned layer", () => {
		const turned = { ...LAYER, rotation: 90 };
		const handle = outOfLayer(turned, { x: 100, y: -SKEW_OFFSET });
		const moved = outOfLayer(turned, { x: 200, y: -SKEW_OFFSET });

		expect(applied(grab(turned, "n", handle), moved).skewX).toBeCloseTo(-45);
	});
});
