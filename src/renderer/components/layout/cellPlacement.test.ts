import { describe, expect, it } from "vitest";
import { anchorOf, holdsCell, placedAt } from "./cellPlacement";

const PLACED = { mode: "place", column: { start: 2, end: 4 }, row: { start: 1, end: 3 } } as const;

describe("anchorOf", () => {
	it("reads the first cell of a placement", () => {
		expect(anchorOf(PLACED)).toEqual({ column: 2, row: 1 });
	});

	it("reads the first cell of the grid for auto placement", () => {
		expect(anchorOf({ mode: "auto" })).toEqual({ column: 1, row: 1 });
	});
});

describe("placedAt", () => {
	it("places one cell for a click", () => {
		expect(placedAt({ column: 3, row: 2 }, { column: 3, row: 2 })).toEqual({
			mode: "place",
			column: { start: 3, end: 4 },
			row: { start: 2, end: 3 },
		});
	});

	it("spans from the anchor to the cell", () => {
		expect(placedAt({ column: 2, row: 1 }, { column: 3, row: 2 })).toEqual({
			mode: "place",
			column: { start: 2, end: 4 },
			row: { start: 1, end: 3 },
		});
	});

	it("spans in each direction", () => {
		expect(placedAt({ column: 3, row: 3 }, { column: 1, row: 2 })).toEqual({
			mode: "place",
			column: { start: 1, end: 4 },
			row: { start: 2, end: 4 },
		});
	});
});

describe("holdsCell", () => {
	it("holds each cell inside the span and no cell outside it", () => {
		expect(holdsCell(PLACED, { column: 2, row: 1 })).toBe(true);
		expect(holdsCell(PLACED, { column: 3, row: 2 })).toBe(true);
		expect(holdsCell(PLACED, { column: 4, row: 1 })).toBe(false);
		expect(holdsCell(PLACED, { column: 2, row: 3 })).toBe(false);
	});

	it("holds no cell under auto placement", () => {
		expect(holdsCell({ mode: "auto" }, { column: 1, row: 1 })).toBe(false);
	});
});
