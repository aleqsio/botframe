import { describe, expect, it } from "vitest";
import { pixelBox } from "../../document/documentFixtures";
import type { Layer } from "../../document/layer";
import { DEFAULT_LAYOUT } from "../../document/layout";
import type { LayoutPatch } from "../../document/layout";
import { NO_MODIFIERS } from "./modifiers";
import type { Modifiers } from "./modifiers";
import { ANGLE_SNAP } from "./step";
import { MIN_LAYER_SIZE, resizePatch, resizedRect, rotatedDegrees, scaledRect } from "./transform";

const ALT: Modifiers = { shift: false, alt: true, control: false };
const SHIFT: Modifiers = { shift: true, alt: false, control: false };

function layerAt(rotation: number): Layer {
	return {
		id: "1@1",
		x: 100,
		y: 100,
		width: 200,
		height: 100,
		...pixelBox({ x: 100, y: 100, width: 200, height: 100 }),
		rotation,
		fill: "#000000",
		geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: false },
		name: "",
		clip: false,
		parent: null,
	};
}

const FLAT = layerAt(0);
const CENTER = { x: 200, y: 150 };

function pointAround(degrees: number): { x: number; y: number } {
	const radians = (degrees * Math.PI) / 180;
	return { x: CENTER.x + 100 * Math.cos(radians), y: CENTER.y + 100 * Math.sin(radians) };
}

describe("resizedRect", () => {
	it("holds the opposite corner in place when a corner handle moves", () => {
		expect(resizedRect(FLAT, "se", { x: 400, y: 300 }, NO_MODIFIERS)).toEqual({
			x: 100,
			y: 100,
			width: 300,
			height: 200,
		});
		expect(resizedRect(FLAT, "nw", { x: 150, y: 120 }, NO_MODIFIERS)).toEqual({
			x: 150,
			y: 120,
			width: 150,
			height: 80,
		});
	});

	it("moves one axis only when a side handle moves", () => {
		expect(resizedRect(FLAT, "e", { x: 400, y: 300 }, NO_MODIFIERS)).toEqual({
			x: 100,
			y: 100,
			width: 300,
			height: 100,
		});
		expect(resizedRect(FLAT, "n", { x: 400, y: 60 }, NO_MODIFIERS)).toEqual({
			x: 100,
			y: 60,
			width: 200,
			height: 140,
		});
	});

	it("keeps the aspect ratio with shift, from a corner and from a side", () => {
		expect(resizedRect(FLAT, "se", { x: 400, y: 300 }, SHIFT)).toEqual({
			x: 100,
			y: 100,
			width: 400,
			height: 200,
		});
		expect(resizedRect(FLAT, "e", { x: 400, y: 300 }, SHIFT)).toEqual({
			x: 100,
			y: 75,
			width: 300,
			height: 150,
		});
	});

	it("scales from the center with alt, and keeps the aspect ratio with both", () => {
		expect(resizedRect(FLAT, "se", { x: 400, y: 300 }, ALT)).toEqual({
			x: 0,
			y: 0,
			width: 400,
			height: 300,
		});
		expect(
			resizedRect(FLAT, "e", { x: 400, y: 300 }, { shift: true, alt: true, control: false }),
		).toEqual({
			x: 0,
			y: 50,
			width: 400,
			height: 200,
		});
	});

	it("holds a minimum size at the fixed edge when the handle passes it", () => {
		expect(resizedRect(FLAT, "se", { x: 100, y: 100 }, NO_MODIFIERS)).toMatchObject({
			x: 100,
			y: 100,
			width: MIN_LAYER_SIZE,
			height: MIN_LAYER_SIZE,
		});
		expect(resizedRect(FLAT, "e", { x: 0, y: 150 }, NO_MODIFIERS)).toMatchObject({
			x: 100,
			width: MIN_LAYER_SIZE,
		});
		expect(resizedRect(FLAT, "w", { x: 400, y: 150 }, NO_MODIFIERS)).toMatchObject({
			x: 300 - MIN_LAYER_SIZE,
			width: MIN_LAYER_SIZE,
		});
	});

	it("resizes a turned layer along its own axes", () => {
		expect(resizedRect(layerAt(90), "se", { x: 150, y: 270 }, NO_MODIFIERS)).toEqual({
			x: 90,
			y: 110,
			width: 220,
			height: 100,
		});
	});
});

