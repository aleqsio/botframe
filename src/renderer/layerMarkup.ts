import type { CSSProperties } from "react";
import type { LayerContent } from "../document/layer";
import type { DisplayMode } from "../document/layout";
import type { LayerNode } from "../document/subtree";
import { layerStyle, pathPaintStyle } from "./layerStyle";
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
	return {
		...node.fields,
		rotation: node.rotation,
		skewX: node.skewX,
		skewY: node.skewY,
		mirrored: node.mirrored,
		origin: node.origin,
		layout: node.layout,
	};
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

const PAINT_BOX: CSSProperties = { position: "absolute", inset: 0 };

export type FindComponent = (content: LayerContent) => string | null;

function shadowOf(content: LayerContent, find: FindComponent): string {
	const markup = find(content);
	return markup === null ? "" : `<template shadowrootmode="open">${markup}</template>`;
}

function styleText(style: CSSProperties): string {
	return escaped(declarations(style).toSorted().join("; "));
}

function paintOf(node: LayerNode): string {
	const paint = pathPaintStyle(node.fields);
	return paint === null ? "" : `<div style="${styleText({ ...PAINT_BOX, ...paint })}"></div>`;
}

function markupOf(node: LayerNode, parentDisplay: DisplayMode | null, find: FindComponent): string {
	const style = styleText(layerStyle(styledLayerOf(node), parentDisplay));
	const children = node.children
		.map((child) => markupOf(child, node.layout.display, find))
		.join("");
	return `<div style="${style}">${paintOf(node)}${shadowOf(node.content, find)}${children}</div>`;
}

export function layerMarkup(node: LayerNode, find: FindComponent): string {
	return markupOf(node, null, find);
}
