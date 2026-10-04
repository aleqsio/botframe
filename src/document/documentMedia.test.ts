import { LoroDoc } from "loro-crdt";
import { describe, expect, it } from "vitest";
import { assetOf } from "./assets";
import type { AssetId } from "./assets";
import { DesignDocument } from "./document";
import { DRAWN } from "./documentFixtures";
import { parseEnvelope, serializeEnvelope } from "./envelope";
import type { LayerId } from "./layer";
import { nodeOf } from "./path";

async function pictureId(): Promise<AssetId> {
	const asset = await assetOf(new TextEncoder().encode("picture"), "image/webp");
	if (asset === null) {
		throw new Error("the asset is not valid");
	}
	return asset.id;
}

function layerData(doc: DesignDocument, id: LayerId): unknown {
	const loro = new LoroDoc();
	loro.import(doc.snapshot());
	return loro.getTree("layers").getNodeByID(nodeOf(id))?.data.get("media");
}

describe("the media fill of a layer", () => {
	it("reads no media for a layer that has none", () => {
		const doc = DesignDocument.create();
		const id = doc.createLayer(DRAWN);

		expect(doc.layer(id)?.media).toBeNull();
	});

	it("keeps the asset and the fit through a save and a load", async () => {
		const asset = await pictureId();
		const doc = DesignDocument.create();
		const id = doc.createLayer(DRAWN);
		doc.update(id, { media: { asset, fit: "tile", stack: "under" } });
		doc.commit("set media");

		expect(DesignDocument.open(doc.snapshot()).layer(id)?.media).toEqual({
			asset,
			fit: "tile",
			stack: "under",
		});
	});

	it("reads a media value with no stack as media over the paint", async () => {
		const asset = await pictureId();
		const doc = DesignDocument.create();
		const id = doc.createLayer(DRAWN);
		const loro = new LoroDoc();
		loro.import(doc.snapshot());
		loro.getTree("layers").getNodeByID(nodeOf(id))?.data.set("media", { asset, fit: "cover" });
		loro.commit();

		expect(DesignDocument.open(loro.export({ mode: "snapshot" })).layer(id)?.media).toEqual({
			asset,
			fit: "cover",
			stack: "over",
		});
	});

	it("removes the stored key when the media is removed", async () => {
		const doc = DesignDocument.create();
		const id = doc.createLayer(DRAWN);
		doc.update(id, { media: { asset: await pictureId(), fit: "cover", stack: "over" } });
		doc.commit("set media");

		doc.update(id, { media: null });
		doc.commit("remove media");

		expect(doc.layer(id)?.media).toBeNull();
		expect(layerData(doc, id)).toBeUndefined();
	});

	it("reads a media value with no valid content address as no media", () => {
		const doc = DesignDocument.create();
		const id = doc.createLayer(DRAWN);
		const loro = new LoroDoc();
		loro.import(doc.snapshot());
		loro
			.getTree("layers")
			.getNodeByID(nodeOf(id))
			?.data.set("media", { asset: "a.png", fit: "cover" });
		loro.commit();

		expect(DesignDocument.open(loro.export({ mode: "snapshot" })).layer(id)?.media).toBeNull();
	});

	it("reads an unknown fit as cover", async () => {
		const asset = await pictureId();

		const envelope = parseEnvelope(
			serializeEnvelope({
				sourceParent: null,
				sourceIds: [],
				layers: [],
				components: {},
			}).replace('"layers":[]', `"layers":[{"media":{"asset":"${asset}","fit":"zoom"}}]`),
		);

		expect(envelope?.layers[0]?.media).toEqual({ asset, fit: "cover", stack: "over" });
	});

	it("copies the media with the subtree of a layer", async () => {
		const asset = await pictureId();
		const doc = DesignDocument.create();
		const id = doc.createLayer(DRAWN);
		doc.update(id, { media: { asset, fit: "contain", stack: "over" } });
		doc.commit("set media");
		const node = doc.readSubtree(id);
		if (node === null) {
			throw new Error("the layer is missing");
		}

		const copy = doc.createSubtree(node, null);

		expect(doc.layer(copy)?.media).toEqual({ asset, fit: "contain", stack: "over" });
	});
});
