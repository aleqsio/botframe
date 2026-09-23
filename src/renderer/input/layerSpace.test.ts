import { describe, expect, it } from "vitest";
import { pixelBox } from "../../document/documentFixtures";
import type { Layer, LayerId } from "../../document/layer";
import {
	anchorOf,
	anchoredPlace,
	containsPoint,
	cornersOf,
	fromParentPoint,
	hullOf,
	intoLayer,
	layerChain,
	outOfLayer,
	pivotOf,
	placedAround,
	toParentPoint,
	visualCenterOf,
} from "./layerSpace";

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
		geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: false },
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

describe("a layer that turns about an origin away from its center", () => {
	const CORNERED: Layer = { ...TURNED, origin: { x: 0, y: 0 } };

	it("holds its top left corner in place on the screen", () => {
		expect(fromParentPoint([CORNERED], { x: 0, y: 0 })).toEqual({ x: 100, y: 100 });
		const far = fromParentPoint([CORNERED], { x: 200, y: 0 });
		expect(far.x).toBeCloseTo(100);
		expect(far.y).toBeCloseTo(300);
	});

	it("maps a parent point back to the same local point", () => {
		const local = { x: 37, y: 81 };
		const back = intoLayer(CORNERED, outOfLayer(CORNERED, local));
		expect(back.x).toBeCloseTo(local.x);
		expect(back.y).toBeCloseTo(local.y);
	});

	it("gives the pivot in the box of the layer from the origin and the size", () => {
		expect(pivotOf(CORNERED)).toEqual({ x: 0, y: 0 });
		expect(pivotOf({ ...CORNERED, origin: { x: 0.25, y: 1 } })).toEqual({ x: 50, y: 100 });
	});
});

describe("anchoredPlace", () => {
	const TILTED: Layer = { ...TURNED, rotation: 30, origin: { x: 0.2, y: 0.9 } };

	it("puts the anchored point of the layer under the given parent point", () => {
		const anchor = { x: 0.7, y: 0.1 };
		const target = { x: 333, y: 222 };
		const placed = { ...TILTED, ...anchoredPlace(TILTED, anchor, target) };
		const landed = outOfLayer(placed, { x: anchor.x * placed.width, y: anchor.y * placed.height });
		expect(landed.x).toBeCloseTo(target.x);
		expect(landed.y).toBeCloseTo(target.y);
	});

	it("gives the anchor of a parent point back through anchorOf", () => {
		const point = { x: 180, y: 140 };
		const anchor = anchorOf(TILTED, point);
		const placed = anchoredPlace(TILTED, anchor, point);
		expect(placed.x).toBeCloseTo(TILTED.x);
		expect(placed.y).toBeCloseTo(TILTED.y);
	});

	it("keeps the visual center where placedAround puts it", () => {
		const center = { x: 500, y: 400 };
		const placed = { ...TILTED, ...placedAround(TILTED, center) };
		expect(visualCenterOf(placed).x).toBeCloseTo(center.x);
		expect(visualCenterOf(placed).y).toBeCloseTo(center.y);
	});
});

describe("hullOf", () => {
	it("gives the box that holds each point", () => {
		expect(
			hullOf([
				{ x: 10, y: 4 },
				{ x: -2, y: 30 },
			]),
		).toEqual({ x: -2, y: 4, width: 12, height: 26 });
	});

	it("gives a box of no size for one point", () => {
		expect(hullOf([{ x: 3, y: 5 }])).toEqual({ x: 3, y: 5, width: 0, height: 0 });
	});
});

describe("cornersOf", () => {
	it("gives the four corners of a box at its own origin", () => {
		expect(cornersOf({ width: 10, height: 20 })).toEqual([
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
			{ x: 10, y: 20 },
			{ x: 0, y: 20 },
		]);
	});
});
