import { describe, expect, it } from "vitest";
import { DEFAULT_TOOL, SHAPE_TOOLS, TOOLS, TOOL_GROUPS, groupTool, toolOptionsOf } from "./tools";

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

describe("TOOL_GROUPS", () => {
	it("holds each tool in exactly one group", () => {
		const grouped = TOOL_GROUPS.flat().map((tool) => tool.id);

		expect(grouped.toSorted()).toEqual(TOOLS.map((tool) => tool.id).toSorted());
	});
});

describe("groupTool", () => {
	it("shows the active tool when the group holds it, and the first tool of the group if not", () => {
		expect(groupTool(SHAPE_TOOLS, "ellipse").id).toBe("ellipse");
		expect(groupTool(SHAPE_TOOLS, "rectangle").id).toBe("rectangle");
		expect(groupTool(SHAPE_TOOLS, "hand").id).toBe("rectangle");
	});
});

describe("toolOptionsOf", () => {
	it("gives the frame options, the shape options, or no options for each tool", () => {
		const options = Object.fromEntries(TOOLS.map((tool) => [tool.id, toolOptionsOf(tool.id)]));

		expect(options).toEqual({
			select: "none",
			frame: "frame",
			rectangle: "shape",
			ellipse: "shape",
			hand: "none",
			text: "none",
			image: "none",
		});
	});
});
