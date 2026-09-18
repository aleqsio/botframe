import { describe, expect, it } from "vitest";
import type { Point } from "../state/camera";
import { snapFieldOf, snapSegmentsOf, snapTo as snapAt, snappedPoint } from "./snap";
import type { FieldSpec, Snap, SnapField } from "./snap";

const REACH = 5;
const CONTAINER = { span: { width: 300, height: 200 }, guides: [{ axis: "y" as const, at: 40 }] };

function fieldWith(spec: Partial<FieldSpec>): SnapField {
	return snapFieldOf({ points: [], container: null, ...spec });
}

function snapTo(field: SnapField, points: readonly Point[]): Snap {
	return snapAt(field, points, REACH);
}

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
});

describe("snappedPoint", () => {
	it("moves the wanted point by the delta of each match", () => {
		const snap: Snap = {
			x: { delta: 2, target: { axis: "x", at: 10, other: null }, point: { x: 8, y: 0 } },
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
});
