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

async function fontFile(face: FaceShape = LATIN): Promise<FontFile> {
	return { asset: await fontAssetOf(new Uint8Array([1, 2, 3, face.weight[0]])), face };
}

describe("the fonts of a document", () => {
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

	it("waits for an open edit to end, and keeps the font out of the undo history", async () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		const file = await fontFile();
		doc.update(id, { x: 99 });

		doc.fonts.add([file]);
		const whileOpen = doc.fonts.faces().length;
		doc.commit("move layer");
		doc.undo();

		expect(whileOpen).toBe(0);
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
