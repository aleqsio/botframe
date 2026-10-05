import type { IconName } from "./Icon";

interface ToolDefinition {
	id: string;
	label: string;
	icon: IconName;
	key: string;
}

export const TOOLS = [
	{ id: "select", label: "Select", icon: "select", key: "v" },
	{ id: "frame", label: "Frame", icon: "frame", key: "a" },
	{ id: "rectangle", label: "Rectangle", icon: "rectangle", key: "r" },
	{ id: "ellipse", label: "Ellipse", icon: "ellipse", key: "o" },
	{ id: "hand", label: "Hand", icon: "hand", key: "h" },
	{ id: "text", label: "Text", icon: "text", key: "t" },
	{ id: "image", label: "Image", icon: "image", key: "i" },
] as const satisfies readonly ToolDefinition[];

export type Tool = (typeof TOOLS)[number];

export type ToolId = Tool["id"];

export type ToolGroup = readonly [Tool, ...Tool[]];

export type ToolOptions = "frame" | "shape" | "image" | "none";

export const DEFAULT_TOOL: ToolId = "select";

const [SELECT, FRAME, RECTANGLE, ELLIPSE, HAND, TEXT, IMAGE] = TOOLS;

export const SHAPE_TOOLS = [RECTANGLE, ELLIPSE] as const satisfies ToolGroup;

export const TOOL_GROUPS: readonly ToolGroup[] = [
	[SELECT],
	[FRAME],
	SHAPE_TOOLS,
	[HAND],
	[TEXT],
	[IMAGE],
];

export function groupTool(group: ToolGroup, active: ToolId): Tool {
	return group.find((tool) => tool.id === active) ?? group[0];
}

export function toolOptionsOf(tool: ToolId): ToolOptions {
	if (tool === FRAME.id) {
		return "frame";
	}
	if (tool === IMAGE.id) {
		return "image";
	}
	return SHAPE_TOOLS.some((shape) => shape.id === tool) ? "shape" : "none";
}
