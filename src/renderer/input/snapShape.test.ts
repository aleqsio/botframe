import { describe, expect, it } from "vitest";
import { pixelBox } from "../../document/documentFixtures";
import type { Geometry, Layer } from "../../document/layer";
import type { Point } from "../state/camera";
import { SNAP_REPORTERS, snapShapeOf } from "./snapShape";
import type { Curve } from "./snapShape";

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

const PLAIN: Geometry = { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: false };
const ROUNDED: Geometry = { ...PLAIN, cornerRadius: 6 };

function pointsOf(layer: Layer): readonly Point[] {
	return snapShapeOf(layer).points;
}

function curvesOf(layer: Layer): readonly Curve[] {
	return snapShapeOf(layer).curves;
}

function segmentEndsOf(layer: Layer): Point[] {
	return curvesOf(layer).flatMap((curve) =>
		curve.kind === "segment" ? [curve.from, curve.to] : [],
	);
}

describe("the points of snapShapeOf", () => {
	it("gives the corners, the edge middles, and the center of a rectangle", () => {
		const points = pointsOf(layerWith(PLAIN));
		expect(points).toHaveLength(9);
		expect(points).toContainEqual({ x: 100, y: 50 });
		expect(points).toContainEqual({ x: 140, y: 70 });
		expect(points).toContainEqual({ x: 120, y: 60 });
		expect(points).toContainEqual({ x: 120, y: 50 });
		expect(points).toContainEqual({ x: 100, y: 60 });
	});

	it("adds the points where the rounding of a corner starts", () => {
		const points = pointsOf(layerWith(ROUNDED));
		expect(points).toHaveLength(17);
		expect(points).toContainEqual({ x: 106, y: 50 });
		expect(points).toContainEqual({ x: 134, y: 50 });
		expect(points).toContainEqual({ x: 140, y: 56 });
		expect(points).toContainEqual({ x: 100, y: 64 });
	});

	it("limits the rounding to half of the shorter side", () => {
		const points = pointsOf(layerWith({ ...PLAIN, cornerRadius: 100 }));
		expect(points).toContainEqual({ x: 110, y: 50 });
		expect(points).toContainEqual({ x: 130, y: 50 });
	});

	it("gives the center and the four extremes of an ellipse, not the corners", () => {
		const points = pointsOf(layerWith({ kind: "ellipse" }));
		expect(points).toHaveLength(5);
		expect(points).toContainEqual({ x: 120, y: 60 });
		expect(points).toContainEqual({ x: 140, y: 60 });
		expect(points).not.toContainEqual({ x: 100, y: 50 });
	});

	it("gives the box of a path and of a shape it does not know", () => {
		expect(pointsOf(layerWith({ kind: "path", d: "M0 0" }))).toHaveLength(5);
		expect(pointsOf(layerWith({ kind: "unsupported" }))).toHaveLength(5);
	});

	it("turns the points with the layer", () => {
		const points = pointsOf(layerWith(PLAIN, 90));
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

describe("the curves of snapShapeOf", () => {
	it("gives the four whole edges of a rectangle that has no rounding", () => {
		const curves = curvesOf(layerWith(PLAIN));
		expect(curves).toHaveLength(4);
		expect(curves).toContainEqual({
			kind: "segment",
			from: { x: 100, y: 50 },
			to: { x: 140, y: 50 },
		});
		expect(curves).toContainEqual({
			kind: "segment",
			from: { x: 140, y: 70 },
			to: { x: 100, y: 70 },
		});
	});

	it("cuts each edge back and adds a quarter arc at each corner of a rounded rectangle", () => {
		const curves = curvesOf(layerWith(ROUNDED));
		expect(curves.filter((curve) => curve.kind === "segment")).toHaveLength(4);
		expect(curves.filter((curve) => curve.kind === "arc")).toHaveLength(4);
		expect(curves).toContainEqual({
			kind: "segment",
			from: { x: 106, y: 50 },
			to: { x: 134, y: 50 },
		});
		expect(curves).toContainEqual({
			kind: "arc",
			center: { x: 106, y: 56 },
			radii: { x: 6, y: 6 },
			turn: 0,
			from: 180,
			to: 270,
		});
	});

	it("gives one full arc for an ellipse", () => {
		expect(curvesOf(layerWith({ kind: "ellipse" }))).toEqual([
			{
				kind: "arc",
				center: { x: 120, y: 60 },
				radii: { x: 20, y: 10 },
				turn: 0,
				from: 0,
				to: 360,
			},
		]);
	});

	it("gives the four box edges of a path and of a shape it does not know", () => {
		expect(curvesOf(layerWith({ kind: "path", d: "M0 0" }))).toHaveLength(4);
		expect(curvesOf(layerWith({ kind: "unsupported" }))).toHaveLength(4);
	});

	it("turns the two ends of a segment with the layer", () => {
		const ends = segmentEndsOf(layerWith(PLAIN, 90));
		expect(ends[0]?.x).toBeCloseTo(130);
		expect(ends[0]?.y).toBeCloseTo(40);
		expect(ends[1]?.x).toBeCloseTo(130);
		expect(ends[1]?.y).toBeCloseTo(80);
	});

	it("adds the rotation of the layer to the turn of an arc", () => {
		expect(curvesOf(layerWith({ kind: "ellipse" }, 30))[0]).toMatchObject({
			kind: "arc",
			center: { x: 120, y: 60 },
			turn: 30,
		});
	});
});
