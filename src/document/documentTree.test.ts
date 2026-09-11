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

describe("a move of a layer", () => {
	it("gives the layer a new parent and takes it out of the old child list", () => {
		const doc = DesignDocument.create();
		const from = doc.createLayer(DRAWN);
		const to = doc.createLayer(DRAWN);
		const child = doc.createLayer(DRAWN, from);
		expect(doc.layer(child)).toMatchObject({ parent: from });

		expect(doc.move(child, to)).toBe(true);

		expect(doc.childIds(from)).toEqual([]);
		expect(doc.childIds(to)).toEqual([child]);
		expect(doc.layer(child)).toMatchObject({ parent: to });
		expect(doc.rootIds()).not.toContain(child);
	});

	it("puts the layer back among the roots", () => {
		const doc = DesignDocument.create();
		const parent = doc.createLayer(DRAWN);
		const child = doc.createLayer(DRAWN, parent);

		expect(doc.move(child, null)).toBe(true);

		expect(doc.childIds(parent)).toEqual([]);
		expect(doc.rootIds()).toContain(child);
		expect(doc.layer(child)).toMatchObject({ parent: null });
	});

	it("refuses a move into the subtree of the layer itself", () => {
		const doc = DesignDocument.create();
		const parent = doc.createLayer(DRAWN);
		const child = doc.createLayer(DRAWN, parent);
		const grandchild = doc.createLayer(DRAWN, child);

		expect(doc.move(parent, grandchild)).toBe(false);
		expect(doc.move(parent, parent)).toBe(false);

		expect(doc.layer(parent)).toMatchObject({ parent: null });
		expect(doc.childIds(grandchild)).toEqual([]);
		expect(doc.childIds(child)).toEqual([grandchild]);
	});

	it("refuses a move of a layer the document lost", () => {
		const doc = DesignDocument.create();
		const parent = doc.createLayer(DRAWN);
		const gone = doc.createLayer(DRAWN);
		doc.deleteLayer(gone);

		expect(doc.move(gone, parent)).toBe(false);
		expect(doc.move(parent, gone)).toBe(false);
		expect(doc.childIds(parent)).toEqual([]);
	});

	it("puts the layer at the index the move names among its new siblings", () => {
		const doc = DesignDocument.create();
		const parent = doc.createLayer(DRAWN);
		const first = doc.createLayer(DRAWN, parent);
		const second = doc.createLayer(DRAWN, parent);
		const joined = doc.createLayer(DRAWN);

		expect(doc.move(joined, parent, 1)).toBe(true);

		expect(doc.childIds(parent)).toEqual([first, joined, second]);
	});

	it("counts the index of a move in the same parent after the layer leaves its place", () => {
		const doc = DesignDocument.create();
		const parent = doc.createLayer(DRAWN);
		const first = doc.createLayer(DRAWN, parent);
		const second = doc.createLayer(DRAWN, parent);
		const third = doc.createLayer(DRAWN, parent);

		expect(doc.move(first, parent, 2)).toBe(true);

		expect(doc.childIds(parent)).toEqual([second, third, first]);
	});

	it("refuses an index beyond the end of the new child list", () => {
		const doc = DesignDocument.create();
		const parent = doc.createLayer(DRAWN);
		const child = doc.createLayer(DRAWN, parent);
		const joined = doc.createLayer(DRAWN);

		expect(doc.move(joined, parent, 2)).toBe(false);
		expect(doc.move(child, parent, 1)).toBe(false);
		expect(doc.move(joined, null, 9)).toBe(false);
		expect(doc.move(joined, parent, -1)).toBe(false);

		expect(doc.childIds(parent)).toEqual([child]);
		expect(doc.rootIds()).toContain(joined);
	});

	it("takes the last index that the new child list has room for", () => {
		const doc = DesignDocument.create();
		const parent = doc.createLayer(DRAWN);
		const child = doc.createLayer(DRAWN, parent);
		const joined = doc.createLayer(DRAWN);

		expect(doc.move(joined, parent, 1)).toBe(true);

		expect(doc.childIds(parent)).toEqual([child, joined]);
	});

	it("notifies the layer list and the layer itself when the parent changes", () => {
		const doc = DesignDocument.create();
		const parent = doc.createLayer(DRAWN);
		const child = doc.createLayer(DRAWN);
		const structure = vi.fn<() => void>();
		const layer = vi.fn<() => void>();
		doc.subscribeStructure(structure);
		doc.subscribeLayer(child, layer);

		doc.move(child, parent);

		expect(structure).toHaveBeenCalled();
		expect(layer).toHaveBeenCalled();
	});
});
