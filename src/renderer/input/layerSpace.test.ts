import { describe, expect, it } from "vitest";
import { pixelBox } from "../../document/documentFixtures";
import type { Layer, LayerId } from "../../document/layer";
import { containsPoint, fromParentPoint, layerChain, toParentPoint } from "./layerSpace";

function layerAt(id: LayerId, parent: LayerId | null, rotation: number): Layer {
	return {
		id,
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
		parent,
	};
}

const FLAT = layerAt("1@1", null, 0);
const TURNED = layerAt("1@1", null, 90);
const CHILD = layerAt("2@1", "1@1", 0);

function readerOf(layers: readonly Layer[]): (id: LayerId) => Layer | null {
	return (id) => layers.find((layer) => layer.id === id) ?? null;
}

describe("layerChain", () => {
	it("gives the layer and its parents, the root first", () => {
		const chain = layerChain(readerOf([FLAT, CHILD]), CHILD.id);

		expect(chain.map((layer) => layer.id)).toEqual([FLAT.id, CHILD.id]);
	});

	it("gives no chain for the canvas itself", () => {
		expect(layerChain(readerOf([FLAT]), null)).toEqual([]);
	});

	it("stops at a layer that the document lost", () => {
		expect(layerChain(readerOf([CHILD]), CHILD.id)).toEqual([CHILD]);
	});
});

describe("toParentPoint", () => {
	it("gives the canvas point back when the chain is empty", () => {
		expect(toParentPoint([], { x: 12, y: 34 })).toEqual({ x: 12, y: 34 });
	});

	it("takes the position of the parent off the point", () => {
		expect(toParentPoint([FLAT], { x: 150, y: 130 })).toEqual({ x: 50, y: 30 });
	});

	it("turns the point against the angle of the parent", () => {
		const local = toParentPoint([TURNED], { x: 200, y: 250 });

		expect(local.x).toBeCloseTo(200);
		expect(local.y).toBeCloseTo(50);
	});

	it("takes the point through each layer of the chain", () => {
		expect(toParentPoint([FLAT, CHILD], { x: 250, y: 230 })).toEqual({ x: 50, y: 30 });
	});
});

describe("containsPoint", () => {
	it("holds a point inside the box", () => {
		expect(containsPoint(FLAT, { x: 150, y: 130 })).toBe(true);
	});

	it("refuses a point outside the box on each axis", () => {
		expect(containsPoint(FLAT, { x: 350, y: 130 })).toBe(false);
		expect(containsPoint(FLAT, { x: 150, y: 260 })).toBe(false);
	});

	it("holds a point on the edge of the box", () => {
		expect(containsPoint(FLAT, { x: 100, y: 100 })).toBe(true);
		expect(containsPoint(FLAT, { x: 300, y: 200 })).toBe(true);
	});

	it("turns the point against the angle of the layer", () => {
		expect(containsPoint(TURNED, { x: 290, y: 150 })).toBe(false);
		expect(containsPoint(TURNED, { x: 200, y: 240 })).toBe(true);
	});
});

describe("fromParentPoint", () => {
	it("takes a point back out of one flat parent", () => {
		expect(fromParentPoint([FLAT], { x: 50, y: 30 })).toEqual({ x: 150, y: 130 });
	});

	it("turns the point back with a turned parent", () => {
		const inside = toParentPoint([TURNED], { x: 250, y: 230 });

		expect(fromParentPoint([TURNED], inside).x).toBeCloseTo(250);
		expect(fromParentPoint([TURNED], inside).y).toBeCloseTo(230);
	});

	it("is the inverse of toParentPoint over a chain", () => {
		const canvas = { x: 250, y: 230 };
		const inside = toParentPoint([FLAT, CHILD], canvas);

		expect(fromParentPoint([FLAT, CHILD], inside).x).toBeCloseTo(canvas.x);
		expect(fromParentPoint([FLAT, CHILD], inside).y).toBeCloseTo(canvas.y);
	});
});
