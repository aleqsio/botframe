import { describe, expect, it } from "vitest";
import { appearanceCss } from "./appearance";
import { APPEARANCE_PRESETS } from "./appearancePresets";

describe("APPEARANCE_PRESETS", () => {
	it("gives a unique name to each preset", () => {
		const names = APPEARANCE_PRESETS.map((preset) => preset.name);

		expect(new Set(names).size).toBe(names.length);
	});

	it.each(APPEARANCE_PRESETS)("writes a complete rule for $name", ({ appearance }) => {
		const css = appearanceCss(appearance);

		expect(css).toMatch(/^:root \{ .+; \}$/u);
		expect(css).toContain(`--stage-background: ${appearance.canvas};`);
		expect(css).toContain(`--canvas-radius: ${appearance.radius}px;`);
		expect(css).toContain(`--canvas-inset: ${appearance.inset}px;`);
		expect(css).not.toContain("undefined");
		expect(css).not.toContain("NaN");
	});
});
