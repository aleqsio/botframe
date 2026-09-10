import type { IconName } from "./Icon";

interface ToolDefinition {
	id: string;
	label: string;
	icon: IconName;
	key: string;
}

export const TOOLS = [
	{ id: "select", label: "Select", icon: "select", key: "v" },
	{ id: "artboard", label: "Artboard", icon: "artboard", key: "a" },
	{ id: "rectangle", label: "Rectangle", icon: "rectangle", key: "r" },
	{ id: "ellipse", label: "Ellipse", icon: "ellipse", key: "o" },
	{ id: "hand", label: "Hand", icon: "hand", key: "h" },
	{ id: "text", label: "Text", icon: "text", key: "t" },
	{ id: "image", label: "Image", icon: "image", key: "i" },
] as const satisfies readonly ToolDefinition[];

export type ToolId = (typeof TOOLS)[number]["id"];

export const DEFAULT_TOOL: ToolId = "select";
