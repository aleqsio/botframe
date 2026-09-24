import { describe, expect, it } from "vitest";
import { pixelBox } from "../../document/documentFixtures";
import type { Layer, Rect } from "../../document/layer";
import { DEFAULT_LAYOUT } from "../../document/layout";
import type { LayoutPatch } from "../../document/layout";
import { drawnFrom } from "./drawn";
import type { DrawnBox } from "./drawn";

const BOX: Rect = { x: 10, y: 20, width: 30, height: 40 };
const PLACED: DrawnBox = { x: 3, y: 4, width: 300, height: 400, placed: true };
const MOVING: DrawnBox = { ...PLACED, placed: false };

function layerOf(layout: LayoutPatch): Layer {
	return {
		id: "1@1",
		...BOX,
		...pixelBox(BOX),
		layout: { ...DEFAULT_LAYOUT, ...layout },
		rotation: 0,
		mirrored: false,
		fill: "#000000",
		geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: false },
		name: "",
		clip: false,
		parent: "2@1",
	};
}

describe("drawnFrom", () => {
	it("takes the place of a child that the parent lays out", () => {
		expect(drawnFrom(layerOf({}), "row", PLACED)).toMatchObject({ x: 3, y: 4 });
	});

	it("keeps the place of a child that is out of the flow", () => {
		expect(drawnFrom(layerOf({ position: "absolute" }), "row", PLACED)).toMatchObject({
			x: 10,
			y: 20,
		});
		expect(drawnFrom(layerOf({}), "block", PLACED)).toMatchObject({ x: 10, y: 20 });
		expect(drawnFrom(layerOf({}), null, PLACED)).toMatchObject({ x: 10, y: 20 });
	});

	it("keeps the size of an axis that the document fixes", () => {
		expect(drawnFrom(layerOf({}), "row", PLACED)).toMatchObject({ width: 30, height: 40 });
	});

	it("takes the size of a hug or a fill axis", () => {
		const mixed = drawnFrom(layerOf({ width: "fill", height: "hug" }), "row", PLACED);
		expect(mixed).toMatchObject({ width: 300, height: 400 });
	});

	it("keeps the document place of a child whose element is not yet in its parent, and takes its size", () => {
		const mixed = drawnFrom(layerOf({ width: "fill" }), "row", MOVING);
		expect(mixed).toMatchObject({ x: 10, y: 20, width: 300, height: 40 });
	});

	it("keeps each field when the element has no box", () => {
		const loose = layerOf({ width: "fill", height: "hug" });
		expect(drawnFrom(loose, "row", null)).toBe(loose);
	});
});
