import { describe, expect, it } from "vitest";
import type { Point } from "../state/camera";
import { crossingsOf, snapFieldOf, snapSegmentsOf, snapTo as snapAt, snappedPoint } from "./snap";
import type { FieldSpec, Snap, SnapField } from "./snap";
import type { Curve } from "./snapShape";

const REACH = 5;
const NO_INSET = { top: 0, right: 0, bottom: 0, left: 0 };
const CONTAINER = {
	span: { width: 300, height: 200 },
	inset: NO_INSET,
	guides: [{ axis: "y" as const, at: 40 }],
};

const DIAGONAL: Curve = { kind: "segment", from: { x: 0, y: 0 }, to: { x: 10, y: 10 } };
const FLAT: Curve = { kind: "segment", from: { x: 0, y: 5 }, to: { x: 10, y: 5 } };
const CIRCLE: Extract<Curve, { kind: "arc" }> = {
	kind: "arc",
	center: { x: 100, y: 100 },
	radii: { x: 50, y: 50 },
	turn: 0,
	from: 0,
	to: 360,
};
const TURNED: Curve = {
	kind: "arc",
	center: { x: 0, y: 0 },
	radii: { x: 100, y: 50 },
	turn: 90,
	from: 0,
	to: 360,
};

function fieldWith(spec: Partial<FieldSpec>): SnapField {
	return snapFieldOf({ points: [], curves: [], container: null, ...spec });
}

function snapTo(field: SnapField, points: readonly Point[]): Snap {
	return snapAt(field, points, REACH);
}

function rising(values: readonly number[]): number[] {
	return values.toSorted((first, second) => first - second);
}

function offCircle(point: Point): number {
	const gap = { x: point.x - CIRCLE.center.x, y: point.y - CIRCLE.center.y };
	return gap.x ** 2 + gap.y ** 2 - CIRCLE.radii.x ** 2;
}

describe("crossingsOf", () => {
	it("cuts a diagonal segment where the other axis holds the value", () => {
		expect(crossingsOf(DIAGONAL, "x", 4)).toEqual([4]);
		expect(crossingsOf(DIAGONAL, "y", 7)).toEqual([7]);
	});

	it("gives nothing where the line lies past an end of the segment", () => {
		expect(crossingsOf(DIAGONAL, "x", 14)).toEqual([]);
		expect(crossingsOf(DIAGONAL, "x", -1)).toEqual([]);
	});

	it("gives nothing for a segment that runs along the line", () => {
		expect(crossingsOf(FLAT, "x", 5)).toEqual([]);
		expect(crossingsOf(FLAT, "x", 7)).toEqual([]);
	});

	it("cuts a circle twice where the line goes through it", () => {
		expect(rising(crossingsOf(CIRCLE, "x", 100))).toEqual([50, 150]);
		const near = rising(crossingsOf(CIRCLE, "x", 130));
		expect(near[0]).toBeCloseTo(60);
		expect(near[1]).toBeCloseTo(140);
	});

	it("gives nothing for a line that misses the circle", () => {
		expect(crossingsOf(CIRCLE, "x", 160)).toEqual([]);
	});

	it("cuts an ellipse that a turn of a quarter stands on end", () => {
		const across = rising(crossingsOf(TURNED, "x", 0));
		expect(across[0]).toBeCloseTo(-50);
		expect(across[1]).toBeCloseTo(50);
		const along = rising(crossingsOf(TURNED, "y", 25));
		expect(along[0]).toBeCloseTo(-86.6025);
		expect(along[1]).toBeCloseTo(86.6025);
	});

	it("drops the solution that the sweep of the arc leaves out", () => {
		const cuts = crossingsOf({ ...CIRCLE, to: 90 }, "x", 130);
		expect(cuts).toHaveLength(1);
		expect(cuts[0]).toBeCloseTo(140);
	});
});

