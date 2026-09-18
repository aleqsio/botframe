import type { CSSProperties } from "react";
import { describe, expect, it } from "vitest";
import { pixelBox } from "../document/documentFixtures";
import type { Geometry, Layer } from "../document/layer";
import { DEFAULT_LAYOUT } from "../document/layout";
import type {
	LayoutPatch,
	MarginSide,
	PositionMode,
	Side,
	SizeMode,
	Spacing,
	SpacingUnit,
} from "../document/layout";
import { layerStyle } from "./layerStyle";

const BOX = { x: 10, y: 20, width: 30, height: 40 };
const ROW: LayoutPatch = { display: "row" };
const COLUMN: LayoutPatch = { display: "column" };
const GRID: LayoutPatch = { display: "grid" };
const TURNED = "translate(15px, 20px) rotate(30deg) translate(-15px, -20px)";

function layerWith(geometry: Geometry): Layer {
	return {
		id: "1@1",
		...BOX,
		...pixelBox(BOX),
		rotation: 0,
		fill: "#123456",
		geometry,
		name: "",
		clip: false,
		parent: null,
	};
}

function layerOf(layout: LayoutPatch): Layer {
	return { ...layerWith({ kind: "ellipse" }), layout: { ...DEFAULT_LAYOUT, ...layout } };
}

function styleIn(layout: LayoutPatch, parent: LayoutPatch | null): CSSProperties {
	return layerStyle(layerOf(layout), parent === null ? null : layerOf(parent));
}

function positionIn(position: PositionMode, parent: LayoutPatch | null): CSSProperties {
	return styleIn({ position }, parent);
}

function sizeIn(width: SizeMode, height: SizeMode, parent: LayoutPatch | null): CSSProperties {
	return styleIn({ width, height }, parent);
}

function spacing(value: number, unit: SpacingUnit): Spacing {
	return { value, unit };
}

function sides(side: Side, held: MarginSide): LayoutPatch {
	return { margin: { ...DEFAULT_LAYOUT.margin, [side]: held } };
}

describe("layerStyle geometry", () => {
	it("places the layer with a 3D transform and its own size and fill", () => {
		expect(layerStyle(layerWith({ kind: "ellipse" }), null)).toMatchObject({
			transform: "translate3d(10px, 20px, 0)",
			width: "30px",
			height: "40px",
			background: "#123456",
		});
	});

	it("turns the layer around its own center only when it holds an angle", () => {
		const flat = layerWith({ kind: "ellipse" });
		expect(layerStyle(flat, null).transform).toBe("translate3d(10px, 20px, 0)");
		expect(layerStyle({ ...flat, rotation: 30 }, null).transform).toBe(
			`translate3d(10px, 20px, 0) ${TURNED}`,
		);
	});

	it("draws a rectangle with its corner radius and leaves the corner shape unset when smoothing is zero", () => {
		const square = layerStyle(
			layerWith({ kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: false }),
			null,
		);
		expect(square.borderRadius).toBe("0px");
		expect(square.cornerShape).toBeUndefined();

		const rounded = layerStyle(
			layerWith({ kind: "rectangle", cornerRadius: 12, cornerSmoothing: 0, artboard: false }),
			null,
		);
		expect(rounded.borderRadius).toBe("12px");
		expect(rounded.cornerShape).toBeUndefined();
	});

	it("draws a squircle with a superellipse corner shape when smoothing is above zero", () => {
		const style = layerStyle(
			layerWith({ kind: "rectangle", cornerRadius: 16, cornerSmoothing: 0.5, artboard: false }),
			null,
		);
		expect(style).toMatchObject({ borderRadius: "16px", cornerShape: "superellipse(3.5)" });
	});

	it("hides what a layer with a clip holds outside its box", () => {
		const layer = layerWith({ kind: "ellipse" });
		expect(layerStyle(layer, null).overflow).toBeUndefined();
		expect(layerStyle({ ...layer, clip: true }, null).overflow).toBe("hidden");
	});

	it("draws an ellipse as a full border radius", () => {
		expect(layerStyle(layerWith({ kind: "ellipse" }), null)).toMatchObject({
			borderRadius: "50%",
		});
	});

	it("clips a path geometry with clipPath", () => {
		expect(layerStyle(layerWith({ kind: "path", d: "M0 0 L10 10 Z" }), null)).toMatchObject({
			clipPath: 'path("M0 0 L10 10 Z")',
		});
	});

	it("draws a geometry it does not know without a radius or a clip", () => {
		const style = layerStyle(layerWith({ kind: "unsupported" }), null);
		expect(style.borderRadius).toBeUndefined();
		expect(style.clipPath).toBeUndefined();
		expect(style.cornerShape).toBeUndefined();
	});
});

