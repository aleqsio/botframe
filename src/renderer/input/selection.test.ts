import { describe, expect, it } from "vitest";
import type { Layer, LayerId } from "../../document/layer";
import { pixelBox } from "../../document/documentFixtures";
import { Slot } from "../state/slot";
import { NOTHING_SELECTED } from "../state/userState";
import { toggleSelected } from "./selection";

const FIRST: LayerId = "1@1";
const SECOND: LayerId = "2@1";
const CHILD: LayerId = "3@1";
const GRANDCHILD: LayerId = "4@1";

function layerOf(id: LayerId, parent: LayerId | null): Layer {
	return {
		id,
		x: 0,
		y: 0,
		width: 100,
		height: 100,
		...pixelBox({ x: 0, y: 0, width: 100, height: 100 }),
		rotation: 0,
		skewX: 0,
		skewY: 0,
		mirrored: false,
		fill: "#000000",
		geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: false },
		name: "",
		clip: false,
		parent,
	};
}

const LAYERS: Readonly<Record<string, Layer>> = {
	[FIRST]: layerOf(FIRST, null),
	[SECOND]: layerOf(SECOND, null),
	[CHILD]: layerOf(CHILD, FIRST),
	[GRANDCHILD]: layerOf(GRANDCHILD, CHILD),
};

function read(id: LayerId): Layer | null {
	return LAYERS[id] ?? null;
}

function selectionOf(ids: readonly LayerId[]): Slot<readonly LayerId[]> {
	return new Slot<readonly LayerId[]>(ids);
}

describe("toggleSelected", () => {
	it("adds a layer that the selection does not hold at the end", () => {
		const selection = selectionOf([FIRST]);

		toggleSelected(read, selection, SECOND);

		expect(selection.get()).toEqual([FIRST, SECOND]);
	});

	it("takes a layer that the selection holds out of it", () => {
		const selection = selectionOf([FIRST, SECOND]);

		toggleSelected(read, selection, FIRST);

		expect(selection.get()).toEqual([SECOND]);
	});

	it("gives the shared empty selection when the last layer leaves", () => {
		const selection = selectionOf([FIRST]);

		toggleSelected(read, selection, FIRST);

		expect(selection.get()).toBe(NOTHING_SELECTED);
	});

	it("takes each ancestor of the added layer out of the selection", () => {
		const selection = selectionOf([FIRST, SECOND]);

		toggleSelected(read, selection, GRANDCHILD);

		expect(selection.get()).toEqual([SECOND, GRANDCHILD]);
	});

	it("takes each descendant of the added layer out of the selection", () => {
		const selection = selectionOf([GRANDCHILD, SECOND, CHILD]);

		toggleSelected(read, selection, FIRST);

		expect(selection.get()).toEqual([SECOND, FIRST]);
	});
});
