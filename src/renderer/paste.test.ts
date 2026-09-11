import { describe, expect, it } from "vitest";
import type { Layer, LayerId } from "../document/layer";
import { PLAIN_RECTANGLE } from "../document/subtree";
import type { LayerNode } from "../document/subtree";
import { PASTE_OFFSET, pasteParent, shiftNode } from "./paste";

const ROOT_RECTANGLE = "1@1" as LayerId;
const ARTBOARD = "2@1" as LayerId;
const NESTED_ARTBOARD = "3@1" as LayerId;
const CHILD = "4@1" as LayerId;

function layerOf(id: LayerId, parent: LayerId | null, artboard: boolean): Layer {
	return {
		id,
		x: 0,
		y: 0,
		width: 100,
		height: 100,
		rotation: 0,
		fill: "#000000",
		geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard },
		name: "",
		clip: artboard,
		parent,
	};
}

const LAYERS: Readonly<Record<string, Layer>> = {
	[ROOT_RECTANGLE]: layerOf(ROOT_RECTANGLE, null, false),
	[ARTBOARD]: layerOf(ARTBOARD, null, true),
	[NESTED_ARTBOARD]: layerOf(NESTED_ARTBOARD, ARTBOARD, true),
	[CHILD]: layerOf(CHILD, ARTBOARD, false),
};

function read(id: LayerId): Layer | null {
	return LAYERS[id] ?? null;
}

function nodeAt(x: number, y: number): LayerNode {
	return {
		fields: {
			x,
			y,
			width: 10,
			height: 10,
			fill: "#000000",
			name: "",
			clip: false,
			geometry: PLAIN_RECTANGLE,
		},
		rotation: 0,
		children: [],
	};
}

describe("pasteParent", () => {
	it("takes the first artboard under the pointer", () => {
		expect(pasteParent(read, [NESTED_ARTBOARD, ARTBOARD], [])).toBe(NESTED_ARTBOARD);
	});

	it("passes over a layer under the pointer that is not an artboard", () => {
		expect(pasteParent(read, [CHILD, ARTBOARD], [])).toBe(ARTBOARD);
	});

	it("takes the parent of the selection when no artboard is under the pointer", () => {
		expect(pasteParent(read, [], [CHILD])).toBe(ARTBOARD);
	});

	it("takes the parent of the selection when the pointer is off the stage", () => {
		expect(pasteParent(read, [ROOT_RECTANGLE], [CHILD])).toBe(ARTBOARD);
	});

	it("takes the root when nothing is under the pointer and nothing is selected", () => {
		expect(pasteParent(read, [], [])).toBeNull();
	});

	it("takes the root when the selected layer sits at the root", () => {
		expect(pasteParent(read, [], [ROOT_RECTANGLE])).toBeNull();
	});

	it("takes the root when the selection names a layer the document lost", () => {
		expect(pasteParent(read, [], ["9@9"])).toBeNull();
	});
});

describe("shiftNode", () => {
	it("moves the layer and leaves each other field alone", () => {
		const node = shiftNode(nodeAt(40, 60), PASTE_OFFSET);

		expect(node.fields.x).toBe(40 + PASTE_OFFSET);
		expect(node.fields.y).toBe(60 + PASTE_OFFSET);
		expect(node.fields.width).toBe(10);
		expect(node.rotation).toBe(0);
	});

	it("holds the position when the offset is zero", () => {
		expect(shiftNode(nodeAt(40, 60), 0).fields).toMatchObject({ x: 40, y: 60 });
	});

	it("does not change the node it reads", () => {
		const node = nodeAt(40, 60);
		shiftNode(node, PASTE_OFFSET);

		expect(node.fields.x).toBe(40);
	});
});
