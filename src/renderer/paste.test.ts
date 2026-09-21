import { describe, expect, it } from "vitest";
import { pixelBox } from "../document/documentFixtures";
import type { Layer, LayerId, LayerPatch } from "../document/layer";
import { PASTE_OFFSET, pasteParent, shiftLayer } from "./paste";

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
		...pixelBox({ x: 0, y: 0, width: 100, height: 100 }),
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

describe("pasteParent", () => {
	it("takes the selected artboard", () => {
		expect(pasteParent(read, [ARTBOARD], [])).toBe(ARTBOARD);
	});

	it("takes the selected nested artboard, not the artboard that holds it", () => {
		expect(pasteParent(read, [NESTED_ARTBOARD], [])).toBe(NESTED_ARTBOARD);
	});

	it("takes the parent of the selected artboard when the copy came from that artboard", () => {
		expect(pasteParent(read, [NESTED_ARTBOARD], [NESTED_ARTBOARD])).toBe(ARTBOARD);
		expect(pasteParent(read, [ARTBOARD], [ARTBOARD, CHILD])).toBeNull();
	});

	it("takes the parent of a selected layer that is not an artboard", () => {
		expect(pasteParent(read, [CHILD], [])).toBe(ARTBOARD);
	});

	it("takes the first selected layer when the selection holds more than one layer", () => {
		expect(pasteParent(read, [ARTBOARD, ROOT_RECTANGLE], [])).toBe(ARTBOARD);
		expect(pasteParent(read, [ROOT_RECTANGLE, ARTBOARD], [])).toBeNull();
	});

	it("takes the root when nothing is selected", () => {
		expect(pasteParent(read, [], [])).toBeNull();
	});

	it("takes the root when the selected layer sits at the root", () => {
		expect(pasteParent(read, [ROOT_RECTANGLE], [])).toBeNull();
	});

	it("takes the root when the selection names a layer the document lost", () => {
		expect(pasteParent(read, ["9@9"], [])).toBeNull();
	});
});

describe("shiftLayer", () => {
	it("moves the layer by the offset", () => {
		const patches: LayerPatch[] = [];
		shiftLayer(
			{ layer: read, update: (_id, patch) => void patches.push(patch) },
			CHILD,
			PASTE_OFFSET,
		);

		expect(patches).toEqual([{ x: PASTE_OFFSET, y: PASTE_OFFSET }]);
	});

	it("writes nothing when the offset is zero", () => {
		const patches: LayerPatch[] = [];
		shiftLayer({ layer: read, update: (_id, patch) => void patches.push(patch) }, CHILD, 0);

		expect(patches).toEqual([]);
	});

	it("writes nothing for a layer the document lost", () => {
		const patches: LayerPatch[] = [];
		shiftLayer(
			{ layer: read, update: (_id, patch) => void patches.push(patch) },
			"9@9",
			PASTE_OFFSET,
		);

		expect(patches).toEqual([]);
	});
});
