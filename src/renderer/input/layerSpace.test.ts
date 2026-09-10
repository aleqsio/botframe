import { describe, expect, it } from "vitest";
import type { Layer, LayerId } from "../../document/layer";
import { layerChain, toParentPoint } from "./layerSpace";

function layerAt(id: LayerId, parent: LayerId | null, rotation: number): Layer {
	return {
		id,
		x: 100,
		y: 100,
		width: 200,
		height: 100,
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
