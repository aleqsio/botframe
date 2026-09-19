import { describe, expect, it } from "vitest";
import { freeAxesOf, placedOn, snapOn } from "./snapAxes";

const BOTH = ["x", "y"];

describe("freeAxesOf", () => {
	it("frees both axes at the root and under a block parent", () => {
		expect(freeAxesOf(null, "default")).toEqual(BOTH);
		expect(freeAxesOf("block", "default")).toEqual(BOTH);
	});

	it("frees both axes for an absolute layer in any parent", () => {
		expect(freeAxesOf("row", "absolute")).toEqual(BOTH);
		expect(freeAxesOf("grid", "absolute")).toEqual(BOTH);
	});

	it("frees the cross axis only for an offset layer that a row or a column places", () => {
		expect(freeAxesOf("row", "offset")).toEqual(["y"]);
		expect(freeAxesOf("column", "offset")).toEqual(["x"]);
	});

	it("frees no axis while the parent places the layer", () => {
		expect(freeAxesOf("row", "default")).toEqual([]);
		expect(freeAxesOf("column", "default")).toEqual([]);
		expect(freeAxesOf("grid", "default")).toEqual([]);
		expect(freeAxesOf("grid", "offset")).toEqual([]);
	});
});

describe("placedOn", () => {
	it("writes only the free axes", () => {
		expect(placedOn(["y"], { x: 10, y: 20 })).toEqual({ y: 20 });
		expect(placedOn(["x", "y"], { x: 10, y: 20 })).toEqual({ x: 10, y: 20 });
		expect(placedOn([], { x: 10, y: 20 })).toEqual({});
	});
});

describe("snapOn", () => {
	const MATCH = {
		delta: 2,
		target: { axis: "x" as const, at: 8, other: null, curve: null },
		point: { x: 6, y: 6 },
	};

	it("drops the match of an axis that the parent places", () => {
		expect(snapOn(["y"], { x: MATCH, y: null })).toEqual({ x: null, y: null });
		expect(snapOn(["x"], { x: MATCH, y: null })).toEqual({ x: MATCH, y: null });
	});
});
