import { describe, expect, it } from "vitest";
import { pixelBox } from "../document/documentFixtures";
import type { Layer, LayerId, LayerPatch } from "../document/layer";
import { PASTE_OFFSET, pasteParent, shiftLayer } from "./paste";

const ROOT_RECTANGLE = "1@1" as LayerId;
const FRAME = "2@1" as LayerId;
const NESTED_FRAME = "3@1" as LayerId;
const CHILD = "4@1" as LayerId;

function layerOf(id: LayerId, parent: LayerId | null, frame: boolean): Layer {
	return {
		id,
		x: 0,
		y: 0,
		width: 100,
		height: 100,
		...pixelBox({ x: 0, y: 0, width: 100, height: 100 }),
		rotation: 0,
		fill: "#000000",
		geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: frame },
		name: "",
		clip: frame,
		parent,
	};
}

const LAYERS: Readonly<Record<string, Layer>> = {
	[ROOT_RECTANGLE]: layerOf(ROOT_RECTANGLE, null, false),
	[FRAME]: layerOf(FRAME, null, true),
	[NESTED_FRAME]: layerOf(NESTED_FRAME, FRAME, true),
	[CHILD]: layerOf(CHILD, FRAME, false),
};

function read(id: LayerId): Layer | null {
	return LAYERS[id] ?? null;
}

describe("pasteParent", () => {
	it("takes the selected frame", () => {
		expect(pasteParent(read, [FRAME], [])).toBe(FRAME);
	});

	it("takes the selected nested frame, not the frame that holds it", () => {
		expect(pasteParent(read, [NESTED_FRAME], [])).toBe(NESTED_FRAME);
	});

	it("takes the parent of the selected frame when the copy came from that frame", () => {
		expect(pasteParent(read, [NESTED_FRAME], [NESTED_FRAME])).toBe(FRAME);
		expect(pasteParent(read, [FRAME], [FRAME, CHILD])).toBeNull();
	});

	it("takes the parent of a selected layer that is not a frame", () => {
		expect(pasteParent(read, [CHILD], [])).toBe(FRAME);
	});

	it("takes the first selected layer when the selection holds more than one layer", () => {
		expect(pasteParent(read, [FRAME, ROOT_RECTANGLE], [])).toBe(FRAME);
		expect(pasteParent(read, [ROOT_RECTANGLE, FRAME], [])).toBeNull();
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
