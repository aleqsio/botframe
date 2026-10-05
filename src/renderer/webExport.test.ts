import { describe, expect, it } from "vitest";
import { answerOf } from "./webExport";

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
