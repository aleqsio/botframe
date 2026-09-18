import { describe, expect, it } from "vitest";
import { pixelBox } from "../../document/documentFixtures";
import type { Geometry, Layer } from "../../document/layer";
import { SNAP_REPORTERS, snapPointsOf } from "./snapPoints";

function layerWith(geometry: Geometry, rotation = 0): Layer {
	return {
		id: "1@1",
		parent: null,
		x: 100,
		y: 50,
		width: 40,
		height: 20,
		rotation,
		fill: "#000000",
		name: "",
		clip: false,
		geometry,
		...pixelBox({ x: 100, y: 50, width: 40, height: 20 }),
	};
}

const PLAIN: Geometry = { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: false };
const ROUNDED: Geometry = { ...PLAIN, cornerRadius: 6 };

describe("snapPointsOf", () => {
	it("gives the corners, the edge middles, and the center of a rectangle", () => {
		const points = snapPointsOf(layerWith(PLAIN));
		expect(points).toHaveLength(9);
		expect(points).toContainEqual({ x: 100, y: 50 });
		expect(points).toContainEqual({ x: 140, y: 70 });
		expect(points).toContainEqual({ x: 120, y: 60 });
		expect(points).toContainEqual({ x: 120, y: 50 });
		expect(points).toContainEqual({ x: 100, y: 60 });
	});

	it("adds the points where the rounding of a corner starts", () => {
		const points = snapPointsOf(layerWith(ROUNDED));
		expect(points).toHaveLength(17);
		expect(points).toContainEqual({ x: 106, y: 50 });
		expect(points).toContainEqual({ x: 134, y: 50 });
		expect(points).toContainEqual({ x: 140, y: 56 });
		expect(points).toContainEqual({ x: 100, y: 64 });
	});

	it("limits the rounding to half of the shorter side", () => {
		const points = snapPointsOf(layerWith({ ...PLAIN, cornerRadius: 100 }));
		expect(points).toContainEqual({ x: 110, y: 50 });
		expect(points).toContainEqual({ x: 130, y: 50 });
	});

	it("gives the center and the four extremes of an ellipse, not the corners", () => {
		const points = snapPointsOf(layerWith({ kind: "ellipse" }));
		expect(points).toHaveLength(5);
		expect(points).toContainEqual({ x: 120, y: 60 });
		expect(points).toContainEqual({ x: 140, y: 60 });
		expect(points).not.toContainEqual({ x: 100, y: 50 });
	});

	it("gives the box of a path and of a shape it does not know", () => {
		expect(snapPointsOf(layerWith({ kind: "path", d: "M0 0" }))).toHaveLength(5);
		expect(snapPointsOf(layerWith({ kind: "unsupported" }))).toHaveLength(5);
	});

	it("turns the points with the layer", () => {
		const points = snapPointsOf(layerWith(PLAIN, 90));
		const left = points.filter((point) => Math.abs(point.x - 110) < 0.001).map((point) => point.y);
		expect(left.toSorted((first, second) => first - second)).toEqual([40, 60, 80]);
		expect(points.map((point) => point.x)).not.toContain(100);
	});

	it("has a reporter for each geometry kind", () => {
		expect(Object.keys(SNAP_REPORTERS).toSorted()).toEqual([
			"ellipse",
			"path",
			"rectangle",
			"unsupported",
		]);
	});
});
