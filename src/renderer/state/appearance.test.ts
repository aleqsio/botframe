import { describe, expect, it } from "vitest";
import {
	appearanceCss,
	DEFAULT_APPEARANCE,
	inkCss,
	parseHexColor,
	parseLength,
	parseOpacity,
} from "./appearance";
import type { Appearance } from "./appearance";

const HAIRLINE = { width: 1, ink: { color: "#ff0000", opacity: 0.5 } };
const INNER_SHADOW = { y: 2, blur: 8, spread: -1, ink: { color: "#000000", opacity: 0.25 } };

function shadowOf(css: string): string {
	return css.split("--stage-shadow: ")[1]?.replace(/; \}$/u, "") ?? "";
}

describe("inkCss", () => {
	it("gives an opaque color when the opacity is one", () => {
		expect(inkCss({ color: "#1e1e28", opacity: 1 })).toBe("rgb(30 30 40 / 1)");
	});

	it("gives a translucent color when the opacity is a fraction", () => {
		expect(inkCss({ color: "#0d99ff", opacity: 0.4 })).toBe("rgb(13 153 255 / 0.4)");
	});
});

describe("appearanceCss", () => {
	it("writes each custom property of the default appearance", () => {
		expect(appearanceCss(DEFAULT_APPEARANCE)).toBe(
			":root { --stage-background: #f2f2f2; --canvas-radius: 10px; --canvas-inset: 6px; " +
				"--app-tint: rgb(30 30 40 / 0); --stage-shadow: none; }",
		);
	});

	it("gives no shadow when the border and the inner shadow are off", () => {
		expect(shadowOf(appearanceCss(DEFAULT_APPEARANCE))).toBe("none");
	});

	it("gives the hairline alone when the inner shadow is off", () => {
		const appearance: Appearance = { ...DEFAULT_APPEARANCE, border: HAIRLINE };

		expect(shadowOf(appearanceCss(appearance))).toBe("inset 0 0 0 1px rgb(255 0 0 / 0.5)");
	});

	it("gives the inner shadow alone when the border width is zero", () => {
		const appearance: Appearance = { ...DEFAULT_APPEARANCE, shadow: INNER_SHADOW };

		expect(shadowOf(appearanceCss(appearance))).toBe("inset 0 2px 8px -1px rgb(0 0 0 / 0.25)");
	});

	it("puts the hairline before the inner shadow when both are on", () => {
		const appearance: Appearance = {
			...DEFAULT_APPEARANCE,
			border: HAIRLINE,
			shadow: INNER_SHADOW,
		};

		expect(shadowOf(appearanceCss(appearance))).toBe(
			"inset 0 0 0 1px rgb(255 0 0 / 0.5), inset 0 2px 8px -1px rgb(0 0 0 / 0.25)",
		);
	});

	it("keeps the inner shadow when only the offset is not zero", () => {
		const shadow = { ...INNER_SHADOW, blur: 0, spread: 0 };
		const appearance: Appearance = { ...DEFAULT_APPEARANCE, shadow };

		expect(shadowOf(appearanceCss(appearance))).toBe("inset 0 2px 0px 0px rgb(0 0 0 / 0.25)");
	});

	it("writes the radius and the inset in pixels", () => {
		const appearance: Appearance = { ...DEFAULT_APPEARANCE, radius: 18, inset: 14 };

		expect(appearanceCss(appearance)).toContain("--canvas-radius: 18px; --canvas-inset: 14px;");
	});
});

describe("parseHexColor", () => {
	it("keeps a six digit hex color", () => {
		expect(parseHexColor("#0d99ff", "#000000")).toBe("#0d99ff");
	});

	it("rejects a color name", () => {
		expect(parseHexColor("red", "#000000")).toBe("#000000");
	});

	it("rejects a three digit hex color", () => {
		expect(parseHexColor("#fff", "#000000")).toBe("#000000");
	});

	it("rejects a value that holds a second declaration", () => {
		expect(parseHexColor("#0d99ff; color: red", "#000000")).toBe("#000000");
	});
});

describe("parseOpacity", () => {
	it("keeps a number from zero to one", () => {
		expect(parseOpacity("0.4", 0.25)).toBe(0.4);
	});

	it("rejects an empty value", () => {
		expect(parseOpacity("", 0.25)).toBe(0.25);
	});

	it("rejects a number above one", () => {
		expect(parseOpacity("2", 0.25)).toBe(0.25);
	});

	it("rejects text", () => {
		expect(parseOpacity("abc", 0.25)).toBe(0.25);
	});
});

describe("parseLength", () => {
	it("keeps a number inside the limit", () => {
		expect(parseLength("18", 6, 32)).toBe(18);
	});

	it("keeps a negative number inside the limit", () => {
		expect(parseLength("-6", 0, 12)).toBe(-6);
	});

	it("rejects an empty value", () => {
		expect(parseLength("", 6, 32)).toBe(6);
	});

	it("rejects text", () => {
		expect(parseLength("abc", 6, 32)).toBe(6);
	});

	it("rejects a number above the limit", () => {
		expect(parseLength("33", 6, 32)).toBe(6);
	});

	it("rejects a number below the negative limit", () => {
		expect(parseLength("-33", 6, 32)).toBe(6);
	});

	it("rejects a value that holds a second declaration", () => {
		expect(parseLength("10px; color: red", 6, 32)).toBe(6);
	});
});
