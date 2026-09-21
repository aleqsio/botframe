import { describe, expect, it } from "vitest";
import {
	DEFAULT_LAYOUT,
	MARGIN_UNITS,
	SIDES,
	SPACING_UNITS,
	TRACK_UNITS,
	layoutOf,
} from "./layout";
import type { MarginSide, Spacing, Track } from "./layout";

describe("DEFAULT_LAYOUT", () => {
	it("holds a fixed size in the flow, no spacing, and a three by two grid", () => {
		expect(DEFAULT_LAYOUT).toEqual({
			width: "fixed",
			height: "fixed",
			position: "default",
			margin: { top: zero(), right: zero(), bottom: zero(), left: zero() },
			padding: { top: zero(), right: zero(), bottom: zero(), left: zero() },
			cell: { mode: "auto" },
			display: "block",
			wrap: false,
			distribute: "pack",
			align: { main: "start", cross: "start" },
			gap: { column: zero(), row: zero() },
			tracks: { columns: [unit(), unit(), unit()], rows: [unit(), unit()] },
			turnedBox: false,
		});
	});
});

function zero(): Spacing {
	return { value: 0, unit: "px" };
}

function unit(): Track {
	return { value: 1, unit: "fr" };
}

describe("layoutOf", () => {
	it("gives the default layout for a value that is not a bag", () => {
		for (const held of [undefined, null, "row", 7]) {
			expect(layoutOf(held)).toEqual(DEFAULT_LAYOUT);
		}
	});

	it("reads each name that a set holds and refuses a name outside it", () => {
		expect(layoutOf({ display: "grid" }).display).toBe("grid");
		expect(layoutOf({ display: "table" }).display).toBe("block");
		expect(layoutOf({ width: "hug", height: "fill" })).toMatchObject({
			width: "hug",
			height: "fill",
		});
		expect(layoutOf({ width: "stretch" }).width).toBe("fixed");
		expect(layoutOf({ position: "absolute" }).position).toBe("absolute");
		expect(layoutOf({ position: "offset" }).position).toBe("offset");
		expect(layoutOf({ position: "sticky" }).position).toBe("default");
		expect(layoutOf({ distribute: "evenly" }).distribute).toBe("evenly");
		expect(layoutOf({ distribute: "stretch" }).distribute).toBe("pack");
	});

	it("reads an alignment on each axis and refuses a name outside the set", () => {
		expect(layoutOf({ align: { main: "end", cross: "center" } }).align).toEqual({
			main: "end",
			cross: "center",
		});
		expect(layoutOf({ align: { main: "stretch" } }).align).toEqual({
			main: "start",
			cross: "start",
		});
	});

	it("takes the wrap flag only as a true boolean", () => {
		expect(layoutOf({ wrap: true }).wrap).toBe(true);
		expect(layoutOf({ wrap: "yes" }).wrap).toBe(false);
		expect(layoutOf({ wrap: 1 }).wrap).toBe(false);
	});

	it("reads each spacing unit and refuses a unit that spacing does not take", () => {
		for (const unitName of SPACING_UNITS) {
			expect(layoutOf({ gap: { column: { value: 4, unit: unitName } } }).gap.column).toEqual({
				value: 4,
				unit: unitName,
			});
		}
		expect(layoutOf({ gap: { column: { value: 4, unit: "auto" } } }).gap.column).toEqual({
			value: 4,
			unit: "px",
		});
	});

	it("refuses a number that is not finite", () => {
		expect(layoutOf({ gap: { row: { value: Number.NaN, unit: "px" } } }).gap.row.value).toBe(0);
		expect(layoutOf({ gap: { row: { value: Number.POSITIVE_INFINITY } } }).gap.row.value).toBe(0);
		expect(layoutOf({ gap: { row: { value: "8" } } }).gap.row.value).toBe(0);
		expect(layoutOf({ gap: { row: { value: -8 } } }).gap.row.value).toBe(-8);
	});

	it("reads every side of the margin and the padding", () => {
		const margin = { top: { value: 8, unit: "rem" }, left: { unit: "auto" } };
		const read = layoutOf({ margin });
		expect(read.margin.top).toEqual({ value: 8, unit: "rem" });
		expect(read.margin.left).toEqual({ unit: "auto" });
		expect(SIDES.map((side) => read.margin[side])).toHaveLength(4);
		expect(read.margin.bottom).toEqual({ value: 0, unit: "px" });
	});

	it("takes auto on a margin side and not on a padding side", () => {
		expect(MARGIN_UNITS).toContain("auto");
		const auto: MarginSide = layoutOf({ margin: { right: { unit: "auto" } } }).margin.right;
		expect(auto).toEqual({ unit: "auto" });
		expect(layoutOf({ padding: { right: { value: 5, unit: "auto" } } }).padding.right).toEqual({
			value: 5,
			unit: "px",
		});
	});

	it("reads a list of tracks and each track unit", () => {
		const columns = TRACK_UNITS.map((unitName) => ({ value: 2, unit: unitName }));
		expect(layoutOf({ tracks: { columns } }).tracks.columns).toEqual([
			{ value: 2, unit: "fr" },
			{ value: 2, unit: "px" },
			{ value: 2, unit: "rem" },
			{ value: 2, unit: "%" },
			{ unit: "auto" },
		]);
	});

	it("gives the default tracks for an axis that is not a list, or is empty", () => {
		expect(layoutOf({ tracks: { columns: [], rows: "two" } }).tracks).toEqual(
			DEFAULT_LAYOUT.tracks,
		);
	});

	it("reads a track that holds no unit as one fraction", () => {
		expect(layoutOf({ tracks: { rows: [{}, { unit: "px" }] } }).tracks.rows).toEqual([
			{ value: 1, unit: "fr" },
			{ value: 1, unit: "px" },
		]);
	});

	it("places a cell only when the mode says place", () => {
		expect(layoutOf({ cell: { mode: "place" } }).cell).toEqual({
			mode: "place",
			column: { start: 1, end: 2 },
			row: { start: 1, end: 2 },
		});
		expect(layoutOf({ cell: { column: { start: 2, end: 4 } } }).cell).toEqual({ mode: "auto" });
	});

	it("takes a span of whole lines that starts at one and ends after its start", () => {
		const held = { mode: "place", column: { start: 2, end: 4 }, row: { start: 1, end: 3 } };
		expect(layoutOf({ cell: held }).cell).toEqual(held);
		expect(spanOf({ start: 0, end: 3 })).toEqual({ start: 1, end: 2 });
		expect(spanOf({ start: 1.5, end: 3 })).toEqual({ start: 1, end: 2 });
		expect(spanOf({ start: 3, end: 3 })).toEqual({ start: 1, end: 2 });
		expect(spanOf({ start: 4, end: 2 })).toEqual({ start: 1, end: 2 });
	});
});

function spanOf(column: unknown): unknown {
	const cell = layoutOf({ cell: { mode: "place", column } }).cell;
	return cell.mode === "place" ? cell.column : null;
}
