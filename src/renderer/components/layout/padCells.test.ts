import { describe, expect, it } from "vitest";
import { DEFAULT_LAYOUT } from "../../../document/layout";
import type { LayerLayout } from "../../../document/layout";
import { activeCell, alignAt, crossLine, onCrossLine, spreadBar } from "./padCells";

function layoutWith(patch: Partial<LayerLayout>): LayerLayout {
	return { ...DEFAULT_LAYOUT, ...patch };
}

const ROW = layoutWith({ display: "row" });
const COLUMN = layoutWith({ display: "column" });
const GRID = layoutWith({ display: "grid" });

describe("alignAt", () => {
	it("reads the column as the main axis under a row", () => {
		expect(alignAt(ROW, { row: 2, column: 1 })).toEqual({ main: "center", cross: "end" });
	});

	it("reads the row as the main axis under a column", () => {
		expect(alignAt(COLUMN, { row: 2, column: 1 })).toEqual({ main: "end", cross: "center" });
	});

	it("reads the column as the main axis under a grid", () => {
		expect(alignAt(GRID, { row: 0, column: 2 })).toEqual({ main: "end", cross: "start" });
	});

	it("keeps the main axis when the distribution is not pack", () => {
		const spread = layoutWith({
			display: "row",
			distribute: "between",
			align: { main: "end", cross: "start" },
		});
		expect(alignAt(spread, { row: 1, column: 0 })).toEqual({ main: "end", cross: "center" });
	});

	it("keeps the order of the keys that the storage compares", () => {
		expect(Object.keys(alignAt(ROW, { row: 1, column: 1 }))).toEqual(["main", "cross"]);
	});
});

describe("activeCell", () => {
	it("puts the main axis on the columns under a row", () => {
		const layout = layoutWith({ display: "row", align: { main: "end", cross: "center" } });
		expect(activeCell(layout)).toEqual({ row: 1, column: 2 });
	});

	it("puts the main axis on the rows under a column", () => {
		const layout = layoutWith({ display: "column", align: { main: "end", cross: "center" } });
		expect(activeCell(layout)).toEqual({ row: 2, column: 1 });
	});
});

describe("onCrossLine", () => {
	it("marks the row of the cross axis under a row", () => {
		const layout = layoutWith({ display: "row", align: { main: "start", cross: "end" } });
		expect(crossLine(layout)).toBe(2);
		expect(onCrossLine(layout, { row: 2, column: 0 })).toBe(true);
		expect(onCrossLine(layout, { row: 1, column: 2 })).toBe(false);
	});

	it("marks the column of the cross axis under a column", () => {
		const layout = layoutWith({ display: "column", align: { main: "start", cross: "center" } });
		expect(onCrossLine(layout, { row: 2, column: 1 })).toBe(true);
		expect(onCrossLine(layout, { row: 1, column: 0 })).toBe(false);
	});
});

describe("spreadBar", () => {
	it("draws a level bar over the cross row", () => {
		const layout = layoutWith({ display: "row", align: { main: "start", cross: "center" } });
		expect(spreadBar(layout).bar).toEqual({
			top: "calc(50.000% - 1.5px)",
			left: "3px",
			right: "3px",
			height: "3px",
		});
		expect(spreadBar(layout).ring.height).toBe("calc(33.333% - 2px)");
	});

	it("draws an upright bar over the cross column", () => {
		const layout = layoutWith({ display: "column", align: { main: "start", cross: "end" } });
		expect(spreadBar(layout).bar).toEqual({
			left: "calc(83.333% - 1.5px)",
			top: "3px",
			bottom: "3px",
			width: "3px",
		});
	});
});