describe("the position of a layer", () => {
	it("keeps the document transform for a layer that a block parent holds", () => {
		const style = positionIn("offset", null);
		expect(style.transform).toBe("translate3d(10px, 20px, 0)");
		expect(style.position).toBeUndefined();
		expect(style.left).toBeUndefined();
	});

	it("keeps the document transform for an absolute layer under a flex parent", () => {
		expect(positionIn("absolute", ROW)).toMatchObject({
			transform: "translate3d(10px, 20px, 0)",
		});
	});

	it("offsets a layer in the flow with relative left and top", () => {
		expect(positionIn("offset", ROW)).toMatchObject({
			position: "relative",
			left: "10px",
			top: "20px",
		});
	});

	it("writes no left or top for an offset of zero and no transform without an angle", () => {
		const flat = layerOf({});
		const style = layerStyle({ ...flat, x: 0, y: 0 }, layerOf(GRID));
		expect(style.left).toBeUndefined();
		expect(style.top).toBeUndefined();
		expect(style.transform).toBeUndefined();
	});

	it("turns a layer in the flow around its center and does not move it", () => {
		const turned = { ...layerOf({}), rotation: 30 };
		expect(layerStyle(turned, layerOf(ROW)).transform).toBe(TURNED);
	});
});

describe("the size of a layer", () => {
	it("writes the resolved pixels for a fixed size", () => {
		expect(sizeIn("fixed", "fixed", ROW)).toMatchObject({ width: "30px", height: "40px" });
	});

	it("writes fit-content for a size that hugs its children", () => {
		expect(sizeIn("hug", "hug", ROW)).toMatchObject({
			width: "fit-content",
			height: "fit-content",
		});
	});

	it("fills the parent with a percentage when the layer is out of flow", () => {
		expect(sizeIn("fill", "fill", null)).toMatchObject({
			width: "100%",
			height: "100%",
		});
	});

	it("fills the main axis of a flex parent with a flex factor", () => {
		const row = sizeIn("fill", "fixed", ROW);
		expect(row.flex).toBe("1 1 0%");
		expect(row.width).toBeUndefined();

		const column = sizeIn("fixed", "fill", COLUMN);
		expect(column.flex).toBe("1 1 0%");
		expect(column.height).toBeUndefined();
	});

	it("fills the cross axis of a flex parent with a stretch", () => {
		const row = sizeIn("fixed", "fill", ROW);
		expect(row.alignSelf).toBe("stretch");
		expect(row.height).toBeUndefined();

		expect(sizeIn("fill", "fixed", COLUMN).alignSelf).toBe("stretch");
	});

	it("fills each axis of a grid parent with a stretch of that axis", () => {
		expect(sizeIn("fill", "fill", GRID)).toMatchObject({
			justifySelf: "stretch",
			alignSelf: "stretch",
		});
	});
});

describe("the cell of a layer", () => {
	it("writes the grid lines of a placed cell under a grid parent", () => {
		const cell: LayoutPatch = {
			cell: { mode: "place", column: { start: 2, end: 4 }, row: { start: 1, end: 3 } },
		};
		expect(styleIn(cell, GRID)).toMatchObject({ gridColumn: "2 / 4", gridRow: "1 / 3" });
	});

	it("writes no grid lines for an automatic cell or under a parent that is not a grid", () => {
		expect(styleIn({}, GRID).gridColumn).toBeUndefined();
		const placed: LayoutPatch = {
			cell: { mode: "place", column: { start: 2, end: 4 }, row: { start: 1, end: 3 } },
		};
		expect(styleIn(placed, ROW).gridColumn).toBeUndefined();
	});
});

describe("the margin of a layer", () => {
	it("writes one longhand for each side that a flex or grid parent holds", () => {
		expect(styleIn(sides("left", { unit: "auto" }), ROW).marginLeft).toBe("auto");
		expect(styleIn(sides("top", spacing(8, "px")), GRID).marginTop).toBe("8px");
		expect(styleIn(sides("right", spacing(1.5, "rem")), ROW).marginRight).toBe("1.5rem");
	});

	it("writes nothing for a side of zero and never writes the shorthand", () => {
		const style = styleIn(sides("bottom", spacing(0, "px")), ROW);
		expect(style.marginBottom).toBeUndefined();
		expect(style.margin).toBeUndefined();
	});

	it("writes no margin under a block parent", () => {
		expect(styleIn(sides("left", { unit: "auto" }), null).marginLeft).toBeUndefined();
	});
});
