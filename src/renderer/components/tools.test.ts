import { describe, expect, it } from "vitest";
import { DEFAULT_TOOL, TOOLS } from "./tools";

describe("TOOLS", () => {
	it("gives each tool its own id, label, and icon", () => {
		const ids = TOOLS.map((tool) => tool.id);
		const labels = TOOLS.map((tool) => tool.label);
		const icons = TOOLS.map((tool) => tool.icon);

		expect(new Set(ids).size).toBe(TOOLS.length);
		expect(new Set(labels).size).toBe(TOOLS.length);
		expect(new Set(icons).size).toBe(TOOLS.length);
	});

	it("selects a tool that the bar shows", () => {
		expect(TOOLS.map((tool) => tool.id)).toContain(DEFAULT_TOOL);
	});
});
