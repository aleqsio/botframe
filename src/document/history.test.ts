import { LoroDoc } from "loro-crdt";
import { describe, expect, it, vi } from "vitest";
import { DesignDocument } from "./document";
import { DRAWN, firstId } from "./documentFixtures";

describe("the history", () => {
	it("has nothing to undo and nothing to redo before the first commit", () => {
		const doc = new DesignDocument(new LoroDoc());

		expect(doc.canUndo()).toBe(false);
		expect(doc.canRedo()).toBe(false);
		expect(doc.undo()).toBe(false);
		expect(doc.redo()).toBe(false);
	});

	it("undoes a committed move and redoes it", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);

		doc.update(id, { x: 11, y: 22 });
		doc.commit("move layer");
		expect(doc.canUndo()).toBe(true);
		expect(doc.canRedo()).toBe(false);

		expect(doc.undo()).toBe(true);
		expect(doc.layer(id)).toMatchObject({ x: 420, y: 260 });
		expect(doc.canRedo()).toBe(true);

		expect(doc.redo()).toBe(true);
		expect(doc.layer(id)).toMatchObject({ x: 11, y: 22 });
		expect(doc.canRedo()).toBe(false);
	});

	it("undoes the twenty updates of one drag as one step", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);

		for (let step = 1; step <= 20; step += 1) {
			doc.update(id, { x: 420 + step, y: 260 + step });
		}
		doc.commit("move layer");
		expect(doc.layer(id)).toMatchObject({ x: 440, y: 280 });

		expect(doc.undo()).toBe(true);
		expect(doc.layer(id)).toMatchObject({ x: 420, y: 260 });
		expect(doc.canUndo()).toBe(true);
	});

	it("takes the layer of an undone create away and gives it back on redo", () => {
		const doc = DesignDocument.create();
		const id = doc.createLayer(DRAWN);
		doc.commit("create artboard");
		const structure = vi.fn<() => void>();
		doc.subscribeStructure(structure);

		expect(doc.undo()).toBe(true);
		expect(doc.layer(id)).toBeNull();
		expect(doc.layerIds()).not.toContain(id);
		expect(structure).toHaveBeenCalled();

		expect(doc.redo()).toBe(true);
		expect(doc.layerIds()).toHaveLength(2);
	});

	it("notifies the history subscriber when a flag changes", () => {
		const doc = new DesignDocument(new LoroDoc());
		const listener = vi.fn<() => void>();
		const unsubscribe = doc.subscribeHistory(listener);

		doc.createLayer(DRAWN);
		doc.commit("create artboard");
		expect(listener).toHaveBeenCalledTimes(1);

		doc.undo();
		expect(listener).toHaveBeenCalledTimes(2);

		unsubscribe();
		doc.redo();
		expect(listener).toHaveBeenCalledTimes(2);
	});

	it("notifies the subscriber of a layer that an undo moves back", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		doc.update(id, { x: 11, y: 22 });
		doc.commit("move layer");
		const listener = vi.fn<() => void>();
		doc.subscribeLayer(id, listener);

		doc.undo();

		expect(listener).toHaveBeenCalled();
		expect(doc.layer(id)).toMatchObject({ x: 420, y: 260 });
	});
});
