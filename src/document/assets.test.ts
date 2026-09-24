import { LoroDoc } from "loro-crdt";
import { describe, expect, it } from "vitest";
import { AssetStore, assetOf, isAssetId } from "./assets";
import type { Asset } from "./assets";
import { DesignDocument } from "./document";

const ABC = new TextEncoder().encode("abc");
const ABC_SHA256 = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

async function pngOf(bytes: Uint8Array<ArrayBuffer>): Promise<Asset> {
	const asset = await assetOf(bytes, "image/png");
	if (asset === null) {
		throw new Error("the asset is not valid");
	}
	return asset;
}

describe("assetOf", () => {
	it("gives the SHA-256 of the bytes as the content address", async () => {
		const asset = await pngOf(ABC);

		expect(asset.id).toBe(ABC_SHA256);
		expect(asset.type).toBe("image/png");
	});

	it("refuses a media type that the store does not show", async () => {
		await expect(assetOf(ABC, "text/html")).resolves.toBeNull();
		await expect(assetOf(ABC, "image/svg+xml")).resolves.toBeNull();
	});

	it("refuses an empty file", async () => {
		await expect(assetOf(new Uint8Array(0), "image/png")).resolves.toBeNull();
	});
});

describe("isAssetId", () => {
	it("accepts only a lowercase SHA-256 in hexadecimal", () => {
		expect(isAssetId(ABC_SHA256)).toBe(true);
		expect(isAssetId(ABC_SHA256.toUpperCase())).toBe(false);
		expect(isAssetId("../abc")).toBe(false);
	});
});

describe("the asset store", () => {
	it("keeps the bytes and the type through a save and a load", async () => {
		const doc = DesignDocument.create();
		const asset = await pngOf(ABC);
		doc.assets.put(asset);
		doc.commit("add asset");

		const reopened = DesignDocument.open(doc.snapshot());

		expect(reopened.assets.get(asset.id)).toEqual(asset);
	});

	it("knows an asset after a put and not before", async () => {
		const doc = DesignDocument.create();
		const asset = await pngOf(ABC);

		expect(doc.assets.has(asset.id)).toBe(false);
		doc.assets.put(asset);
		expect(doc.assets.has(asset.id)).toBe(true);
	});

	it("writes one change for an asset that it already holds", async () => {
		const doc = DesignDocument.create();
		const asset = await pngOf(ABC);
		doc.assets.put(asset);
		doc.commit("add asset");
		const changes = doc.changeCount();

		doc.assets.put(asset);
		doc.commit("add asset again");

		expect(doc.changeCount()).toBe(changes);
	});

	it("tells each listener when a commit adds an asset", async () => {
		const doc = DesignDocument.create();
		let calls = 0;
		const stop = doc.assets.subscribe(() => {
			calls += 1;
		});
		doc.assets.put(await pngOf(ABC));
		doc.commit("add asset");
		stop();
		doc.assets.put(await pngOf(new TextEncoder().encode("abcd")));
		doc.commit("add asset");

		expect(calls).toBe(1);
	});

	it("reads a stored entry of the wrong shape as no asset", async () => {
		const loro = new LoroDoc();
		const asset = await pngOf(ABC);
		loro.getMap("assets").set(asset.id, { type: "text/html", bytes: ABC });
		loro.commit();

		expect(new AssetStore(loro).get(asset.id)).toBeNull();
	});
});
