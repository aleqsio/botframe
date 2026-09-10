import { TOOLS } from "../components/tools";
import type { ToolId } from "../components/tools";
import type { KeyStroke } from "./layerCommand";

function isPlain(stroke: KeyStroke): boolean {
	return !stroke.metaKey && !stroke.ctrlKey && !stroke.altKey && !stroke.shiftKey;
}

export function toolFor(stroke: KeyStroke): ToolId | null {
	if (!isPlain(stroke)) {
		return null;
	}
	const key = stroke.key.toLowerCase();
	return TOOLS.find((tool) => tool.key === key)?.id ?? null;
}
