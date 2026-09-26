import { describe, expect, it } from "vitest";
import { textEditFor, textKeyFor } from "./textField";

describe("textEditFor", () => {
	it("gives the undo and the clipboard commands to a text field that has the focus", () => {
		expect(textEditFor("undo", true)).toBe("undo");
		expect(textEditFor("paste", true)).toBe("paste");
		expect(textEditFor("duplicate", true)).toBeNull();
	});

	it("leaves each command to the canvas when no text field has the focus", () => {
		expect(textEditFor("undo", false)).toBeNull();
	});
});

describe("textKeyFor", () => {
	const stroke = { key: "z", metaKey: true, ctrlKey: false, shiftKey: false };

	it("reads undo, redo and select all from the keys with the command or control key", () => {
		expect(textKeyFor(stroke)).toBe("undo");
		expect(textKeyFor({ ...stroke, shiftKey: true })).toBe("redo");
		expect(textKeyFor({ ...stroke, key: "a", metaKey: false, ctrlKey: true })).toBe("selectAll");
	});

	it("leaves a key with no command or control key, and other letters, to the field", () => {
		expect(textKeyFor({ ...stroke, metaKey: false })).toBeNull();
		expect(textKeyFor({ ...stroke, key: "b" })).toBeNull();
	});
});
