import { LoroDoc } from "loro-crdt";
import { describe, expect, it, vi } from "vitest";
import { DesignDocument } from "./document";
import { DRAWN, firstId } from "./documentFixtures";
import type { LayerFields, LayerId } from "./layer";
import type { Layout } from "./layout";

const ARTBOARD: LayerFields = { ...DRAWN, x: 0, y: 0, width: 300, height: 200 };
const SMALL: LayerFields = {
	x: 90,
	y: 90,
	width: 40,
	height: 30,
	fill: "#ff0000",
	name: "",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: false },
};
const ROW: Layout = { kind: "flex", direction: "row", gap: 10, padding: 5 };
const GRID: Layout = { kind: "grid", columns: 2, rows: 2, gap: 0, padding: 0 };

function rowScene(): { doc: DesignDocument; box: LayerId; first: LayerId; second: LayerId } {
	const doc = DesignDocument.create();
	const box = doc.createLayer(ARTBOARD);
	doc.update(box, { layout: ROW });
	const first = doc.createLayer(SMALL, box);
	const second = doc.createLayer({ ...SMALL, width: 60 }, box);
	doc.commit("build");
	return { doc, box, first, second };
}

describe("a layer inside a flex container", () => {
	it("takes its position from the layout, not from its stored lengths", () => {
		const { doc, first, second } = rowScene();
		expect(doc.layer(first)).toMatchObject({ x: 5, y: 5 });
		expect(doc.layer(second)).toMatchObject({ x: 55, y: 5 });
		expect(doc.layer(second)?.lengths.x.value).toBe(90);
	});

	it("moves when a sibling before it changes its size", () => {
		const { doc, first, second } = rowScene();
		const listener = vi.fn<() => void>();
		doc.subscribeLayer(second, listener);
		expect(doc.layer(second)?.x).toBe(55);

		doc.update(first, { width: 100 });

		expect(doc.layer(second)?.x).toBe(115);
		expect(listener).toHaveBeenCalled();
	});

	it("moves when the order of the children changes", () => {
		const { doc, box, first, second } = rowScene();
		doc.move(second, box, 0);
		expect(doc.layer(second)?.x).toBe(5);
		expect(doc.layer(first)?.x).toBe(75);
	});

	it("moves when a sibling arrives or leaves", () => {
		const { doc, box, first, second } = rowScene();
		const third = doc.createLayer(SMALL, box);
		doc.move(third, box, 0);
		expect(doc.layer(first)?.x).toBe(55);
		doc.deleteLayer(first);
		expect(doc.layer(second)?.x).toBe(55);
	});

	it("goes back to its stored position when the container becomes free", () => {
		const { doc, box, second } = rowScene();
		doc.update(box, { layout: { kind: "free" } });
		expect(doc.layer(second)).toMatchObject({ x: 90, y: 90 });
	});

	it("takes a new layout of the container", () => {
		const { doc, box, second } = rowScene();
		doc.update(box, { layout: { ...ROW, direction: "column" } });
		expect(doc.layer(second)).toMatchObject({ x: 5, y: 45 });
	});

	it("keeps its position after undo brings the layout back", () => {
		const { doc, box, second } = rowScene();
		doc.update(box, { layout: { kind: "free" } });
		doc.commit("free");
		doc.undo();
		expect(doc.layer(second)?.x).toBe(55);
	});

	it("follows a container whose own size comes from an ancestor", () => {
		const doc = DesignDocument.create();
		const outer = doc.createLayer({ ...ARTBOARD, width: 400 });
		const inner = doc.createLayer(ARTBOARD, outer);
		doc.update(inner, { layout: GRID, lengths: { width: { value: 50, unit: "%" } } });
		const child = doc.createLayer(SMALL, inner);
		doc.update(child, { cell: { column: 1, row: 0 } });
		doc.subscribeLayer(inner, () => {});
		expect(doc.layer(child)?.x).toBe(100);

		doc.update(outer, { width: 800 });

		expect(doc.layer(inner)?.width).toBe(400);
		expect(doc.layer(child)?.x).toBe(200);
	});

	it("reflows the children of a container that left the cache", () => {
		const { doc, box, second } = rowScene();
		const outer = doc.createLayer({ ...ARTBOARD, width: 800 });
		doc.update(outer, { layout: ROW });
		doc.move(box, outer);
		const sibling = doc.createLayer(SMALL, outer);
		expect(doc.layer(second)?.x).toBe(55);

		doc.update(sibling, { width: 70 });
		doc.update(box, { layout: { kind: "free" } });

		expect(doc.layer(second)).toMatchObject({ x: 90, y: 90 });
	});

	it("leaves the siblings alone when a child changes a field outside the layout", () => {
		const { doc, first, second } = rowScene();
		const listener = vi.fn<() => void>();
		doc.subscribeLayer(second, listener);
		expect(doc.layer(second)?.x).toBe(55);

		doc.update(first, { fill: "#123456" });

		expect(listener).not.toHaveBeenCalled();
	});

	it("takes the layout of a remote peer", () => {
		const { doc, box, second } = rowScene();
		const peer = DesignDocument.open(doc.snapshot());
		peer.update(box, { layout: { ...ROW, gap: 50 } });
		peer.commit("gap");
		doc.subscribeLayer(box, () => {});
		doc.subscribeLayer(second, () => {});

		doc.merge(peer.snapshot());

		expect(doc.layer(second)?.x).toBe(95);
	});
});

