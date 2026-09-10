import { describe, expect, it, vi } from "vitest";
import { DesignDocument } from "./document";
import { DRAWN, firstId } from "./documentFixtures";

describe("the layer tree", () => {
	it("creates a layer inside a parent and keeps it out of the roots", () => {
		const doc = DesignDocument.create();
		const parent = doc.createLayer(DRAWN);

		const child = doc.createLayer(DRAWN, parent);

		expect(doc.childIds(parent)).toEqual([child]);
		expect(doc.rootIds()).not.toContain(child);
		expect(doc.rootIds()).toContain(parent);
		expect(doc.layer(child)).toMatchObject({ parent });
		expect(doc.layer(parent)).toMatchObject({ parent: null });
	});

	it("appends each new child after its siblings and holds that order through a snapshot", () => {
		const doc = DesignDocument.create();
		const parent = doc.createLayer(DRAWN);
		const first = doc.createLayer(DRAWN, parent);
		const second = doc.createLayer(DRAWN, parent);
		doc.commit("create artboard");

		expect(doc.childIds(parent)).toEqual([first, second]);
		expect(DesignDocument.open(doc.snapshot()).childIds(parent)).toEqual([first, second]);
	});

	it("gives no children for a layer that holds none", () => {
		const doc = DesignDocument.create();
		expect(doc.childIds(firstId(doc))).toEqual([]);
	});

	it("returns a stable list of children so React does not re-render without a change", () => {
		const doc = DesignDocument.create();
		const parent = doc.createLayer(DRAWN);
		doc.createLayer(DRAWN, parent);

		expect(doc.childIds(parent)).toBe(doc.childIds(parent));
		expect(doc.rootIds()).toBe(doc.rootIds());
	});

	it("keeps the children of one layer stable when a layer joins a different parent", () => {
		const doc = DesignDocument.create();
		const a = doc.createLayer(DRAWN);
		const b = doc.createLayer(DRAWN);
		const before = doc.childIds(b);
		const roots = doc.rootIds();

		doc.createLayer(DRAWN, a);

		expect(doc.childIds(b)).toBe(before);
		expect(doc.rootIds()).toBe(roots);
		expect(doc.childIds(a)).toHaveLength(1);
	});

	it("gives a new list of children to the layer that took the new child", () => {
		const doc = DesignDocument.create();
		const a = doc.createLayer(DRAWN);
		const before = doc.childIds(a);

		doc.createLayer(DRAWN, a);

		expect(doc.childIds(a)).not.toBe(before);
	});

	it("keeps the snapshot of each other layer when a layer joins the tree", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		const before = doc.layer(id);

		doc.createLayer(DRAWN);

		expect(doc.layer(id)).toBe(before);
	});

	it("takes the whole branch away when a delete takes the parent", () => {
		const doc = DesignDocument.create();
		const parent = doc.createLayer(DRAWN);
		const child = doc.createLayer(DRAWN, parent);

		doc.deleteLayer(parent);

		expect(doc.layerIds()).not.toContain(child);
		expect(doc.layer(child)).toBeNull();
		expect(doc.childIds(parent)).toEqual([]);
	});

	it("notifies the layer list when a layer joins a parent", () => {
		const doc = DesignDocument.create();
		const parent = doc.createLayer(DRAWN);
		const structure = vi.fn<() => void>();
		doc.subscribeStructure(structure);

		doc.createLayer(DRAWN, parent);

		expect(structure).toHaveBeenCalled();
		expect(doc.childIds(parent)).toHaveLength(1);
	});
});
