import { describe, expect, it } from "vitest";
import { cellAt, gridTracks, placeChildren, sameCell, sameLayout } from "./layout";
import type { GridLayout, LaidChild, Layout } from "./layout";

const BOX = { width: 340, height: 200 };
const ROW: Layout = { kind: "flex", direction: "row", gap: 10, padding: 20 };
const COLUMN: Layout = { kind: "flex", direction: "column", gap: 4, padding: 0 };
const GRID: GridLayout = { kind: "grid", columns: 3, rows: 2, gap: 10, padding: 10 };

function child(id: string, width: number, height: number): LaidChild<string> {
	return { id, width, height, cell: null };
}

describe("placeChildren", () => {
	it("gives no placement in a free layout", () => {
		expect(placeChildren(BOX, { kind: "free" }, [child("a", 10, 10)]).size).toBe(0);
	});

	it("lays a row out after the padding with a gap between the children", () => {
		const placed = placeChildren(BOX, ROW, [child("a", 50, 30), child("b", 70, 30)]);
		expect(placed.get("a")).toEqual({ x: 20, y: 20, slot: null });
		expect(placed.get("b")).toEqual({ x: 80, y: 20, slot: null });
	});

	it("lays a column out down the height of each child", () => {
		const placed = placeChildren(BOX, COLUMN, [child("a", 50, 30), child("b", 70, 44)]);
		expect(placed.get("a")).toEqual({ x: 0, y: 0, slot: null });
		expect(placed.get("b")).toEqual({ x: 0, y: 34, slot: null });
	});

	it("flows the children without a cell into the free cells in order", () => {
		const placed = placeChildren(BOX, GRID, [child("a", 10, 10), child("b", 10, 10)]);
		expect(placed.get("a")).toEqual({ x: 10, y: 10, slot: { column: 0, row: 0 } });
		expect(placed.get("b")).toEqual({ x: 120, y: 10, slot: { column: 1, row: 0 } });
	});

	it("puts a child with a cell into that cell and flows the others around it", () => {
		const held: LaidChild<string> = { ...child("held", 10, 10), cell: { column: 0, row: 0 } };
		const placed = placeChildren(BOX, GRID, [child("a", 10, 10), held, child("b", 10, 10)]);
		expect(placed.get("held")?.slot).toEqual({ column: 0, row: 0 });
		expect(placed.get("a")?.slot).toEqual({ column: 1, row: 0 });
		expect(placed.get("b")?.slot).toEqual({ column: 2, row: 0 });
	});

	it("clamps a cell that lies outside the grid to the last track", () => {
		const held: LaidChild<string> = { ...child("held", 10, 10), cell: { column: 9, row: 9 } };
		expect(placeChildren(BOX, GRID, [held]).get("held")).toEqual({
			x: 230,
			y: 105,
			slot: { column: 2, row: 1 },
		});
	});
});

describe("gridTracks", () => {
	it("divides the space that the padding and the gaps leave", () => {
		expect(gridTracks(BOX, GRID).cell).toEqual({ width: 100, height: 85 });
	});

	it("gives at least one track and no negative size", () => {
		const tracks = gridTracks({ width: 5, height: 5 }, { ...GRID, columns: 0, rows: 0 });
		expect(tracks).toMatchObject({ columns: 1, rows: 1, cell: { width: 0, height: 0 } });
	});
});

describe("cellAt", () => {
	it("gives the cell under a point and clamps a point outside the grid", () => {
		expect(cellAt(BOX, GRID, { x: 150, y: 150 })).toEqual({ column: 1, row: 1 });
		expect(cellAt(BOX, GRID, { x: -50, y: 900 })).toEqual({ column: 0, row: 1 });
	});
});

describe("sameCell and sameLayout", () => {
	it("compares cells by value and null by identity", () => {
		expect(sameCell({ column: 1, row: 2 }, { column: 1, row: 2 })).toBe(true);
		expect(sameCell({ column: 1, row: 2 }, { column: 2, row: 2 })).toBe(false);
		expect(sameCell(null, { column: 0, row: 0 })).toBe(false);
		expect(sameCell(null, null)).toBe(true);
	});

	it("compares layouts by kind and by each field", () => {
		expect(sameLayout(ROW, { ...ROW })).toBe(true);
		expect(sameLayout(ROW, { ...ROW, gap: 11 })).toBe(false);
		expect(sameLayout(GRID, { ...GRID, rows: 3 })).toBe(false);
		expect(sameLayout(GRID, { ...GRID })).toBe(true);
		expect(sameLayout(ROW, GRID)).toBe(false);
		expect(sameLayout({ kind: "free" }, { kind: "free" })).toBe(true);
	});
});
