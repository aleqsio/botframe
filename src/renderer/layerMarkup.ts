import type { CSSProperties } from "react";
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
	return { ...node.fields, rotation: node.rotation, layout: node.layout };
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

function markupOf(node: LayerNode, parent: StyledLayer | null): string {
	const self = styledLayerOf(node);
	const style = escaped(declarations(layerStyle(self, parent)).toSorted().join("; "));
	const children = node.children.map((child) => markupOf(child, self)).join("");
	return `<div style="${style}">${children}</div>`;
}

export function layerMarkup(node: LayerNode): string {
	return markupOf(node, null);
}
