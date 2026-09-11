import { describe, expect, it, vi } from "vitest";
import { DesignDocument } from "./document";
import { firstId } from "./documentFixtures";
import type { LayerFields, LayerId } from "./layer";

const CHILD: LayerFields = {
	x: 0,
	y: 0,
	width: 120,
	height: 80,
	fill: "#d9d9d9",
	name: "Child",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: false },
};

interface Scene {
	doc: DesignDocument;
	root: LayerId;
	child: LayerId;
}

function scene(): Scene {
	const doc = DesignDocument.create();
	const root = firstId(doc);
	const child = doc.createLayer(CHILD, root);
	doc.commit("create layers");
	return { doc, root, child };
}

describe("a length that is not in pixels", () => {
	it("resolves a percentage against the size of the container", () => {
		const { doc, child } = scene();

		doc.update(child, { lengths: { width: { value: 50, unit: "%" } } });

		expect(doc.layer(child)).toMatchObject({ width: 120, height: 80 });
	});

	it("resolves a percentage of the position against the axis of the field", () => {
		const { doc, child } = scene();

		doc.update(child, {
			lengths: { x: { value: 50, unit: "%" }, y: { value: 50, unit: "%" } },
		});

		expect(doc.layer(child)).toMatchObject({ x: 120, y: 80 });
	});

	it("resolves vw and vh against the artboard at the root", () => {
		const { doc, root, child } = scene();
		const grandchild = doc.createLayer(CHILD, child);

		doc.update(grandchild, {
			lengths: { width: { value: 10, unit: "vw" }, height: { value: 10, unit: "vh" } },
		});

		expect(doc.layer(root)).toMatchObject({ width: 240, height: 160 });
		expect(doc.layer(grandchild)).toMatchObject({ width: 24, height: 16 });
	});

	it("gives a layer at the root no container and no artboard", () => {
		const { doc, root } = scene();

		expect(doc.layer(root)?.basis).toEqual({
			container: { width: 0, height: 0 },
			root: { width: 0, height: 0 },
		});
	});

	it("keeps the unit when a drag writes pixels", () => {
		const { doc, child } = scene();
		doc.update(child, { lengths: { width: { value: 50, unit: "%" } } });

		doc.update(child, { width: 60 });

		expect(doc.layer(child)?.lengths.width).toEqual({ value: 25, unit: "%" });
		expect(doc.layer(child)).toMatchObject({ width: 60 });
	});

	it("follows the container when the container changes size", () => {
		const { doc, root, child } = scene();
		doc.update(child, { lengths: { width: { value: 50, unit: "%" } } });

		doc.update(root, { width: 400 });

		expect(doc.layer(child)).toMatchObject({ width: 200 });
	});

	it("tells a relative child that the size of the container changed", () => {
		const { doc, root, child } = scene();
		doc.update(child, { lengths: { width: { value: 50, unit: "%" } } });
		const listener = vi.fn<() => void>();
		doc.subscribeLayer(child, listener);
		doc.layer(child);

		doc.update(root, { width: 400 });

		expect(listener).toHaveBeenCalled();
	});

	it("leaves a child in pixels where it stands when the container changes size", () => {
		const { doc, root, child } = scene();

		doc.update(root, { width: 400 });

		expect(doc.layer(child)).toMatchObject({ width: 120 });
	});

	it("reads a layer that no peer wrote a unit for as a layer in pixels", () => {
		const { doc, child } = scene();

		expect(doc.layer(child)?.lengths).toEqual({
			x: { value: 0, unit: "px" },
			y: { value: 0, unit: "px" },
			width: { value: 120, unit: "px" },
			height: { value: 80, unit: "px" },
		});
	});

	it("writes the unit back to pixels", () => {
		const { doc, child } = scene();
		doc.update(child, { lengths: { width: { value: 50, unit: "%" } } });

		doc.update(child, { lengths: { width: { value: 90, unit: "px" } } });

		expect(doc.layer(child)?.lengths.width).toEqual({ value: 90, unit: "px" });
	});
});

describe("a length when the tree changes", () => {
	it("keeps the size of a layer that leaves its container", () => {
		const { doc, child } = scene();
		doc.update(child, { lengths: { width: { value: 50, unit: "%" } } });

		doc.move(child, null);

		expect(doc.layer(child)?.lengths.width).toEqual({ value: 120, unit: "px" });
		expect(doc.layer(child)).toMatchObject({ width: 120 });
	});

	it("keeps a percentage that the new container can hold", () => {
		const { doc, root, child } = scene();
		const other = doc.createLayer({ ...CHILD, width: 480 }, root);
		doc.update(child, { lengths: { width: { value: 50, unit: "%" } } });

		doc.move(child, other);

		expect(doc.layer(child)?.lengths.width).toEqual({ value: 50, unit: "%" });
		expect(doc.layer(child)).toMatchObject({ width: 240 });
	});

	it("gives a copy at the root the pixels of the layer it comes from", () => {
		const { doc, child } = scene();
		doc.update(child, { lengths: { width: { value: 50, unit: "%" } } });
		const node = doc.readSubtree(child);

		const copy = node === null ? null : doc.createSubtree(node, null);

		expect(copy === null ? null : doc.layer(copy)).toMatchObject({ width: 120 });
	});

	it("resolves a grandchild in vw under a child in pixels after the artboard grows", () => {
		const { doc, root, child } = scene();
		const grandchild = doc.createLayer(CHILD, child);
		doc.update(grandchild, { lengths: { width: { value: 10, unit: "vw" } } });
		expect(doc.layer(grandchild)).toMatchObject({ width: 24 });

		doc.update(root, { width: 480 });

		expect(doc.layer(grandchild)).toMatchObject({ width: 48 });
	});

	it("holds the size of a child in pixels that changes to a percentage after a resize", () => {
		const { doc, root, child } = scene();
		doc.layer(child);

		doc.update(root, { width: 480 });

		expect(doc.layer(child)?.basis.container).toEqual({ width: 480, height: 160 });
	});

	it("gives back the unit that an undo takes away", () => {
		const { doc, child } = scene();
		doc.update(child, { lengths: { width: { value: 50, unit: "%" } } });
		doc.commit("set width");

		doc.undo();

		expect(doc.layer(child)?.lengths.width).toEqual({ value: 120, unit: "px" });

		doc.redo();

		expect(doc.layer(child)?.lengths.width).toEqual({ value: 50, unit: "%" });
	});
});
