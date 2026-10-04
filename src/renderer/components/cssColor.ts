import { parseColor } from "./color";
import type { Rgba } from "./color";

const PROBE = "#010203";

function cssColor(text: string): string {
	const context = document.createElement("canvas").getContext("2d");
	if (context === null) {
		return "";
	}
	context.fillStyle = PROBE;
	context.fillStyle = text;
	const painted = typeof context.fillStyle === "string" ? context.fillStyle : "";
	return painted === PROBE ? "" : painted;
}

export function colorOf(text: string): Rgba | null {
	if (!CSS.supports("color", text)) {
		return null;
	}
	return parseColor(text) ?? parseColor(cssColor(text));
}
