import { describe, expect, it } from "vitest";
import { DEFAULT_TOOL, TOOLS } from "./tools";

describe("TOOLS", () => {
	it("gives each tool its own id, label, icon, and key", () => {
		const ids = TOOLS.map((tool) => tool.id);
		const labels = TOOLS.map((tool) => tool.label);
		const icons = TOOLS.map((tool) => tool.icon);
		const keys = TOOLS.map((tool) => tool.key);

		expect(new Set(ids).size).toBe(TOOLS.length);
		expect(new Set(labels).size).toBe(TOOLS.length);
		expect(new Set(icons).size).toBe(TOOLS.length);
		expect(new Set(keys).size).toBe(TOOLS.length);
	});

	it("gives each tool a key that is one lowercase letter", () => {
		for (const tool of TOOLS) {
			expect(tool.key).toMatch(/^[a-z]$/u);
		}
	});

	it("selects a tool that the bar shows", () => {
		expect(TOOLS.map((tool) => tool.id)).toContain(DEFAULT_TOOL);
	});
});
