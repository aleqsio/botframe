import type { LoroMap } from "loro-crdt";
import { bagOf } from "./bag";
import { isPlacementBinding } from "./bindings";
import type { LayerPatch } from "./layer";
import { jsonOf } from "./layerLinks";
import type { LayoutPatch } from "./layout";
import type { LayerLengths } from "./length";
import type { FieldSource } from "./read";

const PLACEMENT_KEYS: ReadonlySet<string> = new Set([
	"x",
	"y",
	"xUnit",
	"yUnit",
	"name",
	"component",
	"props",
	"sync",
	"overrides",
]);

const PLACEMENT_LAYOUT: ReadonlySet<string> = new Set(["position", "margin", "cell"]);

const PLACEMENT_LENGTHS: ReadonlySet<string> = new Set(["x", "y"]);

const PLACEMENT_PATCH: ReadonlySet<string> = new Set(["x", "y", "name", "content", "props"]);

function splitEntries<T extends object>(
	value: T | undefined,
	placement: ReadonlySet<string>,
): [[string, T[keyof T]][], [string, T[keyof T]][]] {
	const entries: [string, T[keyof T]][] = Object.entries(value ?? {});
	return [
		entries.filter(([key]) => placement.has(key)),
		entries.filter(([key]) => !placement.has(key)),
	];
}

function picked(value: unknown, keep: (key: string) => boolean): Record<string, unknown> {
	return Object.fromEntries(Object.entries(bagOf(value)).filter(([key]) => keep(key)));
}

export function copySource(copy: LoroMap, definition: LoroMap): FieldSource {
	return {
		get: (key) => {
			if (key === "layout") {
				const shared = picked(jsonOf(definition.get(key)), (held) => !PLACEMENT_LAYOUT.has(held));
				return {
					...shared,
					...picked(jsonOf(copy.get(key)), (held) => PLACEMENT_LAYOUT.has(held)),
				};
			}
			if (key === "bindings") {
				const shared = picked(jsonOf(definition.get(key)), (held) => !isPlacementBinding(held));
				return { ...shared, ...picked(jsonOf(copy.get(key)), isPlacementBinding) };
			}
			return PLACEMENT_KEYS.has(key) ? copy.get(key) : definition.get(key);
		},
	};
}

export function isPlacementKey(key: string): boolean {
	const [head = "", sub] = key.split(".");
	if (sub === undefined) {
		return PLACEMENT_KEYS.has(head);
	}
	return head === "layout"
		? PLACEMENT_LAYOUT.has(sub)
		: head === "bindings" && isPlacementBinding(sub);
}

export interface SplitPatch {
	placement: LayerPatch;
	shared: LayerPatch;
}

function splitLayout(layout: LayoutPatch | undefined): [LayoutPatch, LayoutPatch] {
	const [placement, shared] = splitEntries(layout, PLACEMENT_LAYOUT);
	return [Object.fromEntries(placement), Object.fromEntries(shared)];
}

function splitLengths(
	lengths: Partial<LayerLengths> | undefined,
): [Partial<LayerLengths>, Partial<LayerLengths>] {
	const [placement, shared] = splitEntries(lengths, PLACEMENT_LENGTHS);
	return [Object.fromEntries(placement), Object.fromEntries(shared)];
}

function filled<T extends object>(key: string, value: T): Record<string, T> {
	return Object.keys(value).length === 0 ? {} : { [key]: value };
}

export function splitPatch(patch: LayerPatch): SplitPatch {
	const { bindings, layout, lengths, ...rest } = patch;
	const entries = Object.entries(rest);
	const [placementLayout, sharedLayout] = splitLayout(layout);
	const [placementLengths, sharedLengths] = splitLengths(lengths);
	const bound = Object.entries(bindings ?? {});
	return {
		placement: {
			...Object.fromEntries(entries.filter(([key]) => PLACEMENT_PATCH.has(key))),
			...filled("layout", placementLayout),
			...filled("lengths", placementLengths),
			...filled("bindings", Object.fromEntries(bound.filter(([key]) => isPlacementBinding(key)))),
		},
		shared: {
			...Object.fromEntries(entries.filter(([key]) => !PLACEMENT_PATCH.has(key))),
			...filled("layout", sharedLayout),
			...filled("lengths", sharedLengths),
			...filled("bindings", Object.fromEntries(bound.filter(([key]) => !isPlacementBinding(key)))),
		},
	};
}
