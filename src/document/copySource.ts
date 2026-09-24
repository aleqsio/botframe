import type { LoroMap } from "loro-crdt";
import { bagOf } from "./bag";
import { isPlacementBinding } from "./bindings";
import type { LayerPatch } from "./layer";
import { jsonOf } from "./layerLinks";
import type { LayoutPatch } from "./layout";
import type { FieldSource } from "./read";

const PLACEMENT_KEYS: ReadonlySet<string> = new Set([
	"x",
	"y",
	"width",
	"height",
	"xUnit",
	"yUnit",
	"widthUnit",
	"heightUnit",
	"rotation",
	"mirrored",
	"skewX",
	"skewY",
	"originX",
	"originY",
	"name",
	"component",
	"props",
]);

const PLACEMENT_LAYOUT: ReadonlySet<string> = new Set([
	"width",
	"height",
	"position",
	"margin",
	"cell",
	"turnedBox",
]);

const PLACEMENT_PATCH: ReadonlySet<string> = new Set([
	"x",
	"y",
	"width",
	"height",
	"rotation",
	"mirrored",
	"skewX",
	"skewY",
	"origin",
	"lengths",
	"name",
	"content",
	"props",
]);

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

export interface SplitPatch {
	placement: LayerPatch;
	shared: LayerPatch;
}

function splitLayout(layout: LayoutPatch | undefined): [LayoutPatch, LayoutPatch] {
	const entries = Object.entries(layout ?? {});
	return [
		Object.fromEntries(entries.filter(([key]) => PLACEMENT_LAYOUT.has(key))),
		Object.fromEntries(entries.filter(([key]) => !PLACEMENT_LAYOUT.has(key))),
	];
}

function filled<T extends object>(key: string, value: T): Record<string, T> {
	return Object.keys(value).length === 0 ? {} : { [key]: value };
}

export function splitPatch(patch: LayerPatch): SplitPatch {
	const { layout, bindings, ...rest } = patch;
	const entries = Object.entries(rest);
	const [placementLayout, sharedLayout] = splitLayout(layout);
	const bound = Object.entries(bindings ?? {});
	return {
		placement: {
			...Object.fromEntries(entries.filter(([key]) => PLACEMENT_PATCH.has(key))),
			...filled("layout", placementLayout),
			...filled("bindings", Object.fromEntries(bound.filter(([key]) => isPlacementBinding(key)))),
		},
		shared: {
			...Object.fromEntries(entries.filter(([key]) => !PLACEMENT_PATCH.has(key))),
			...filled("layout", sharedLayout),
			...filled("bindings", Object.fromEntries(bound.filter(([key]) => !isPlacementBinding(key)))),
		},
	};
}
