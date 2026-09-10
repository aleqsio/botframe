import type { IconName } from "./Icon";

interface ToolDefinition {
	id: string;
	label: string;
	icon: IconName;
}

export const TOOLS = [
	{ id: "select", label: "Select", icon: "select" },
	{ id: "frame", label: "Frame", icon: "frame" },
	{ id: "rectangle", label: "Rectangle", icon: "rectangle" },
	{ id: "ellipse", label: "Ellipse", icon: "ellipse" },
	{ id: "zoom", label: "Zoom", icon: "zoom" },
	{ id: "text", label: "Text", icon: "text" },
	{ id: "image", label: "Image", icon: "image" },
] as const satisfies readonly ToolDefinition[];

export type ToolId = (typeof TOOLS)[number]["id"];

export const DEFAULT_TOOL: ToolId = "select";
