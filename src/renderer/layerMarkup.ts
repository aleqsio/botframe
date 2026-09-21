import type { CSSProperties } from "react";
import type { DisplayMode } from "../document/layout";
import type { LayerNode } from "../document/subtree";
import { layerStyle } from "./layerStyle";
import type { StyledLayer } from "./layerStyle";

const UPPERCASE = /[A-Z]/gu;
const IN_ATTRIBUTE = /["&<>]/gu;
const ESCAPES: Readonly<Record<string, string>> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
};

function styledLayerOf(node: LayerNode): StyledLayer {
	return { ...node.fields, rotation: node.rotation, origin: node.origin, layout: node.layout };
}

function propertyName(key: string): string {
	return key.replace(UPPERCASE, (letter) => `-${letter.toLowerCase()}`);
}

function escaped(value: string): string {
	return value.replace(IN_ATTRIBUTE, (character) => ESCAPES[character] ?? character);
}

function declarations(style: CSSProperties): string[] {
	const entries: readonly (readonly [string, unknown])[] = Object.entries(style);
	return entries.flatMap(([key, value]) =>
		typeof value === "string" || typeof value === "number"
			? [`${propertyName(key)}: ${value}`]
			: [],
	);
}

function markupOf(node: LayerNode, parentDisplay: DisplayMode | null): string {
	const style = escaped(
		declarations(layerStyle(styledLayerOf(node), parentDisplay))
			.toSorted()
			.join("; "),
	);
	const children = node.children.map((child) => markupOf(child, node.layout.display)).join("");
	return `<div style="${style}">${children}</div>`;
}

export function layerMarkup(node: LayerNode): string {
	return markupOf(node, null);
}
