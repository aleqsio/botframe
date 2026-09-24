import { LoroDoc } from "loro-crdt";
import { describe, expect, it } from "vitest";
import { DesignDocument } from "./document";
import { DRAWN, firstId, pixelBox } from "./documentFixtures";
import type { Layer, LayerFields, LayerId } from "./layer";
import { PLAIN_RECTANGLE } from "./subtree";
import type { LayerNode } from "./subtree";

const CHILD: LayerFields = {
	x: 5,
	y: 6,
	width: 20,
	height: 30,
	fill: "#ff0000",
	name: "Child",
	clip: false,
	geometry: { kind: "ellipse" },
};

const GRANDCHILD: LayerFields = {
	x: 1,
	y: 2,
	width: 3,
	height: 4,
	fill: "#00ff00",
	name: "Grandchild",
	clip: false,
	geometry: { kind: "path", d: "M0 0 L10 10 Z" },
};

function subtreeOf(doc: DesignDocument, id: LayerId): LayerNode {
	const node = doc.readSubtree(id);
	if (node === null) {
		throw new Error("the subtree is missing");
	}
	return node;
}

function firstChildOf(doc: DesignDocument, id: LayerId): Layer {
	const [child] = doc.childIds(id);
	const layer = child === undefined ? null : doc.layer(child);
	if (layer === null) {
		throw new Error("the layer has no child");
	}
	return layer;
}

function threeLevels(doc: DesignDocument): { root: LayerId; child: LayerId } {
	const root = doc.createLayer(DRAWN);
	const child = doc.createLayer(CHILD, root);
	doc.createLayer(GRANDCHILD, child);
	doc.update(child, { rotation: 45, skewX: 12, skewY: 0, mirrored: true });
	doc.commit("create layers");
	return { root, child };
}

describe("readSubtree", () => {
	it("reads the fields, the angle, and the shape of a tree two levels deep", () => {
		const doc = DesignDocument.create();
		const { root } = threeLevels(doc);

		expect(doc.readSubtree(root)).toEqual({
			fields: DRAWN,
			rotation: 0,
			skewX: 0,
			skewY: 0,
			mirrored: false,
			...pixelBox(DRAWN),
			children: [
				{
					fields: CHILD,
					rotation: 45,
					skewX: 12,
					skewY: 0,
					mirrored: true,
					...pixelBox(CHILD),
					children: [
						{
							fields: GRANDCHILD,
							rotation: 0,
							skewX: 0,
							skewY: 0,
							mirrored: false,
							...pixelBox(GRANDCHILD),
							children: [],
						},
					],
				},
			],
		});
	});

	it("gives null for a layer that the document does not hold", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		doc.deleteLayer(id);
		expect(doc.readSubtree(id)).toBeNull();
	});

	it("reads a geometry that a newer build wrote as a plain rectangle", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		const peer = new LoroDoc();
		peer.setPeerId(77);
		peer.import(doc.snapshot());
		peer
			.getTree("layers")
			.getNodeByID(id)
			?.data.ensureMergeableMap("geometry")
			.set("kind", "shader");
		peer.commit();
		doc.merge(peer.export({ mode: "update" }));

		expect(doc.layer(id)?.geometry).toEqual({ kind: "unsupported" });
		expect(doc.readSubtree(id)?.fields.geometry).toEqual(PLAIN_RECTANGLE);
	});
});

describe("createSubtree", () => {
	it("creates the same shape under a different parent and gives each layer a new id", () => {
		const doc = DesignDocument.create();
		const { root } = threeLevels(doc);
		const node = subtreeOf(doc, root);
		const seed = firstId(doc);

		const copy = doc.createSubtree(node, seed);

		expect(copy).not.toBe(root);
		expect(doc.layer(copy)?.parent).toBe(seed);
		expect(doc.readSubtree(copy)).toEqual(node);
	});

	it("keeps the layout of each layer that it creates", () => {
		const doc = DesignDocument.create();
		const { root, child } = threeLevels(doc);
		doc.update(child, { layout: { display: "row", wrap: true } });
		doc.commit("set layout");

		const copy = doc.createSubtree(subtreeOf(doc, root), null);

		expect(firstChildOf(doc, copy).layout).toMatchObject({ display: "row", wrap: true });
	});

	it("keeps the origin of each layer that it creates", () => {
		const doc = DesignDocument.create();
		const { root } = threeLevels(doc);
		doc.update(root, { origin: { x: 0, y: 1 } });
		doc.commit("set origin");
		const node = doc.readSubtree(root);
		if (node === null) {
			throw new Error("the document lost the root");
		}

		const copy = doc.createSubtree(node, null);

		expect(doc.layer(copy)?.origin).toEqual({ x: 0, y: 1 });
		expect(firstChildOf(doc, copy).origin).toEqual({ x: 0.5, y: 0.5 });
	});

	it("keeps the angle and the mirror of each layer that it creates", () => {
		const doc = DesignDocument.create();
		const { root } = threeLevels(doc);
		const node = subtreeOf(doc, root);

		const copy = doc.createSubtree(node, null);

		expect(firstChildOf(doc, copy)).toMatchObject({
			rotation: 45,
			skewX: 12,
			skewY: 0,
			mirrored: true,
		});
		expect(doc.layer(copy)?.mirrored).toBe(false);
	});

	it("leaves the commit to the caller, so two subtrees make one change", () => {
		const doc = DesignDocument.create();
		const node = subtreeOf(doc, firstId(doc));
		const before = doc.changeCount();

		doc.createSubtree(node, null);
		doc.createSubtree(node, null);
		doc.commit("paste layers");

		expect(doc.changeCount()).toBe(before + 1);
	});
});
