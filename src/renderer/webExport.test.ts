import { describe, expect, it } from "vitest";
import { answerOf, downloadsOf } from "./webExport";

describe("answerOf", () => {
	it("reads a file, an error, and refuses a message that is not a reply", () => {
		const file = Uint8Array.of(1, 2);
		expect(answerOf({ id: 4, ok: true, result: file })).toEqual({ id: 4, file });
		expect(answerOf({ id: 5, ok: false, error: "No layer." })).toEqual({
			id: 5,
			error: "No layer.",
		});
		expect(answerOf({ id: 6, ok: true, result: "text" })).toEqual({
			id: 6,
			error: "botframe did not make the file.",
		});
		expect(answerOf("export:ready")).toBeNull();
		expect(answerOf({ id: "7", ok: true, result: file })).toBeNull();
		expect(answerOf({ id: 8, ok: false })).toBeNull();
	});
});

describe("downloadsOf", () => {
	const png = { name: "Card", format: "png" as const, bytes: Uint8Array.of(1) };

	it("downloads one file by its own name", () => {
		expect(downloadsOf([png])).toEqual([{ name: "Card.png", bytes: png.bytes }]);
	});

	it("puts several files in one zip, so the browser does not block the downloads", () => {
		const downloads = downloadsOf([png, png]);
		expect(downloads.map((file) => file.name)).toEqual(["botframe export.zip"]);
		const text = new TextDecoder().decode(downloads[0]?.bytes);
		expect(text).toContain("Card.png");
		expect(text).toContain("Card 2.png");
	});
});
