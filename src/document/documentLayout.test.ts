import { LoroDoc } from "loro-crdt";
import type { LoroMap } from "loro-crdt";
import { describe, expect, it, vi } from "vitest";
import { DesignDocument } from "./document";
import { firstId } from "./documentFixtures";
import type { LayerId } from "./layer";
import { DEFAULT_LAYOUT } from "./layout";
import type { LayoutPatch } from "./layout";
import { nodeOf } from "./path";

function layoutBag(doc: DesignDocument, id: LayerId): LoroMap {
	const held = new LoroDoc();
	held.import(doc.snapshot());
	const node = held.getTree("layers").getNodeByID(nodeOf(id));
	if (node === undefined) {
		throw new Error("layer is missing");
	}
	return node.data.ensureMergeableMap("layout");
}

function stored(patch: LayoutPatch): LoroMap {
	const doc = DesignDocument.create();
	const id = firstId(doc);
	doc.update(id, { layout: patch });
	doc.commit("set layout");
	return layoutBag(doc, id);
}

describe("the layout of a layer", () => {
	it("gives the default layout to a layer that no peer has changed", () => {
		const doc = DesignDocument.create();
		expect(doc.layer(firstId(doc))?.layout).toEqual(DEFAULT_LAYOUT);
	});

	it("reads back the display a patch writes", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		doc.update(id, { layout: { display: "row" } });
		expect(doc.layer(id)?.layout.display).toBe("row");
	});

	it("reads back a whole group that a patch replaces", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		const padding = {
			top: { value: 16, unit: "px" },
			right: { value: 1, unit: "rem" },
			bottom: { value: 16, unit: "px" },
			left: { value: 1, unit: "rem" },
		} as const;

		doc.update(id, { layout: { padding, tracks: { columns: [{ unit: "auto" }], rows: [] } } });

		expect(doc.layer(id)?.layout.padding).toEqual(padding);
		expect(doc.layer(id)?.layout.tracks.columns).toEqual([{ unit: "auto" }]);
		expect(doc.layer(id)?.layout.tracks.rows).toEqual(DEFAULT_LAYOUT.tracks.rows);
	});

	it("stores a key that differs from its default", () => {
		expect(stored({ display: "grid" }).get("display")).toBe("grid");
	});

	it("stores no key for a value that equals its default", () => {
		expect(stored({ display: "block" }).get("display")).toBeUndefined();
		expect(stored({ wrap: false }).get("wrap")).toBeUndefined();
		expect(stored({ tracks: DEFAULT_LAYOUT.tracks }).get("tracks")).toBeUndefined();
	});

	it("removes a stored key when a later patch sets the default again", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		doc.update(id, { layout: { display: "grid" } });
		doc.commit("set layout");
		doc.update(id, { layout: { display: "block" } });
		doc.commit("set layout");

		expect(layoutBag(doc, id).get("display")).toBeUndefined();
		expect(doc.layer(id)?.layout.display).toBe("block");
	});

	it("notifies the subscriber of a layer when a remote peer changes its layout", async () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		const listener = vi.fn<() => void>();
		doc.subscribeLayer(id, listener);

		const peer = new LoroDoc();
		peer.setPeerId(55);
		peer.import(doc.snapshot());
		peer
			.getTree("layers")
			.getNodeByID(nodeOf(id))
			?.data.ensureMergeableMap("layout")
			.set("display", "row");
		peer.commit();
		doc.merge(peer.export({ mode: "update" }));

		await vi.waitFor(() => {
			expect(listener).toHaveBeenCalled();
			expect(doc.layer(id)?.layout.display).toBe("row");
		});
	});

	it("reads a layout that a newer build wrote as the default of that field", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);

		const peer = new LoroDoc();
		peer.setPeerId(66);
		peer.import(doc.snapshot());
		const bag = peer.getTree("layers").getNodeByID(nodeOf(id))?.data.ensureMergeableMap("layout");
		bag?.set("display", "masonry");
		bag?.set("gap", { column: { value: 6, unit: "px" } });
		peer.commit();
		doc.merge(peer.export({ mode: "update" }));

		expect(DesignDocument.open(doc.snapshot()).layer(id)?.layout).toMatchObject({
			display: "block",
			gap: { column: { value: 6, unit: "px" }, row: { value: 0, unit: "px" } },
		});
	});
});
