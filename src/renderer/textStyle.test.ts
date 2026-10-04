import { describe, expect, it } from "vitest";
import { DEFAULT_TEXT_STYLE } from "../document/text";
import type { TextGeometry } from "../document/text";
import { fontFamilyText, textBoxStyle } from "./textStyle";

const TEXT: TextGeometry = { kind: "text", content: "Hello", ...DEFAULT_TEXT_STYLE };

describe("textBoxStyle", () => {
	it("keeps each line on one line while the width hugs the text", () => {
		expect(textBoxStyle(TEXT, "hug").whiteSpace).toBe("pre");
	});

	it("wraps the lines in a fixed width and keeps each line break", () => {
		expect(textBoxStyle(TEXT, "fixed").whiteSpace).toBe("pre-wrap");
	});

	it("gives each style field as a literal value", () => {
		const style = textBoxStyle(
			{
				...TEXT,
				fontWeight: 700,
				italic: true,
				fontSize: 24,
				lineHeight: 1.5,
				letterSpacing: -0.5,
				textAlign: "center",
				verticalAlign: "middle",
				decoration: "underline",
				textCase: "uppercase",
			},
			"fixed",
		);

		expect(style).toMatchObject({
			fontWeight: 700,
			fontStyle: "italic",
			fontSize: "24px",
			lineHeight: 1.5,
			letterSpacing: "-0.5px",
			textAlign: "center",
			justifyContent: "center",
			textDecorationLine: "underline",
			textTransform: "uppercase",
		});
	});
});

describe("fontFamilyText", () => {
	it("quotes the family and escapes a quote in its name", () => {
		expect(fontFamilyText('My "Font"')).toBe('"My \\"Font\\"", sans-serif');
	});
});
