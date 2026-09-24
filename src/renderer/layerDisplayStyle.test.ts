import type { CSSProperties } from "react";
import { describe, expect, it } from "vitest";
import { pixelBox } from "../document/documentFixtures";
import type { Layer } from "../document/layer";
import { DEFAULT_LAYOUT } from "../document/layout";
import type { LayoutPatch, Spacing, SpacingUnit, Track, TrackUnit } from "../document/layout";
import { layerStyle } from "./layerStyle";

const BOX = { x: 0, y: 0, width: 300, height: 200 };

function layerOf(layout: LayoutPatch): Layer {
	return {
		id: "1@1",
		...BOX,
		...pixelBox(BOX),
		rotation: 0,
		mirrored: false,
		fill: "#123456",
		geometry: { kind: "ellipse" },
		name: "",
		clip: false,
		parent: null,
		layout: { ...DEFAULT_LAYOUT, ...layout },
	};
}

function styleOf(layout: LayoutPatch): CSSProperties {
	return layerStyle(layerOf(layout), null);
}

function spacing(value: number, unit: SpacingUnit): Spacing {
	return { value, unit };
}

function track(value: number, unit: Exclude<TrackUnit, "auto">): Track {
	return { value, unit };
}

function gapOf(column: Spacing, row: Spacing): LayoutPatch {
	return { gap: { column, row } };
}

function columnsOf(columns: readonly Track[]): LayoutPatch {
	return { display: "grid", tracks: { ...DEFAULT_LAYOUT.tracks, columns } };
}

describe("the display of a layer", () => {
	it("keeps a block layer a block", () => {
		expect(styleOf({}).display).toBe("block");
	});

	it("draws a row and a column as flex", () => {
		expect(styleOf({ display: "row" })).toMatchObject({ display: "flex" });
		expect(styleOf({ display: "row" }).flexDirection).toBeUndefined();
		expect(styleOf({ display: "column" })).toMatchObject({
			display: "flex",
			flexDirection: "column",
		});
	});

	it("wraps a row and a column that hold the wrap flag", () => {
		expect(styleOf({ display: "row" }).flexWrap).toBeUndefined();
		expect(styleOf({ display: "row", wrap: true }).flexWrap).toBe("wrap");
		expect(styleOf({ display: "column", wrap: true }).flexWrap).toBe("wrap");
	});

	it("draws a grid with a template for each axis", () => {
		expect(styleOf({ display: "grid" })).toMatchObject({
			display: "grid",
			gridTemplateColumns: "repeat(3, 1fr)",
			gridTemplateRows: "repeat(2, 1fr)",
		});
	});

	it("writes a mixed axis as a list and prints an automatic track as auto", () => {
		const mixed = columnsOf([track(1, "fr"), track(120, "px"), track(1, "fr")]);
		expect(styleOf(mixed).gridTemplateColumns).toBe("1fr 120px 1fr");

		const held = columnsOf([{ unit: "auto" }, track(1, "fr")]);
		expect(styleOf(held).gridTemplateColumns).toBe("auto 1fr");
	});

	it("writes nothing but the display and the padding for a block layer", () => {
		const style = styleOf({ distribute: "between", ...gapOf(spacing(12, "px"), spacing(8, "px")) });
		expect(style.justifyContent).toBeUndefined();
		expect(style.alignItems).toBeUndefined();
		expect(style.gap).toBeUndefined();
	});
});

describe("the distribution of the children of a layer", () => {
	it("packs the children on the main axis at the alignment the pad holds", () => {
		const start = styleOf({ display: "row" });
		expect(start.justifyContent).toBe("flex-start");
		expect(styleOf({ display: "row", align: { main: "center", cross: "start" } })).toMatchObject({
			justifyContent: "center",
		});
		expect(styleOf({ display: "row", align: { main: "end", cross: "start" } })).toMatchObject({
			justifyContent: "flex-end",
		});
	});

	it("spreads the children when the distribution is not pack", () => {
		expect(styleOf({ display: "row", distribute: "between" }).justifyContent).toBe("space-between");
		expect(styleOf({ display: "row", distribute: "around" }).justifyContent).toBe("space-around");
		expect(styleOf({ display: "row", distribute: "evenly" }).justifyContent).toBe("space-evenly");
	});

	it("aligns the cross axis of a flex layer that does not wrap with alignItems", () => {
		const style = styleOf({ display: "column", align: { main: "start", cross: "end" } });
		expect(style.alignItems).toBe("flex-end");
		expect(style.alignContent).toBeUndefined();
	});

	it("aligns the cross axis of a flex layer that wraps with alignContent", () => {
		const style = styleOf({
			display: "row",
			wrap: true,
			align: { main: "start", cross: "center" },
		});
		expect(style.alignContent).toBe("center");
		expect(style.alignItems).toBeUndefined();
	});

	it("aligns the items of a grid on both axes and spreads the columns when asked", () => {
		const packed = styleOf({ display: "grid", align: { main: "center", cross: "end" } });
		expect(packed).toMatchObject({ justifyItems: "center", alignItems: "end" });
		expect(packed.justifyContent).toBeUndefined();

		expect(styleOf({ display: "grid", distribute: "evenly" }).justifyContent).toBe("space-evenly");
	});
});

describe("the gap and the padding of a layer", () => {
	it("writes one gap for a row or a column that does not wrap", () => {
		expect(styleOf({ display: "row" }).gap).toBeUndefined();
		expect(styleOf({ display: "row", ...gapOf(spacing(12, "px"), spacing(8, "px")) }).gap).toBe(
			"12px",
		);
	});

	it("writes the row gap first for a layer that wraps or a grid", () => {
		const wrapped: LayoutPatch = {
			display: "row",
			wrap: true,
			...gapOf(spacing(12, "px"), spacing(8, "px")),
		};
		expect(styleOf(wrapped).gap).toBe("8px 12px");
		expect(styleOf({ display: "grid", ...gapOf(spacing(1, "rem"), spacing(0, "px")) }).gap).toBe(
			"0px 1rem",
		);
		expect(styleOf({ display: "grid" }).gap).toBeUndefined();
	});

	it("writes one padding value when the four sides are equal", () => {
		const sides = spacing(16, "px");
		const style = styleOf({ padding: { top: sides, right: sides, bottom: sides, left: sides } });
		expect(style.padding).toBe("16px");
	});

	it("writes the four sides in the order top, right, bottom, left", () => {
		const style = styleOf({
			padding: {
				top: spacing(16, "px"),
				right: spacing(24, "px"),
				bottom: spacing(16, "px"),
				left: spacing(2, "rem"),
			},
		});
		expect(style.padding).toBe("16px 24px 16px 2rem");
	});

	it("writes no padding when each side is zero", () => {
		expect(styleOf({}).padding).toBeUndefined();
	});

	it("writes the padding after the gap, so that no longhand can overwrite it", () => {
		const sides = spacing(16, "px");
		const keys = Object.keys(
			styleOf({
				display: "row",
				...gapOf(spacing(12, "px"), spacing(8, "px")),
				padding: { top: sides, right: sides, bottom: sides, left: sides },
			}),
		);
		expect(keys.indexOf("padding")).toBeGreaterThan(keys.indexOf("gap"));
	});
});
