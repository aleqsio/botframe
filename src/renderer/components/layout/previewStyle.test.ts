import { describe, expect, it } from "vitest";
import { DEFAULT_LAYOUT } from "../../../document/layout";
import type { LayerLayout } from "../../../document/layout";
import {
	blockSize,
	previewCaption,
	previewCellStyle,
	previewStyle,
	previewTemplate,
} from "./previewStyle";

function layoutWith(patch: Partial<LayerLayout>): LayerLayout {
	return { ...DEFAULT_LAYOUT, ...patch };
}

describe("previewTemplate", () => {
	it("turns each track factor into one length", () => {
		expect(previewTemplate([{ value: 1, unit: "fr" }, { unit: "auto" }], 22)).toBe("22px 15px");
	});
});

describe("previewStyle", () => {
	it("maps a row the way the canvas maps it", () => {
		const layout = layoutWith({ display: "row", align: { main: "center", cross: "end" } });
		expect(previewStyle(layout)).toEqual({
			flexDirection: "row",
			flexWrap: "nowrap",
			justifyContent: "center",
			alignItems: "flex-end",
		});
	});

	it("puts the cross axis on the lines when the children wrap", () => {
		const layout = layoutWith({
			display: "column",
			wrap: true,
			distribute: "between",
			align: { main: "start", cross: "center" },
		});
		expect(previewStyle(layout)).toEqual({
			flexDirection: "column",
			flexWrap: "wrap",
			justifyContent: "space-between",
			alignContent: "center",
		});
	});

	it("gives a grid one length for each track", () => {
		const layout = layoutWith({
			display: "grid",
			align: { main: "center", cross: "center" },
			tracks: { columns: [{ value: 1, unit: "fr" }], rows: [{ unit: "auto" }] },
		});
		expect(previewStyle(layout)).toEqual({
			display: "grid",
			gridTemplateColumns: "22px",
			gridTemplateRows: "11px",
			justifyItems: "center",
			alignItems: "center",
		});
	});
});

describe("previewCellStyle", () => {
	it("aligns the item in the cell the way the grid aligns it", () => {
		const layout = layoutWith({ display: "grid", align: { main: "end", cross: "center" } });
		expect(previewCellStyle(layout)).toEqual({ justifyContent: "end", alignItems: "center" });
	});
});

describe("blockSize", () => {
	it("stands the blocks up under a row and lays them down under a column", () => {
		expect(blockSize(layoutWith({ display: "row" }), 1)).toEqual({ width: 14, height: 34 });
		expect(blockSize(layoutWith({ display: "column" }), 1)).toEqual({ width: 34, height: 14 });
	});

	it("gives the wrapped blocks mixed widths", () => {
		const wrapped = layoutWith({ display: "row", wrap: true });
		expect(blockSize(wrapped, 2)).toEqual({ width: 56, height: 14 });
		expect(blockSize(layoutWith({ display: "column", wrap: true }), 2)).toEqual({
			width: 34,
			height: 14,
		});
	});
});

describe("previewCaption", () => {
	it("names the lines and the cells", () => {
		expect(previewCaption(layoutWith({ display: "row", wrap: true }))).toBe("lines");
		expect(previewCaption(layoutWith({ display: "grid" }))).toBe("items in cells");
		expect(previewCaption(layoutWith({ display: "row" }))).toBe("");
	});
});
