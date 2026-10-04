import { describe, expect, it } from "vitest";
import { DesignDocument } from "./document";
import { firstId } from "./documentFixtures";
import { layerNodeFrom, layerPatchFrom } from "./layerChange";
import type { LayerNode } from "./subtree";

function currentNode(doc: DesignDocument): LayerNode {
	const node = doc.readSubtree(firstId(doc));
	if (node === null) {
		throw new Error("layer is missing");
	}
	return node;
}

describe("layerPatchFrom", () => {
	it("gives only the keys that the change changes", () => {
		const doc = DesignDocument.create();
		expect(layerPatchFrom(currentNode(doc), { fill: "#00ff00", name: "" })).toEqual({
			fill: "#00ff00",
		});
	});

	it("merges a nested change into the held value", () => {
		const doc = DesignDocument.create();
		const patch = layerPatchFrom(currentNode(doc), {
			geometry: { cornerRadius: 8 },
			layout: { padding: { top: { value: 4, unit: "px" } } },
		});
		expect(patch.geometry).toEqual({
			kind: "rectangle",
			cornerRadius: 8,
			cornerSmoothing: 0,
			frame: false,
		});
		expect(patch.layout?.padding?.top).toEqual({ value: 4, unit: "px" });
		expect(patch.layout?.padding?.left).toEqual({ value: 0, unit: "px" });
	});

	it("drops a value that is not valid", () => {
		const doc = DesignDocument.create();
		expect(layerPatchFrom(currentNode(doc), { x: "far", media: { asset: "nope" } })).toEqual({
			x: 0,
		});
	});

	it("removes a binding that the change sets to null", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		doc.update(id, { bindings: { fill: { var: "brand" } } });
		const patch = layerPatchFrom(currentNode(doc), { bindings: { fill: null } });
		expect(patch).toEqual({ bindings: { fill: null } });
		doc.update(id, patch);
		expect(doc.layer(id)?.bindings).toEqual({});
	});

	it("resets a turn to zero", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		doc.update(id, { rotation: 30 });
		expect(layerPatchFrom(currentNode(doc), { rotation: 0 })).toEqual({ rotation: 0 });
	});
});

describe("layerNodeFrom", () => {
	it("reads a flat layer with children", () => {
		const node = layerNodeFrom({
			x: 1,
			width: 10,
			geometry: { kind: "ellipse" },
			children: [{ name: "Child", fill: "#123456" }],
		});
		expect(node.fields).toMatchObject({ x: 1, width: 10, geometry: { kind: "ellipse" } });
		expect(node.children[0]?.fields).toMatchObject({ name: "Child", fill: "#123456" });
	});
});
