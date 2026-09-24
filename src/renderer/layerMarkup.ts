import type { CSSProperties } from "react";
import { componentMarkup } from "../document/component";
import type { Component } from "../document/component";
import type { LayerContent } from "../document/layer";
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

export type FindComponent = (id: string) => Component | null;

function shadowOf(content: LayerContent, find: FindComponent): string {
	if (content.kind !== "component") {
		return "";
	}
	const component = find(content.component);
	return component === null
		? ""
		: `<template shadowrootmode="open">${componentMarkup(component, content.props)}</template>`;
}

function markupOf(node: LayerNode, parentDisplay: DisplayMode | null, find: FindComponent): string {
	const style = escaped(
		declarations(layerStyle(styledLayerOf(node), parentDisplay))
			.toSorted()
			.join("; "),
	);
	const children = node.children
		.map((child) => markupOf(child, node.layout.display, find))
		.join("");
	return `<div style="${style}">${shadowOf(node.content, find)}${children}</div>`;
}

export function layerMarkup(node: LayerNode, find: FindComponent): string {
	return markupOf(node, null, find);
}