describe("snapTo", () => {
	it("matches the nearest point on each axis on its own", () => {
		const field = fieldWith({
			points: [
				{ x: 100, y: 0 },
				{ x: 0, y: 53 },
			],
		});

		const snap = snapTo(field, [{ x: 103, y: 50 }]);

		expect(snap.x?.delta).toBe(-3);
		expect(snap.y?.delta).toBe(3);
	});

	it("gives nothing for a point that lies beyond the reach", () => {
		const field = fieldWith({ points: [{ x: 100, y: 100 }] });
		expect(snapTo(field, [{ x: 106, y: 94 }])).toEqual({ x: null, y: null });
	});

	it("takes the smallest move among all of the dragged points", () => {
		const field = fieldWith({ points: [{ x: 100, y: 100 }] });
		const snap = snapTo(field, [
			{ x: 96, y: 100 },
			{ x: 102, y: 100 },
		]);
		expect(snap.x?.delta).toBe(-2);
		expect(snap.x?.point).toEqual({ x: 102, y: 100 });
	});

	it("matches the edges, the center, and the guides of the container", () => {
		const field = fieldWith({ container: CONTAINER });
		expect(snapTo(field, [{ x: 148, y: 4 }]).x?.delta).toBe(2);
		expect(snapTo(field, [{ x: 296, y: 4 }]).x?.delta).toBe(4);
		expect(snapTo(field, [{ x: 148, y: 4 }]).y?.delta).toBe(-4);
		expect(snapTo(field, [{ x: 148, y: 43 }]).y?.delta).toBe(-3);
	});

	it("finds the nearest target in a large sorted field", () => {
		const points = Array.from({ length: 1000 }, (_, index) => ({ x: index * 10, y: 0 }));
		const field = fieldWith({ points });
		expect(snapTo(field, [{ x: 5004, y: 999 }]).x?.target.at).toBe(5000);
		expect(snapTo(field, [{ x: -2, y: 999 }]).x?.target.at).toBe(0);
		expect(snapTo(field, [{ x: 9993, y: 999 }]).x?.target.at).toBe(9990);
	});

	it("takes a crossing of a curve that lies nearer than every point", () => {
		const field = fieldWith({ points: [{ x: 0, y: 0 }], curves: [CIRCLE] });
		const snap = snapTo(field, [{ x: 148, y: 100 }]);
		expect(snap.x?.delta).toBeCloseTo(2);
		expect(snap.x?.target.at).toBeCloseTo(150);
	});

	it("gives the other coordinate of the dragged point to a match on a curve", () => {
		const snap = snapTo(fieldWith({ curves: [CIRCLE] }), [{ x: 148, y: 100 }]);
		expect(snap.x?.target.other).toBe(100);
	});

	it("gives nothing for a curve that lies beyond the reach", () => {
		const field = fieldWith({ curves: [CIRCLE] });
		expect(snapTo(field, [{ x: 300, y: 100 }])).toEqual({ x: null, y: null });
		expect(snapTo(field, [{ x: 158, y: 100 }])).toEqual({ x: null, y: null });
	});

	it("solves the crossing again at the coordinate that the other axis snaps to", () => {
		const field = fieldWith({ points: [{ x: 0, y: 97 }], curves: [CIRCLE] });
		const dragged = { x: 148, y: 100 };

		const snap = snapTo(field, [dragged]);

		expect(snap.y?.delta).toBe(-3);
		expect(snap.x?.target.other).toBe(97);
		expect(snap.x?.target.at).toBeCloseTo(149.90991);
		expect(offCircle(snappedPoint(dragged, snap))).toBeCloseTo(0, 6);
	});

	it("keeps only the nearer axis when both of them match a curve", () => {
		const snap = snapTo(fieldWith({ curves: [CIRCLE] }), [{ x: 138, y: 136 }]);

		expect(snap.y).toBeNull();
		expect(snap.x?.delta).toBeCloseTo(-3.3013);
	});

	it("drops the curve axis when the new crossing lies beyond the reach", () => {
		const field = fieldWith({ points: [{ x: 0, y: 5 }], curves: [DIAGONAL] });

		const snap = snapTo(field, [{ x: 10.5, y: 9 }]);

		expect(snap.x).toBeNull();
		expect(snap.y?.delta).toBe(-4);
	});
});

describe("snappedPoint", () => {
	it("moves the wanted point by the delta of each match", () => {
		const snap: Snap = {
			x: {
				delta: 2,
				target: { axis: "x", at: 10, other: null, curve: null },
				point: { x: 8, y: 0 },
			},
			y: null,
		};
		expect(snappedPoint({ x: 30, y: 40 }, snap)).toEqual({ x: 32, y: 40 });
	});
});

describe("snapSegmentsOf", () => {
	it("draws a segment from the dragged point to the matched point", () => {
		const snap = snapTo(fieldWith({ points: [{ x: 100, y: 100 }] }), [{ x: 103, y: 20 }]);
		expect(snapSegmentsOf(snap, null)).toEqual([{ axis: "x", at: 100, from: 20, to: 100 }]);
	});

	it("draws a line across the container for an edge or a guide", () => {
		const snap = snapTo(fieldWith({ container: CONTAINER }), [{ x: 2, y: 42 }]);
		expect(snapSegmentsOf(snap, CONTAINER.span)).toEqual([
			{ axis: "x", at: 0, from: 0, to: 200 },
			{ axis: "y", at: 40, from: 0, to: 300 },
		]);
	});

	it("moves the reached end of a segment by the match on the other axis", () => {
		const field = fieldWith({
			points: [
				{ x: 100, y: 0 },
				{ x: 0, y: 200 },
			],
		});
		const snap = snapTo(field, [{ x: 102, y: 203 }]);
		expect(snapSegmentsOf(snap, null)).toEqual([
			{ axis: "x", at: 100, from: 0, to: 200 },
			{ axis: "y", at: 200, from: 0, to: 100 },
		]);
	});

	it("draws a segment of no length for a match on a curve", () => {
		const snap = snapTo(fieldWith({ curves: [CIRCLE] }), [{ x: 148, y: 100 }]);
		expect(snapSegmentsOf(snap, null)).toEqual([{ axis: "x", at: 150, from: 100, to: 100 }]);
	});
});