describe("scaledRect", () => {
	it("scales about the center of the layer and holds a minimum size", () => {
		expect(scaledRect(FLAT, 1.5)).toEqual({ x: 50, y: 75, width: 300, height: 150 });
		expect(scaledRect(FLAT, 0.5)).toEqual({ x: 150, y: 125, width: 100, height: 50 });
		expect(scaledRect(FLAT, 0)).toEqual({
			x: 199,
			y: 149.5,
			width: MIN_LAYER_SIZE * 2,
			height: MIN_LAYER_SIZE,
		});
	});

	it("holds the aspect ratio of a thin layer at the minimum size", () => {
		const thin = { ...FLAT, width: 400, height: 2 };
		const floored = scaledRect(thin, 0.1);
		expect(floored).toMatchObject({ width: 200, height: MIN_LAYER_SIZE });
		expect(scaledRect({ ...thin, ...floored }, 0.5)).toMatchObject({
			width: 200,
			height: MIN_LAYER_SIZE,
		});
	});
});

describe("rotatedDegrees", () => {
	it("turns the layer by the angle the pointer sweeps around the center", () => {
		expect(rotatedDegrees(FLAT, pointAround(0), pointAround(90), NO_MODIFIERS)).toBeCloseTo(90);
		expect(rotatedDegrees(FLAT, pointAround(0), pointAround(-90), NO_MODIFIERS)).toBeCloseTo(270);
	});

	it("adds the sweep to the angle the layer already holds", () => {
		expect(rotatedDegrees(layerAt(30), pointAround(0), pointAround(40), NO_MODIFIERS)).toBeCloseTo(
			70,
		);
	});

	it("steps by five degrees with alt and by fifteen degrees with shift", () => {
		expect(rotatedDegrees(FLAT, pointAround(0), pointAround(97), ALT)).toBeCloseTo(
			ANGLE_SNAP.small * 19,
		);
		expect(rotatedDegrees(FLAT, pointAround(0), pointAround(97), SHIFT)).toBeCloseTo(
			ANGLE_SNAP.large * 6,
		);
	});
});

function layerWith(layout: LayoutPatch): Layer {
	return { ...FLAT, layout: { ...DEFAULT_LAYOUT, ...layout } };
}

describe("resizePatch", () => {
	it("writes the width alone for a fixed axis in the flow", () => {
		const rect = { x: 60, y: 100, width: 240, height: 100 };
		expect(resizePatch(layerWith({}), "row", rect)).toEqual({ width: 240, height: 100 });
	});

	it("writes the right margin of a fill axis by the delta of the right edge", () => {
		const fill = layerWith({ width: "fill" });
		const rect = { x: 100, y: 100, width: 160, height: 100 };

		expect(resizePatch(fill, "row", rect)).toEqual({
			height: 100,
			layout: {
				margin: {
					top: { value: 0, unit: "px" },
					right: { value: 40, unit: "px" },
					bottom: { value: 0, unit: "px" },
					left: { value: 0, unit: "px" },
				},
			},
		});
	});

	it("adds the delta to a margin that already holds pixels", () => {
		const held = layerWith({
			width: "fill",
			margin: { ...DEFAULT_LAYOUT.margin, right: { value: 10, unit: "px" } },
		});
		const rect = { x: 100, y: 100, width: 160, height: 100 };
		const patch = resizePatch(held, "row", rect);

		expect(patch.layout?.margin?.right).toEqual({ value: 50, unit: "px" });
	});

	it("drops a margin unit that is not pixels before it adds the delta", () => {
		const held = layerWith({
			width: "fill",
			margin: { ...DEFAULT_LAYOUT.margin, left: { unit: "auto" } },
		});
		const rect = { x: 120, y: 100, width: 180, height: 100 };

		expect(resizePatch(held, "row", rect).layout?.margin?.left).toEqual({ value: 20, unit: "px" });
	});

	it("makes a hug axis fixed and writes its place and size under a block parent", () => {
		const hug = layerWith({ width: "hug" });
		const rect = { x: 60, y: 100, width: 240, height: 120 };

		expect(resizePatch(hug, "block", rect)).toEqual({ ...rect, layout: { width: "fixed" } });
	});

	it("writes the width and the bottom margin for a corner of a mixed layer in the flow", () => {
		const mixed = layerWith({ width: "fixed", height: "fill" });
		const rect = { x: 100, y: 100, width: 260, height: 130 };
		const patch = resizePatch(mixed, "column", rect);

		expect(patch.width).toBe(260);
		expect(patch.height).toBeUndefined();
		expect(patch.layout?.margin?.bottom).toEqual({ value: -30, unit: "px" });
		expect(patch.layout?.margin?.top).toEqual({ value: 0, unit: "px" });
	});

	it("writes the place and the size of a fixed axis out of the flow", () => {
		const loose = layerWith({ position: "absolute" });
		const rect = { x: 60, y: 90, width: 240, height: 120 };

		expect(resizePatch(loose, "row", rect)).toEqual(rect);
	});
});