describe("a layer inside a grid container", () => {
	it("flows into a cell and the cell size follows the container", () => {
		const { doc, box, first, second } = rowScene();
		doc.update(box, { layout: GRID });
		expect(doc.layer(first)).toMatchObject({ x: 0, y: 0, cell: null, slot: { column: 0, row: 0 } });
		expect(doc.layer(second)).toMatchObject({ x: 150, y: 0, slot: { column: 1, row: 0 } });

		doc.update(box, { width: 100 });

		expect(doc.layer(second)?.x).toBe(50);
	});

	it("holds an explicit cell and goes back to the flow when the cell clears", () => {
		const { doc, box, first } = rowScene();
		doc.update(box, { layout: GRID });
		doc.update(first, { cell: { column: 1, row: 1 } });
		expect(doc.layer(first)).toMatchObject({
			x: 150,
			y: 100,
			cell: { column: 1, row: 1 },
			slot: { column: 1, row: 1 },
		});

		doc.update(first, { cell: null });

		expect(doc.layer(first)).toMatchObject({ x: 0, y: 0, cell: null, slot: { column: 0, row: 0 } });
	});

	it("reads a cell that a peer wrote with bad values as the nearest whole index", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		const peer = new LoroDoc();
		peer.import(doc.snapshot());
		const cell = peer.getTree("layers").getNodeByID(id)?.data.ensureMergeableMap("cell");
		cell?.set("column", -3.7);
		cell?.set("row", 2.9);
		peer.commit();

		doc.merge(peer.export({ mode: "update" }));

		expect(doc.layer(id)?.cell).toEqual({ column: 0, row: 2 });
	});
});

describe("guides", () => {
	it("holds the guides that a patch writes and drops them when the list is empty", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		doc.update(id, { guides: [{ axis: "x", at: 12 }] });
		expect(doc.layer(id)?.guides).toEqual([{ axis: "x", at: 12 }]);

		doc.update(id, { guides: [] });

		expect(doc.layer(id)?.guides).toEqual([]);
	});

	it("keeps only the guides that have an axis and a finite position", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		const peer = new LoroDoc();
		peer.import(doc.snapshot());
		peer
			.getTree("layers")
			.getNodeByID(id)
			?.data.set("guides", [{ axis: "y", at: 4 }, { axis: "z", at: 1 }, { axis: "x" }, 7]);
		peer.commit();

		doc.merge(peer.export({ mode: "update" }));

		expect(doc.layer(id)?.guides).toEqual([{ axis: "y", at: 4 }]);
	});

	it("reads a layout with bad values as a safe layout", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		const peer = new LoroDoc();
		peer.import(doc.snapshot());
		const bag = peer.getTree("layers").getNodeByID(id)?.data.ensureMergeableMap("layout");
		bag?.set("kind", "grid");
		const grid = bag?.ensureMergeableMap("grid");
		grid?.set("columns", 0);
		grid?.set("gap", -4);
		peer.commit();

		doc.merge(peer.export({ mode: "update" }));

		expect(doc.layer(id)?.layout).toEqual({
			kind: "grid",
			columns: 1,
			rows: 1,
			gap: 0,
			padding: 0,
		});
	});
});

describe("a copied subtree", () => {
	it("carries the layout, the cells, and the guides", () => {
		const { doc, box, first } = rowScene();
		doc.update(box, { layout: GRID, guides: [{ axis: "y", at: 40 }] });
		doc.update(first, { cell: { column: 1, row: 1 } });
		const node = doc.readSubtree(box);
		if (node === null) {
			throw new Error("the subtree is missing");
		}

		const copy = doc.createSubtree(node, null);

		expect(doc.layer(copy)).toMatchObject({ layout: GRID, guides: [{ axis: "y", at: 40 }] });
		const [child] = doc.childIds(copy);
		expect(child === undefined ? null : doc.layer(child)).toMatchObject({
			cell: { column: 1, row: 1 },
		});
	});
});
