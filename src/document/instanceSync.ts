import { LoroDoc } from "loro-crdt";
import type { LoroMap } from "loro-crdt";
import { bagOf } from "./bag";
import { picked } from "./copySource";
import type { LayerPatch } from "./layer";
import { writePatch } from "./layerData";
import { jsonOf } from "./layerLinks";
import type { Basis } from "./length";
import type { Overrides, SyncMode } from "./instanceState";
import type { FieldSource } from "./read";

export type SyncPart = "all" | "geometry" | "style";

export type Changes = ReadonlyMap<string, unknown>;

const GEOMETRY = "geometry";
const SUBKEY = ".";
const NESTED: ReadonlySet<string> = new Set(["layout", "bindings"]);
const STORED_KEYS: readonly string[] = [
	"x",
	"y",
	"width",
	"height",
	"xUnit",
	"yUnit",
	"widthUnit",
	"heightUnit",
	"rotation",
	"skewX",
	"skewY",
	"mirrored",
	"originX",
	"originY",
	"fill",
	"media",
	GEOMETRY,
	"name",
	"clip",
	"guides",
	"layout",
	"bindings",
];
const GEOMETRY_FIELDS: ReadonlySet<string> = new Set([
	"x",
	"y",
	"width",
	"height",
	"rotation",
	"skewX",
	"skewY",
	"mirrored",
]);
const GEOMETRY_KEYS: ReadonlySet<string> = new Set([
	...GEOMETRY_FIELDS,
	"xUnit",
	"yUnit",
	"widthUnit",
	"heightUnit",
	"originX",
	"originY",
]);
const GEOMETRY_PATCH: ReadonlySet<string> = new Set([...GEOMETRY_FIELDS, "origin", "lengths"]);
const LINK_PATCH: ReadonlySet<string> = new Set(["content", "props"]);
const GEOMETRY_LAYOUT: ReadonlySet<string> = new Set([
	"width",
	"height",
	"position",
	"margin",
	"cell",
	"turnedBox",
]);

function isGeometryKey(key: string): boolean {
	const [head = "", sub = ""] = key.split(SUBKEY);
	if (head === "layout") {
		return GEOMETRY_LAYOUT.has(sub);
	}
	return head === "bindings" ? GEOMETRY_FIELDS.has(sub) : GEOMETRY_KEYS.has(head);
}

export function inPart(part: SyncPart, key: string): boolean {
	return part === "all" || (part === "geometry") === isGeometryKey(key);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function heldEntries(override: LoroMap | null): readonly (readonly [string, unknown])[] {
	return override === null ? [] : Object.entries(bagOf(override.toJSON()));
}

function nestedValue(base: FieldSource, override: LoroMap, key: string): unknown {
	const prefix = `${key}${SUBKEY}`;
	const held = heldEntries(override).filter(([name]) => name.startsWith(prefix));
	if (held.length === 0) {
		return base.get(key);
	}
	const merged = new Map(Object.entries(bagOf(jsonOf(base.get(key)))));
	for (const [name, value] of held) {
		const sub = name.slice(prefix.length);
		if (value === null) {
			merged.delete(sub);
		} else {
			merged.set(sub, value);
		}
	}
	return Object.fromEntries(merged);
}

export function overlaySource(base: FieldSource, override: LoroMap | null): FieldSource {
	if (override === null) {
		return base;
	}
	return {
		get: (key) => {
			if (NESTED.has(key)) {
				return nestedValue(base, override, key);
			}
			const held: unknown = override.get(key);
			return held === undefined ? base.get(key) : (held ?? undefined);
		},
	};
}

function flatten(source: FieldSource): ReadonlyMap<string, string> {
	const flat = new Map<string, string>();
	for (const key of STORED_KEYS) {
		const value = jsonOf(source.get(key));
		if (NESTED.has(key)) {
			for (const [sub, held] of Object.entries(bagOf(value))) {
				flat.set(`${key}${SUBKEY}${sub}`, JSON.stringify(held));
			}
		} else if (value !== undefined && value !== null) {
			flat.set(key, JSON.stringify(value));
		}
	}
	return flat;
}

function seedMap(map: LoroMap, value: Readonly<Record<string, unknown>>, deep: boolean): void {
	for (const [key, held] of Object.entries(value)) {
		if (deep && isRecord(held)) {
			seedMap(map.ensureMergeableMap(key), held, false);
		} else {
			map.set(key, held);
		}
	}
}

function putValue(data: LoroMap, key: string, value: unknown): void {
	if (value === undefined || value === null) {
		data.delete(key);
	} else if (isRecord(value) && (key === GEOMETRY || NESTED.has(key))) {
		seedMap(data.ensureMergeableMap(key), value, key === GEOMETRY);
	} else {
		data.set(key, value);
	}
}

export function putFlat(data: LoroMap, key: string, value: unknown): void {
	const [head = "", sub] = key.split(SUBKEY);
	if (sub === undefined) {
		putValue(data, head, value);
		return;
	}
	const map = data.ensureMergeableMap(head);
	if (value === null) {
		map.delete(sub);
	} else {
		map.set(sub, value);
	}
}

function scratchOf(view: FieldSource): LoroMap {
	const scratch = new LoroDoc().getMap("layer");
	for (const key of STORED_KEYS) {
		putValue(scratch, key, jsonOf(view.get(key)));
	}
	return scratch;
}

export function changesOf(view: FieldSource, patch: LayerPatch, basis: Basis): Changes {
	const before = flatten(view);
	const scratch = scratchOf(view);
	writePatch(scratch, patch, basis);
	const after = flatten(scratch);
	const changes = new Map<string, unknown>();
	for (const key of new Set([...before.keys(), ...after.keys()])) {
		const next = after.get(key);
		if (next !== before.get(key)) {
			const value: unknown = next === undefined ? null : JSON.parse(next);
			changes.set(key, value);
		}
	}
	return changes;
}

export function changeCount(overrides: Overrides, part: SyncPart): number {
	return Object.values(overrides)
		.flatMap((flats) => Object.keys(flats))
		.filter((key) => inPart(part, key)).length;
}

export function isLocal(mode: SyncMode, key: string): boolean {
	return mode === "none" || (mode === "style" && isGeometryKey(key));
}

function without(value: object, drop: ReadonlySet<string>): Readonly<Record<string, unknown>> {
	return picked(value, (key) => !drop.has(key));
}

function withoutGeometry(patch: LayerPatch): LayerPatch {
	const { bindings, layout, ...rest } = patch;
	return {
		...without(rest, GEOMETRY_PATCH),
		...(layout === undefined ? {} : { layout: without(layout, GEOMETRY_LAYOUT) }),
		...(bindings === undefined ? {} : { bindings: without(bindings, GEOMETRY_FIELDS) }),
	};
}

export function sharedPatch(mode: SyncMode, patch: LayerPatch): LayerPatch {
	if (mode === "all") {
		return patch;
	}
	if (mode === "style") {
		return withoutGeometry(patch);
	}
	return picked(patch, (key) => LINK_PATCH.has(key));
}
