import { describe, expect, it } from "vitest";
import { fontAssetOf } from "./assets";
import { DesignDocument } from "./document";
import { firstId } from "./documentFixtures";
import type { FaceShape, FontFile } from "./fonts";

const LATIN: FaceShape = {
	family: "Inter",
	italic: false,
	weight: [100, 900],
	unicodeRange: "U+0000-00FF",
};

const WOFF2 = [0x77, 0x4f, 0x46, 0x32];

async function fontFile(face: FaceShape = LATIN): Promise<FontFile> {
	const asset = await fontAssetOf(new Uint8Array([...WOFF2, face.weight[0]]));
	if (asset === null) {
		throw new Error("the bytes are not a font");
	}
	return { asset, face };
}

describe("the fonts of a document", () => {
	it("takes only a WOFF2 file as a font", async () => {
		expect(await fontAssetOf(new TextEncoder().encode("<html>not a font</html>"))).toBeNull();
	});

	it("holds a face and tells which weights it covers", async () => {
		const doc = DesignDocument.create();
		const file = await fontFile();

		doc.fonts.add([file]);

		expect(doc.fonts.faces()).toEqual([{ ...LATIN, asset: file.asset.id }]);
		expect(doc.fonts.covers("Inter", false, 400)).toBe(true);
		expect(doc.fonts.covers("Inter", true, 400)).toBe(false);
		expect(doc.fonts.covers("Inter", false, 950)).toBe(false);
		expect(doc.fonts.covers("Lobster", false, 400)).toBe(false);
	});

	it("keeps the font file out of the media of the document", async () => {
		const doc = DesignDocument.create();
		const file = await fontFile();

		doc.fonts.add([file]);

		expect(doc.assets.ids()).toEqual([]);
		expect(doc.assets.get(file.asset.id)?.type).toBe("font/woff2");
	});

	it("shows the font at once, writes it when the open edit ends, and keeps it out of the undo history", async () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		const file = await fontFile();
		doc.update(id, { x: 99 });

		doc.fonts.add([file]);
		const shownWhileOpen = doc.fonts.covers("Inter", false, 400);
		const storedWhileOpen = doc.assets.get(file.asset.id);
		doc.commit("move layer");
		doc.undo();

		expect(shownWhileOpen).toBe(true);
		expect(storedWhileOpen).toBeNull();
		expect(doc.assets.get(file.asset.id)).not.toBeNull();
		expect(doc.layer(id)?.x).not.toBe(99);
		expect(doc.fonts.covers("Inter", false, 400)).toBe(true);
		expect(doc.canUndo()).toBe(false);
	});

	it("gives the fonts that a peer added", async () => {
		const doc = DesignDocument.create();
		const peer = DesignDocument.open(doc.snapshot());
		peer.fonts.add([await fontFile({ ...LATIN, italic: true })]);

		doc.merge(peer.snapshot());

		expect(doc.fonts.covers("Inter", true, 700)).toBe(true);
	});
});
