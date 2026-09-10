import { TOOLS } from "../components/tools";
import type { ToolId } from "../components/tools";
import type { KeyStroke } from "./layerCommand";

export function toolFor(stroke: KeyStroke): ToolId | null {
	if (stroke.metaKey || stroke.ctrlKey || stroke.altKey || stroke.shiftKey) {
		return null;
	}
	const key = stroke.key.toLowerCase();
	return TOOLS.find((tool) => tool.key === key)?.id ?? null;
}
