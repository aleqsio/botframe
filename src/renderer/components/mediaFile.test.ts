import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import { firstId } from "../../document/documentFixtures";
import type { Layer, LayerId } from "../../document/layer";
import type { MediaFill } from "../../document/media";
import { placeMediaFile } from "./mediaFile";

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
