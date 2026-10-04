import { bagOf, isList, listOf } from "./bag";
import type { Bag } from "./bag";
import { BINDING_KEYS } from "./bindings";
import type { Bindings, BindingsPatch } from "./bindings";
import { layerNodeOf } from "./envelope";
import type { ComponentLink, LayerContent, LayerFields, LayerPatch } from "./layer";
import type { LayerNode } from "./subtree";
import type { Bound } from "./value";

const FIELD_KEYS: readonly (keyof LayerFields)[] = [
	"x",
	"y",
	"width",
	"height",
	"fill",
	"name",
	"clip",
	"geometry",
];

const NODE_KEYS = [
	"rotation",
	"skewX",
	"skewY",
	"mirrored",
	"origin",
	"lengths",
	"layout",
	"guides",
	"media",
] as const satisfies readonly (keyof LayerNode & keyof LayerPatch)[];

type NodeTraits = Pick<LayerNode, (typeof NODE_KEYS)[number]>;

function nodeShape(flat: unknown): Bag {
	const bag = bagOf(flat);
	const fields = Object.fromEntries(
		FIELD_KEYS.flatMap((key) => (key in bag ? [[key, bag[key]]] : [])),
	);
	return { ...bag, fields, children: listOf(bag["children"]).map((child) => nodeShape(child)) };
}

export function layerNodeFrom(flat: unknown): LayerNode {
	return layerNodeOf(nodeShape(flat));
}

function flatOf(node: LayerNode): Bag {
	const { fields, children: _children, ...rest } = node;
	return { ...rest, ...fields };
}

function isRecord(value: unknown): value is Bag {
	return typeof value === "object" && value !== null && !isList(value);
}

function merged(held: unknown, change: unknown): unknown {
	if (!isRecord(held) || !isRecord(change)) {
		return change;
	}
	const keys = new Set([...Object.keys(held), ...Object.keys(change)]);
	return Object.fromEntries(
		[...keys].map((key) => [key, key in change ? merged(held[key], change[key]) : held[key]]),
	);
}

function differs(left: unknown, right: unknown): boolean {
	return JSON.stringify(left) !== JSON.stringify(right);
}

function changedKeys<T extends object>(
	current: T,
	next: T,
	keys: readonly (keyof T)[],
): Partial<T> {
	const patch: Partial<T> = {};
	for (const key of keys) {
		if (differs(current[key], next[key])) {
			patch[key] = next[key];
		}
	}
	return patch;
}

function linkOf(content: LayerContent): ComponentLink | null {
	if (content.kind === "none") {
		return null;
	}
	const { component, props, instance } = content;
	return { kind: "component", component, props, instance };
}

function bindingsPatch(current: Bindings, next: Bindings): BindingsPatch {
	const patch: Partial<Record<keyof Bindings, Bound | null>> = {};
	for (const key of BINDING_KEYS) {
		if (current[key] !== undefined || next[key] !== undefined) {
			patch[key] = next[key] ?? null;
		}
	}
	return patch;
}

function linksPatch(current: LayerNode, next: LayerNode): LayerPatch {
	const content = linkOf(next.content);
	const clipLayer = next.clipLayer ?? null;
	return {
		...(differs(linkOf(current.content), content) ? { content } : {}),
		...(differs(current.bindings, next.bindings)
			? { bindings: bindingsPatch(current.bindings, next.bindings) }
			: {}),
		...(differs(current.clipLayer ?? null, clipLayer) ? { clipLayer } : {}),
	};
}

function refusedPaths(given: unknown, held: unknown, path: string): readonly string[] {
	if (given === null) {
		return held === undefined || held === null ? [] : [path];
	}
	if (typeof given !== "object") {
		return given === held ? [] : [path];
	}
	if (typeof held !== "object" || held === null || isList(given) !== isList(held)) {
		return [path];
	}
	const kept = bagOf(held);
	return Object.entries(given).flatMap(([key, value]) =>
		refusedPaths(value, kept[key], path === "" ? key : `${path}.${key}`),
	);
}

export function layerPatchFrom(current: LayerNode, change: unknown): LayerPatch {
	const asked = bagOf(change);
	const next = layerNodeFrom(merged(flatOf(current), asked));
	const refused = refusedPaths({ ...asked, children: undefined }, flatOf(next), "");
	if (refused.length > 0) {
		throw new TypeError(`botframe cannot use these values: ${refused.join(", ")}.`);
	}
	return {
		...changedKeys(current.fields, next.fields, FIELD_KEYS),
		...changedKeys<NodeTraits>(current, next, NODE_KEYS),
		...linksPatch(current, next),
	};
}
