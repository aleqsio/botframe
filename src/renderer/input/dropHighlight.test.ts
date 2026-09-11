import { describe, expect, it } from "vitest";
import type { LayerId } from "../../document/layer";
import type { LayerMove } from "../state/userState";
import { droppedInto } from "./dropHighlight";
import type { RowDrag } from "./rowDrop";

const LAYER: LayerId = "1@1";
const ARTBOARD: LayerId = "2@1";

function moveInto(parent: LayerId | null, from: LayerId | null = null): LayerMove {
	return {
		id: LAYER,
		from,
		parent,
		start: { x: 0, y: 0, rotation: 0 },
		offset: { x: 0, y: 0 },
	};
}

function rowDragOnto(place: RowDrag["target"]): RowDrag {
	return { id: LAYER, target: place };
}

describe("droppedInto", () => {
	it("gives the parent that the move drag found", () => {
		expect(droppedInto(moveInto(ARTBOARD), null)).toBe(ARTBOARD);
	});

	it("gives no layer when the move drag holds the layer at the root", () => {
		expect(droppedInto(moveInto(null), null)).toBeNull();
	});

	it("gives no layer when the move drag leaves the first parent alone", () => {
		expect(droppedInto(moveInto(ARTBOARD, ARTBOARD), null)).toBeNull();
	});

	it("gives the row of a row drag that drops inside it", () => {
		expect(droppedInto(null, rowDragOnto({ id: ARTBOARD, place: "inside" }))).toBe(ARTBOARD);
	});

	it("gives no layer for a row drag that drops beside a row", () => {
		expect(droppedInto(null, rowDragOnto({ id: ARTBOARD, place: "before" }))).toBeNull();
		expect(droppedInto(null, rowDragOnto({ id: ARTBOARD, place: "after" }))).toBeNull();
		expect(droppedInto(null, rowDragOnto(null))).toBeNull();
	});

	it("gives no layer when no drag is in progress", () => {
		expect(droppedInto(null, null)).toBeNull();
	});
});
