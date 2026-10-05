import { describe, expect, it } from "vitest";
import { textClipStyle } from "./markup";

describe("textClipStyle", () => {
	it("clips each background layer of a text to its glyphs", () => {
		const written =
			'background: url("blob:a") center center / cover no-repeat text, rgb(0, 0, 0); color: transparent;';
		expect(textClipStyle(written)).toBe(
			'background: url("blob:a") center center / cover no-repeat text, rgb(0, 0, 0); color: transparent; background-clip: text;',
		);
	});

	it("gives the clip to an empty style", () => {
		expect(textClipStyle("")).toBe("background-clip: text;");
	});
});
