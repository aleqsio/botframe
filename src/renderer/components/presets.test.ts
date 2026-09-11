import { describe, expect, it } from "vitest";
import { CUSTOM_PRESET, PRESET_GROUPS, presetNameFor, presetNamed, thumbnailOf } from "./presets";

const ALL = PRESET_GROUPS.flatMap((group) => group.presets);

describe("PRESET_GROUPS", () => {
	it("gives each group a name and at least one preset", () => {
		expect(PRESET_GROUPS.length).toBeGreaterThan(0);
		for (const group of PRESET_GROUPS) {
			expect(group.name).not.toBe("");
			expect(group.presets.length).toBeGreaterThan(0);
		}
	});

	it("gives each preset a unique name and a positive size", () => {
		expect(new Set(ALL.map((preset) => preset.name)).size).toBe(ALL.length);
		for (const preset of ALL) {
			expect(preset.width).toBeGreaterThan(0);
			expect(preset.height).toBeGreaterThan(0);
		}
	});

	it("gives each preset a size that no other preset holds", () => {
		const sizes = ALL.map((preset) => `${preset.width}x${preset.height}`);
		expect(new Set(sizes).size).toBe(ALL.length);
	});

	it("keeps the name Custom free for a size that no preset holds", () => {
		expect(ALL.map((preset) => preset.name)).not.toContain(CUSTOM_PRESET);
	});
});

describe("presetNamed", () => {
	it("finds a preset in any group", () => {
		expect(presetNamed("iPhone 16")).toEqual({ name: "iPhone 16", width: 393, height: 852 });
		expect(presetNamed("A4")).toEqual({ name: "A4", width: 595, height: 842 });
	});

	it("gives null for a name that no group holds", () => {
		expect(presetNamed(CUSTOM_PRESET)).toBeNull();
	});
});

describe("presetNameFor", () => {
	it("names the size of a preset", () => {
		expect(presetNameFor(393, 852)).toBe("iPhone 16");
	});

	it("names the size of a preset in a later group", () => {
		expect(presetNameFor(1920, 1080)).toBe("Slide 16:9");
	});

	it("names a size that no preset holds Custom", () => {
		expect(presetNameFor(393, 851)).toBe(CUSTOM_PRESET);
	});
});

describe("thumbnailOf", () => {
	it("fits the long side to the box and rounds to whole pixels", () => {
		expect(thumbnailOf({ width: 393, height: 852 }, 22)).toEqual({ width: 10, height: 22 });
		expect(thumbnailOf({ width: 1920, height: 1080 }, 22)).toEqual({ width: 22, height: 12 });
		expect(thumbnailOf({ width: 1080, height: 1080 }, 22)).toEqual({ width: 22, height: 22 });
	});

	it("keeps a side of at least one pixel", () => {
		expect(thumbnailOf({ width: 4000, height: 10 }, 22)).toEqual({ width: 22, height: 1 });
	});
});
