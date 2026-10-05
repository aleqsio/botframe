import { DEFAULT_PLAYBACK } from "../../document/media";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Asset, AssetId } from "../../document/assets";
import { DesignDocument } from "../../document/document";
import { firstId } from "../../document/documentFixtures";
import type { Layer, LayerId } from "../../document/layer";
import type { MediaFill } from "../../document/media";
import type { FetchedMedia } from "../../shared/media";
import { addMediaFile, addMediaUrl, placeAsset, placeMediaFile } from "./mediaFile";

function mediaOf(doc: DesignDocument, id: LayerId): MediaFill {
	const media = doc.layer(id)?.media;
	if (media === undefined || media === null) {
		throw new Error("the layer has no media");
	}
	return media;
}

function layerOf(doc: DesignDocument, id: LayerId): Layer {
	const layer = doc.layer(id);
	if (layer === null) {
		throw new Error("the layer is missing");
	}
	return layer;
}

function assetOf(doc: DesignDocument, id: AssetId): Asset {
	const asset = doc.assets.get(id);
	if (asset === null) {
		throw new Error("the asset is missing");
	}
	return asset;
}

function seeded(): { doc: DesignDocument; layer: Layer } {
	const doc = DesignDocument.create();
	return { doc, layer: layerOf(doc, firstId(doc)) };
}

describe("placeMediaFile", () => {
	it("stores the file and fills the layer with it in one undo step", async () => {
		const { doc, layer } = seeded();

		await placeMediaFile(doc, layer, new File(["picture"], "a.png", { type: "image/png" }));

		const media = mediaOf(doc, layer.id);
		expect(media.fit).toBe("cover");
		expect(doc.assets.get(media.asset)?.type).toBe("image/png");
		doc.undo();
		expect(doc.layer(layer.id)?.media).toBeNull();
	});

	it("refuses a file that is not an image or a video", async () => {
		const { doc, layer } = seeded();

		await placeMediaFile(doc, layer, new File(["<p>"], "a.html", { type: "text/html" }));

		expect(doc.layer(layer.id)?.media).toBeNull();
	});

	it("starts a video that replaces a tiled image with the cover fit", async () => {
		const { doc, layer } = seeded();
		await placeMediaFile(doc, layer, new File(["picture"], "a.png", { type: "image/png" }));
		doc.update(layer.id, { media: { ...mediaOf(doc, layer.id), fit: "tile" } });
		doc.commit("set media");
		await placeMediaFile(
			doc,
			layerOf(doc, layer.id),
			new File(["clip"], "a.mp4", { type: "video/mp4" }),
		);

		expect(mediaOf(doc, layer.id).fit).toBe("cover");
	});

	it("stores nothing when the layer goes away while the file loads", async () => {
		const { doc, layer } = seeded();
		const placing = placeMediaFile(
			doc,
			layer,
			new File(["picture"], "a.png", { type: "image/png" }),
		);
		doc.deleteLayer(layer.id);
		doc.commit("delete layer");
		const changes = doc.changeCount();

		await placing;

		expect(doc.changeCount()).toBe(changes);
	});
});

function ellipseIn(doc: DesignDocument, name: string): LayerId {
	return doc.createLayer(
		{
			x: 0,
			y: 0,
			width: 10,
			height: 10,
			fill: "#ffffff",
			name,
			clip: false,
			geometry: { kind: "ellipse" },
		},
		null,
	);
}

describe("placeAsset", () => {
	it("fills each given layer with an asset that the document holds, in one undo step", async () => {
		const { doc, layer } = seeded();
		await placeMediaFile(doc, layer, new File(["picture"], "a.png", { type: "image/png" }));
		const { asset } = mediaOf(doc, layer.id);
		const one = ellipseIn(doc, "One");
		const other = ellipseIn(doc, "Other");
		doc.commit("add layers");

		placeAsset(doc, [layerOf(doc, one), layerOf(doc, other)], assetOf(doc, asset));

		expect(mediaOf(doc, one)).toEqual({ asset, fit: "cover", stack: "over", ...DEFAULT_PLAYBACK });
		expect(mediaOf(doc, other)).toEqual({
			asset,
			fit: "cover",
			stack: "over",
			...DEFAULT_PLAYBACK,
		});
		doc.undo();
		expect(doc.layer(one)?.media).toBeNull();
		expect(doc.layer(other)?.media).toBeNull();
	});
});

describe("addMediaFile", () => {
	it("stores the file in the document media in one undo step", async () => {
		const doc = DesignDocument.create();

		expect(await addMediaFile(doc, new File(["picture"], "a.png", { type: "image/png" }))).toBe(
			true,
		);

		expect(doc.assets.ids()).toHaveLength(1);
		doc.undo();
		expect(doc.assets.ids()).toHaveLength(0);
	});

	it("refuses a file that is not an image or a video", async () => {
		const doc = DesignDocument.create();

		expect(await addMediaFile(doc, new File(["<p>"], "a.html", { type: "text/html" }))).toBe(false);

		expect(doc.assets.ids()).toHaveLength(0);
	});
});

function fetchedAs(media: FetchedMedia | null): string[] {
	const asked: string[] = [];
	vi.stubGlobal("window", {
		botframe: {
			fetchMedia: (url: string) => {
				asked.push(url);
				return Promise.resolve(media);
			},
		},
	});
	return asked;
}

describe("addMediaUrl", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("stores the media that the desktop app fetches from the URL", async () => {
		const asked = fetchedAs({ type: "image/png", bytes: new TextEncoder().encode("picture") });
		const doc = DesignDocument.create();

		expect(await addMediaUrl(doc, "https://example.com/a.png")).toBe(true);

		expect(asked).toEqual(["https://example.com/a.png"]);
		expect(doc.assets.ids().map((id) => doc.assets.get(id)?.type)).toEqual(["image/png"]);
	});

	it("stores nothing when the URL gives a page and not media", async () => {
		fetchedAs({ type: "text/html", bytes: new TextEncoder().encode("<p>") });
		const doc = DesignDocument.create();

		expect(await addMediaUrl(doc, "https://example.com")).toBe(false);

		expect(doc.assets.ids()).toHaveLength(0);
	});

	it("stores nothing when the fetch fails", async () => {
		fetchedAs(null);
		const doc = DesignDocument.create();

		expect(await addMediaUrl(doc, "https://example.com/a.png")).toBe(false);

		expect(doc.assets.ids()).toHaveLength(0);
	});
});
