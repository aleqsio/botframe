import { describe, expect, it } from "vitest";
import { BLACK, formatColor, hueText, parseColor, steppedHsva, toHsva, toRgba } from "./color";
import type { Rgba } from "./color";

const RED: Rgba = { r: 255, g: 0, b: 0, a: 1 };
const HALF_GREEN: Rgba = { r: 0, g: 128, b: 0, a: 0.5 };

function roundTrip(color: Rgba): Rgba {
	return toRgba(toHsva(color));
}

describe("parseColor", () => {
	it("reads a hex color of three, four, six, or eight digits", () => {
		expect(parseColor("#f00")).toEqual(RED);
		expect(parseColor("#FF0000")).toEqual(RED);
		expect(parseColor("#ff000080")).toMatchObject({ r: 255, g: 0, b: 0 });
		expect(parseColor("#f008")?.a).toBeCloseTo(0.533, 2);
	});

	it("reads the rgb text that the platform writes", () => {
		expect(parseColor("rgb(255, 0, 0)")).toEqual(RED);
		expect(parseColor("rgba(0, 128, 0, 0.5)")).toEqual(HALF_GREEN);
		expect(parseColor("rgb(255 0 0 / 1)")).toEqual(RED);
	});

	it("refuses text that is not a color it can read", () => {
		expect(parseColor("red")).toBeNull();
		expect(parseColor("#ff")).toBeNull();
		expect(parseColor("rgb(a, b, c)")).toBeNull();
		expect(parseColor("")).toBeNull();
	});
});

describe("formatColor", () => {
	it("writes six digits for a color that hides nothing", () => {
		expect(formatColor(RED)).toBe("#ff0000");
		expect(formatColor(BLACK)).toBe("#000000");
	});

	it("writes the alpha as the fourth pair of digits", () => {
		expect(formatColor(HALF_GREEN)).toBe("#00800080");
	});

	it("holds each channel inside the range of the channel", () => {
		expect(formatColor({ r: 300, g: -10, b: 12.4, a: 1 })).toBe("#ff000c");
	});
});

describe("toHsva and toRgba", () => {
	it("gives the angle, the saturation, and the value of a color", () => {
		expect(toHsva(RED)).toEqual({ h: 0, s: 1, v: 1, a: 1 });
		expect(toHsva({ r: 0, g: 255, b: 0, a: 1 })).toMatchObject({ h: 120, s: 1, v: 1 });
		expect(toHsva({ r: 0, g: 0, b: 255, a: 1 })).toMatchObject({ h: 240, s: 1, v: 1 });
		expect(toHsva({ r: 255, g: 255, b: 0, a: 1 })).toMatchObject({ h: 60 });
	});

	it("gives a grey no angle and no saturation", () => {
		expect(toHsva({ r: 128, g: 128, b: 128, a: 1 })).toMatchObject({ h: 0, s: 0 });
		expect(toHsva(BLACK)).toEqual({ h: 0, s: 0, v: 0, a: 1 });
	});

	it("keeps the color through a turn to the angle and back", () => {
		expect(roundTrip(RED)).toEqual(RED);
		expect(roundTrip(HALF_GREEN)).toEqual(HALF_GREEN);
		expect(roundTrip({ r: 13, g: 153, b: 255, a: 1 })).toEqual({ r: 13, g: 153, b: 255, a: 1 });
		expect(roundTrip({ r: 217, g: 217, b: 217, a: 1 })).toMatchObject({ r: 217, g: 217, b: 217 });
	});

	it("keeps the alpha of the color", () => {
		expect(toRgba({ h: 0, s: 1, v: 1, a: 0.25 })).toEqual({ r: 255, g: 0, b: 0, a: 0.25 });
	});
});

describe("hueText", () => {
	it("names the full color of one angle", () => {
		expect(hueText(0)).toBe("#ff0000");
		expect(hueText(120)).toBe("#00ff00");
		expect(hueText(240)).toBe("#0000ff");
	});
});

describe("steppedHsva", () => {
	const MIDDLE = { h: 200, s: 0.5, v: 0.5, a: 1 };

	it("moves the saturation sideways and the brightness up and down", () => {
		expect(steppedHsva(MIDDLE, "ArrowRight", 0.1)).toMatchObject({ s: 0.6, v: 0.5 });
		expect(steppedHsva(MIDDLE, "ArrowLeft", 0.1)).toMatchObject({ s: 0.4, v: 0.5 });
		expect(steppedHsva(MIDDLE, "ArrowUp", 0.1)).toMatchObject({ s: 0.5, v: 0.6 });
		expect(steppedHsva(MIDDLE, "ArrowDown", 0.1)).toMatchObject({ s: 0.5, v: 0.4 });
	});

	it("keeps the angle and the alpha of the color", () => {
		expect(steppedHsva({ ...MIDDLE, a: 0.3 }, "ArrowUp", 0.01)).toMatchObject({ h: 200, a: 0.3 });
	});

	it("holds the saturation and the brightness between nothing and all", () => {
		expect(steppedHsva({ ...MIDDLE, s: 0.95 }, "ArrowRight", 0.1)?.s).toBe(1);
		expect(steppedHsva({ ...MIDDLE, v: 0.05 }, "ArrowDown", 0.1)?.v).toBe(0);
	});

	it("gives null for a key that does not move the color", () => {
		expect(steppedHsva(MIDDLE, "Enter", 0.1)).toBeNull();
	});
});
